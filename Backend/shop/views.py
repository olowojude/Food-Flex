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
from accounts.models import StoreLocation
from accounts.serializers import StoreLocationSerializer
from accounts.permissions import IsAdmin, IsSeller, IsBuyer


class ProductPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = 'page_size'
    max_page_size = 100


# CATEGORY VIEWS
#List all active categories
@api_view(['GET'])
@permission_classes([AllowAny])
def category_list(request):
    categories = Category.objects.filter(is_active=True)
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


#Get category details by slug
@api_view(['GET'])
@permission_classes([AllowAny])
def category_detail(request, slug):
    try:
        category = Category.objects.get(slug=slug, is_active=True)
        serializer = CategorySerializer(category)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Category.DoesNotExist:
        return Response(
            {'error': 'Category not found'},
            status=status.HTTP_404_NOT_FOUND
        )


#Create new category (Admin only)
@api_view(['POST'])
@permission_classes([IsAdmin])
def category_create(request):
    serializer = CategorySerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


#Update category (Admin only)
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdmin])
def category_update(request, pk):
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


#Delete category (Admin only)
@api_view(['DELETE'])
@permission_classes([IsAdmin])
def category_delete(request, pk):
    try:
        category = Category.objects.get(pk=pk)
        
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


# PRODUCT VIEWS
# List all products
@api_view(['GET'])
@permission_classes([AllowAny])
def product_list(request):
    products = Product.objects.filter(is_active=True).select_related(
        'category', 
        'seller'
    ).prefetch_related(
        'seller__store_locations'  # Prefetch store locations
    ).only(
        'id', 'name', 'slug', 'price', 'stock_quantity', 'main_image',
        'weight', 'unit', 'is_featured', 'views_count', 'sales_count', 'created_at',
        'category__id', 'category__name',
        'seller__id', 'seller__first_name', 'seller__last_name', 'seller__email',
        'seller__city', 'seller__state'
    )
    
    # Basic filters
    category = request.query_params.get('category')
    search = request.query_params.get('search')
    min_price = request.query_params.get('min_price')
    max_price = request.query_params.get('max_price')
    in_stock = request.query_params.get('in_stock')
    is_featured = request.query_params.get('is_featured')
    ordering = request.query_params.get('ordering', '-created_at')
    
    # Location filters
    state = request.query_params.get('state')
    
    # Apply filters
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
    
    if state:
        state_filter = state.strip()
        
        # Get seller IDs that have a primary store location in the specified state
        sellers_in_state = StoreLocation.objects.filter(
            is_primary=True,
            is_active=True,
            state__iexact=state_filter
        ).values_list('seller_id', flat=True)
        
        # Filter products by those sellers
        products = products.filter(seller_id__in=sellers_in_state)
    
    # Ordering
    allowed_ordering = [
        'price', '-price', 'name', '-name', 'created_at', '-created_at',
        'views_count', '-views_count', 'sales_count', '-sales_count', 'random'
    ]
    
    if ordering == 'random':
        products = products.order_by('?')
    elif ordering in allowed_ordering:
        products = products.order_by(ordering)
    else:
        products = products.order_by('-created_at')
    
    # Pagination
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


#Get detailed product information
@api_view(['GET'])
@permission_classes([AllowAny])
def product_detail(request, slug):
    try:
        product = Product.objects.select_related(
            'category', 
            'seller'
        ).prefetch_related(
            Prefetch(
                'reviews',
                queryset=ProductReview.objects.select_related('buyer').order_by('-created_at')
            )
        ).get(slug=slug)
        
        product.increment_views()
        
        serializer = ProductDetailSerializer(product)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'},
            status=status.HTTP_404_NOT_FOUND
        )


