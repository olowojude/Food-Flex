from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Prefetch
from .models import Category, Product, ProductReview
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
    ProductReviewSerializer,
    ProductReviewCreateUpdateSerializer
)
from accounts.permissions import IsAdmin, IsSeller, IsBuyer


# ============================================================================
# CUSTOM PAGINATION
# ============================================================================

class ProductPagination(PageNumberPagination):
    """Custom pagination for products"""
    page_size = 30  # Default 30 products per page (as requested)
    page_size_query_param = 'page_size'  # Allow client to override
    max_page_size = 100  # Maximum allowed


# ============================================================================
# CATEGORY VIEWS (unchanged)
# ============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def category_list(request):
    """List all active categories"""
    categories = Category.objects.filter(is_active=True)
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def category_detail(request, slug):
    """Get single category"""
    try:
        category = Category.objects.get(slug=slug, is_active=True)
        serializer = CategorySerializer(category)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Category.DoesNotExist:
        return Response(
            {'error': 'Category not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAdmin])
def category_create(request):
    """Admin creates category"""
    serializer = CategorySerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdmin])
def category_update(request, pk):
    """Admin updates category"""
    try:
        category = Category.objects.get(pk=pk)
    except Category.DoesNotExist:
        return Response(
            {'error': 'Category not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = CategorySerializer(category, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def category_delete(request, pk):
    """Admin deletes category"""
    try:
        category = Category.objects.get(pk=pk)
        
        # Check if category has products
        product_count = category.products.count()
        if product_count > 0:
            return Response(
                {'error': f'Cannot delete category with {product_count} products. Remove products first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        category.delete()
        return Response(
            {'message': 'Category deleted successfully'},
            status=status.HTTP_200_OK
        )
    except Category.DoesNotExist:
        return Response(
            {'error': 'Category not found'},
            status=status.HTTP_404_NOT_FOUND
        )


# ============================================================================
# OPTIMIZED PRODUCT VIEWS
# ============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def product_list(request):
    """
    List products with filters and pagination
    
    OPTIMIZATIONS:
    - select_related: Reduces queries for category and seller (from N+1 to 1)
    - only(): Fetches only needed fields (faster queries)
    - Pagination: Returns 30 products per page by default
    - Random ordering: Use ?ordering=random for homepage
    
    Query params:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 30, max: 100)
    - category: Filter by category slug
    - search: Search in name, description, category
    - min_price: Minimum price filter
    - max_price: Maximum price filter
    - in_stock: true/false
    - is_featured: true/false
    - ordering: Sort field (price, -price, name, -name, created_at, -created_at, views_count, -views_count, sales_count, -sales_count, random)
    """
    
    # OPTIMIZATION: Use select_related and only() to reduce queries and fetch only needed fields
    products = Product.objects.filter(is_active=True).select_related(
        'category', 
        'seller'
    ).only(
        # Product fields
        'id', 'name', 'slug', 'price', 'stock_quantity', 'main_image',
        'weight', 'unit', 'is_featured', 'views_count', 'sales_count', 'created_at',
        # Related fields
        'category__id', 'category__name',
        'seller__id', 'seller__first_name', 'seller__last_name', 'seller__email'
    )
    
    # Filters
    category = request.query_params.get('category')
    search = request.query_params.get('search')
    min_price = request.query_params.get('min_price')
    max_price = request.query_params.get('max_price')
    in_stock = request.query_params.get('in_stock')
    is_featured = request.query_params.get('is_featured')
    ordering = request.query_params.get('ordering', '-created_at')
    
    if category:
        products = products.filter(category__slug=category)
    
    if search:
        products = products.filter(
            Q(name__icontains=search) |
            Q(description__icontains=search) |
            Q(category__name__icontains=search)
        )
    
    if min_price:
        try:
            products = products.filter(price__gte=float(min_price))
        except ValueError:
            pass
    
    if max_price:
        try:
            products = products.filter(price__lte=float(max_price))
        except ValueError:
            pass
    
    if in_stock == 'true':
        products = products.filter(stock_quantity__gt=0)
    
    if is_featured == 'true':
        products = products.filter(is_featured=True)
    
    # Ordering - NEW: Support for random ordering
    allowed_ordering = [
        'price', '-price', 'name', '-name', 'created_at', '-created_at',
        'views_count', '-views_count', 'sales_count', '-sales_count', 'random'
    ]
    
    if ordering == 'random':
        # OPTIMIZATION: Use order_by('?') for random - efficient in SQLite/PostgreSQL
        products = products.order_by('?')
    elif ordering in allowed_ordering:
        products = products.order_by(ordering)
    else:
        products = products.order_by('-created_at')
    
    # PAGINATION: Use custom pagination class
    paginator = ProductPagination()
    page = paginator.paginate_queryset(products, request)
    
    if page is not None:
        serializer = ProductListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    # Fallback if pagination fails
    serializer = ProductListSerializer(products, many=True)
    return Response({
        'count': products.count(),
        'results': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def product_detail(request, slug):
    """Get single product and increment views"""
    try:
        # OPTIMIZATION: Prefetch related reviews with buyer data
        product = Product.objects.select_related(
            'category', 
            'seller'
        ).prefetch_related(
            Prefetch(
                'reviews',
                queryset=ProductReview.objects.select_related('buyer').order_by('-created_at')
            )
        ).get(slug=slug)
        
        # Increment view count
        product.increment_views()
        
        serializer = ProductDetailSerializer(product)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsSeller])
def product_create(request):
    """Seller creates product"""
    serializer = ProductCreateUpdateSerializer(data=request.data)
    
    if serializer.is_valid():
        # Assign the current user as the seller
        product = serializer.save(seller=request.user)
        
        # Return detailed product data
        response_serializer = ProductDetailSerializer(product)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsSeller])
def product_update(request, pk):
    """Seller updates their own product"""
    try:
        product = Product.objects.get(pk=pk, seller=request.user)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found or you do not have permission to edit it'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = ProductCreateUpdateSerializer(product, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        
        # Return detailed product data
        response_serializer = ProductDetailSerializer(product)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsSeller])
