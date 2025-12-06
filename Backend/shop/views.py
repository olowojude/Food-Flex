from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Avg
from .models import Category, Product, ProductReview
from .serializers import (
    CategorySerializer, ProductListSerializer,
    ProductDetailSerializer, ProductCreateUpdateSerializer,
    ProductReviewSerializer, ProductReviewCreateSerializer
)


# Category Views
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def category_list(request):
    """List all active categories"""
    search = request.query_params.get('search', '')
    
    queryset = Category.objects.filter(is_active=True)
    
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) | Q(description__icontains=search)
        )
    
    serializer = CategorySerializer(queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def category_detail(request, slug):
    """Get category details"""
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
@permission_classes([permissions.IsAuthenticated])
def category_create(request):
    """Admin creates a category"""
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can create categories'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = CategorySerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def category_update(request, pk):
    """Admin updates a category"""
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can update categories'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        category = Category.objects.get(pk=pk)
        serializer = CategorySerializer(category, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Category.DoesNotExist:
        return Response(
            {'error': 'Category not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def category_delete(request, pk):
    """Admin deletes a category"""
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can delete categories'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        category = Category.objects.get(pk=pk)
        category.delete()
        return Response(
            {'message': 'Category deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )
    except Category.DoesNotExist:
        return Response(
            {'error': 'Category not found'},
            status=status.HTTP_404_NOT_FOUND
        )


# Product Views
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def product_list(request):
    """List all active products with filters"""
    queryset = Product.objects.filter(is_active=True)
    
    # Search filter
    search = request.query_params.get('search', '')
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) | Q(description__icontains=search)
        )
    
    # Category filter
    category_slug = request.query_params.get('category')
    if category_slug:
        queryset = queryset.filter(category__slug=category_slug)
    
    # Seller filter
    seller_id = request.query_params.get('seller')
    if seller_id:
        queryset = queryset.filter(seller_id=seller_id)
    
    # Featured filter
    is_featured = request.query_params.get('featured')
    if is_featured == 'true':
        queryset = queryset.filter(is_featured=True)
    
    # Price range filter
    min_price = request.query_params.get('min_price')
    max_price = request.query_params.get('max_price')
    if min_price:
        queryset = queryset.filter(price__gte=min_price)
    if max_price:
        queryset = queryset.filter(price__lte=max_price)
    
    # Stock filter
    in_stock = request.query_params.get('in_stock')
    if in_stock == 'true':
        queryset = queryset.filter(stock_quantity__gt=0)
    
    # Ordering
    ordering = request.query_params.get('ordering', '-created_at')
    queryset = queryset.order_by(ordering)
    
    # Pagination
    paginator = PageNumberPagination()
    paginator.page_size = 20
    paginated_queryset = paginator.paginate_queryset(queryset, request)
    
    serializer = ProductListSerializer(paginated_queryset, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def product_detail(request, slug):
    """Get product details"""
    try:
        product = Product.objects.get(slug=slug, is_active=True)
        # Increment views
        product.increment_views()
        serializer = ProductDetailSerializer(product)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def product_create(request):
    """Seller creates a product"""
    user = request.user
    
    # Check if user is an approved seller
    if not user.can_sell():
        return Response(
            {'error': 'Only approved sellers can create products'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = ProductCreateUpdateSerializer(data=request.data)
    
    if serializer.is_valid():
        product = serializer.save(seller=user)
        
        # Update seller's product count
        seller_profile = user.seller_profile
        seller_profile.total_products = user.products.count()
        seller_profile.save()
        
        return Response(
            ProductDetailSerializer(product).data,
            status=status.HTTP_201_CREATED
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def product_update(request, pk):
    """Seller updates their product"""
    user = request.user
    
    if user.role != 'SELLER':
        return Response(
            {'error': 'Only sellers can update products'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        product = Product.objects.get(pk=pk, seller=user)
        serializer = ProductCreateUpdateSerializer(
            product,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                ProductDetailSerializer(product).data,
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found or you do not have permission'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def product_delete(request, pk):
    """Seller deletes their product"""
    user = request.user
    
    if user.role != 'SELLER':
        return Response(
            {'error': 'Only sellers can delete products'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        product = Product.objects.get(pk=pk, seller=user)
        product.delete()
        
        # Update seller's product count
        seller_profile = user.seller_profile
        seller_profile.total_products = user.products.count()
        seller_profile.save()
        
        return Response(
            {'message': 'Product deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found or you do not have permission'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_products(request):
    """Seller views their own products"""
    user = request.user
    
    if user.role != 'SELLER':
        return Response(
            {'error': 'Only sellers can view their products'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    queryset = Product.objects.filter(seller=user)
    
    # Filter by active status
    is_active = request.query_params.get('is_active')
    if is_active == 'true':
        queryset = queryset.filter(is_active=True)
    elif is_active == 'false':
        queryset = queryset.filter(is_active=False)
    
    # Search filter
    search = request.query_params.get('search', '')
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) | Q(description__icontains=search)
        )
    
    # Ordering
    ordering = request.query_params.get('ordering', '-created_at')
    queryset = queryset.order_by(ordering)
    
    # Pagination
    paginator = PageNumberPagination()
    paginator.page_size = 20
    paginated_queryset = paginator.paginate_queryset(queryset, request)
    
    serializer = ProductListSerializer(paginated_queryset, many=True)
    return paginator.get_paginated_response(serializer.data)


# Product Review Views
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def product_reviews(request, product_id):
    """List reviews for a product"""
    reviews = ProductReview.objects.filter(product_id=product_id)
    serializer = ProductReviewSerializer(reviews, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_review(request, product_id):
    """Buyer creates a product review"""
    user = request.user
    
    # Only buyers can review
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers can review products'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Check if product exists
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if user already reviewed this product
    if ProductReview.objects.filter(product=product, buyer=user).exists():
        return Response(
            {'error': 'You have already reviewed this product'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = ProductReviewCreateSerializer(data=request.data)
    
    if serializer.is_valid():
        review = serializer.save(product=product, buyer=user)
        return Response(
            ProductReviewSerializer(review).data,
            status=status.HTTP_201_CREATED
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_review(request, review_id):
    """Buyer updates their review"""
    user = request.user
    
    try:
        review = ProductReview.objects.get(id=review_id, buyer=user)
        serializer = ProductReviewCreateSerializer(
            review,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                ProductReviewSerializer(review).data,
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except ProductReview.DoesNotExist:
        return Response(
            {'error': 'Review not found or you do not have permission'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_review(request, review_id):
    """Buyer deletes their review"""
    user = request.user
    
    try:
        review = ProductReview.objects.get(id=review_id, buyer=user)
        review.delete()
        return Response(
            {'message': 'Review deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )
    except ProductReview.DoesNotExist:
        return Response(
            {'error': 'Review not found or you do not have permission'},
            status=status.HTTP_404_NOT_FOUND
        )