#Create new product (Seller only)
@api_view(['POST'])
@permission_classes([IsSeller])
def product_create(request):
    # Check if seller has at least one store location
    if not StoreLocation.objects.filter(seller=request.user, is_active=True).exists():
        return Response(
            {
                'error': 'Store location required',
                'message': 'You must add at least one store location before creating products.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = ProductCreateUpdateSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        product = serializer.save(seller=request.user)
        
        response_serializer = ProductDetailSerializer(product)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


#Update product (Seller only and it's their own products)
@api_view(['PUT', 'PATCH'])
@permission_classes([IsSeller])
def product_update(request, pk):
    try:
        product = Product.objects.get(pk=pk, seller=request.user)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found or you do not have permission to edit it'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = ProductCreateUpdateSerializer(
        product, 
        data=request.data, 
        partial=True,
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()
        
        response_serializer = ProductDetailSerializer(product)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



#Delete product (Seller products)
@api_view(['DELETE'])
@permission_classes([IsSeller])
def product_delete(request, pk):
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


#Get seller's own products (Seller only)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_products(request):
    if request.user.role != 'SELLER':
        return Response({
            'error': 'You must be a seller to access inventory',
            'details': {
                'current_role': request.user.role,
                'is_seller': request.user.role == 'SELLER',
                'has_seller_profile': hasattr(request.user, 'seller_profile'),
                'message': 'Please apply to become a seller first or contact admin if your application is pending.'
            }
        }, status=status.HTTP_403_FORBIDDEN)
    
    products = Product.objects.filter(
        seller=request.user
    ).select_related(
        'category'
    ).only(
        'id', 'name', 'slug', 'price', 'stock_quantity', 'main_image',
        'weight', 'unit', 'is_active', 'is_featured', 'views_count', 
        'sales_count', 'created_at', 'updated_at',
        'category__id', 'category__name'
    ).order_by('-updated_at')
    
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




# STORE LOCATION VIEWS (SELLERS)
#List all store locations for the seller
@api_view(['GET', 'POST'])
@permission_classes([IsSeller])
def store_location_list(request):
    if request.method == 'GET':
        # GET: List all locations
        locations = StoreLocation.objects.filter(
            seller=request.user,
            is_active=True
        ).order_by('-is_primary', '-created_at')
        
        serializer = StoreLocationSerializer(locations, many=True)
        return Response({
            'count': locations.count(),
            'results': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = StoreLocationSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            location = serializer.save(seller=request.user)
            return Response(
                StoreLocationSerializer(location).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


#Get details of a specific store location
@api_view(['GET'])
@permission_classes([IsSeller])
def store_location_detail(request, pk):
    try:
        location = StoreLocation.objects.get(pk=pk, seller=request.user)
        serializer = StoreLocationSerializer(location)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except StoreLocation.DoesNotExist:
        return Response(
            {'error': 'Store location not found'},
            status=status.HTTP_404_NOT_FOUND
        )


#Update a store location
@api_view(['PUT', 'PATCH'])
@permission_classes([IsSeller])
def store_location_update(request, pk):    
    try:
        location = StoreLocation.objects.get(pk=pk, seller=request.user)
    except StoreLocation.DoesNotExist:
        return Response(
            {'error': 'Store location not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = StoreLocationSerializer(
        location,
        data=request.data,
        partial=True,
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



#Delete a store location
@api_view(['DELETE'])
@permission_classes([IsSeller])
def store_location_delete(request, pk):
    try:
        location = StoreLocation.objects.get(pk=pk, seller=request.user)
        
        # Prevent deleting if it's the only location
        total_locations = StoreLocation.objects.filter(
            seller=request.user, 
            is_active=True
        ).count()
        
        if total_locations <= 1:
            return Response(
                {'error': 'Cannot delete your only store location. Please add another location first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        location_name = location.store_name
        location.delete()
        
        return Response(
            {'message': f'Store location "{location_name}" deleted successfully'},
            status=status.HTTP_200_OK
        )
    except StoreLocation.DoesNotExist:
        return Response(
            {'error': 'Store location not found'},
            status=status.HTTP_404_NOT_FOUND
        )



#Set a store location as primary
@api_view(['POST'])
@permission_classes([IsSeller])
def store_location_set_primary(request, pk):
    try:
        location = StoreLocation.objects.get(pk=pk, seller=request.user)
        
        # Unmark all other locations as primary
        StoreLocation.objects.filter(seller=request.user).update(is_primary=False)
        
        # Mark this location as primary
        location.is_primary = True
        location.save()
        
        return Response(
            {'message': f'"{location.store_name}" is now your primary location'},
            status=status.HTTP_200_OK
        )
    except StoreLocation.DoesNotExist:
        return Response(
            {'error': 'Store location not found'},
            status=status.HTTP_404_NOT_FOUND
        )


# PRODUCT REVIEW VIEWS
#Get all reviews for a product
@api_view(['GET'])
@permission_classes([AllowAny])
def product_reviews(request, product_id):
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


#Create a product review (Buyer only)
@api_view(['POST'])
@permission_classes([IsBuyer])
def create_review(request, product_id):
    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if ProductReview.objects.filter(product=product, buyer=request.user).exists():
        return Response(
            {'error': 'You have already reviewed this product. You can update your existing review.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = ProductReviewCreateUpdateSerializer(data=request.data)
    
    if serializer.is_valid():
        review = serializer.save(product=product, buyer=request.user)
        
        response_serializer = ProductReviewSerializer(review)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


#Update a product review (Buyer own reviews)
@api_view(['PUT', 'PATCH'])
@permission_classes([IsBuyer])
def update_review(request, review_id):
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
        
        response_serializer = ProductReviewSerializer(review)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


#Delete a product review (Buyer own reviews)
@api_view(['DELETE'])
@permission_classes([IsBuyer])
def delete_review(request, review_id):
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