def product_delete(request, pk):
    """Seller deletes their own product"""
    try:
        product = Product.objects.get(pk=pk, seller=request.user)
        product_name = product.name
        product.delete()
        return Response(
            {'message': f'Product "{product_name}" deleted successfully'},
            status=status.HTTP_200_OK
        )
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found or you do not have permission to delete it'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsSeller])
def my_products(request):
    """Seller views their own products with pagination"""
    # OPTIMIZATION: Only fetch needed fields
    products = Product.objects.filter(
        seller=request.user
    ).select_related(
        'category'
    ).only(
        'id', 'name', 'slug', 'price', 'stock_quantity', 'main_image',
        'weight', 'unit', 'is_active', 'is_featured', 'views_count', 
        'sales_count', 'created_at',
        'category__id', 'category__name'
    ).order_by('-created_at')
    
    # Apply pagination
    paginator = ProductPagination()
    page = paginator.paginate_queryset(products, request)
    
    if page is not None:
        serializer = ProductListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = ProductListSerializer(products, many=True)
    return Response({
        'count': products.count(),
        'results': serializer.data
    }, status=status.HTTP_200_OK)


# ============================================================================
# PRODUCT REVIEW VIEWS (unchanged)
# ============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def product_reviews(request, product_id):
    """Get all reviews for a product"""
    try:
        product = Product.objects.get(pk=product_id)
        reviews = product.reviews.select_related('buyer').order_by('-created_at')
        serializer = ProductReviewSerializer(reviews, many=True)
        return Response({
            'count': reviews.count(),
            'average_rating': product.average_rating,
            'results': serializer.data
        }, status=status.HTTP_200_OK)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsBuyer])
def create_review(request, product_id):
    """Buyer creates a product review"""
    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if user already reviewed this product
    if ProductReview.objects.filter(product=product, buyer=request.user).exists():
        return Response(
            {'error': 'You have already reviewed this product. You can update your existing review.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = ProductReviewCreateUpdateSerializer(data=request.data)
    
    if serializer.is_valid():
        review = serializer.save(product=product, buyer=request.user)
        
        # Return detailed review data
        response_serializer = ProductReviewSerializer(review)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsBuyer])
def update_review(request, review_id):
    """Update own review"""
    try:
        review = ProductReview.objects.get(id=review_id, buyer=request.user)
    except ProductReview.DoesNotExist:
        return Response(
            {'error': 'Review not found or you do not have permission to edit it'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = ProductReviewCreateUpdateSerializer(review, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        
        # Return detailed review data
        response_serializer = ProductReviewSerializer(review)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsBuyer])
def delete_review(request, review_id):
    """Delete own review"""
    try:
        review = ProductReview.objects.get(id=review_id, buyer=request.user)
        product_name = review.product.name
        review.delete()
        return Response(
            {'message': f'Your review for "{product_name}" has been deleted'},
            status=status.HTTP_200_OK
        )
    except ProductReview.DoesNotExist:
        return Response(
            {'error': 'Review not found or you do not have permission to delete it'},
            status=status.HTTP_404_NOT_FOUND
        )