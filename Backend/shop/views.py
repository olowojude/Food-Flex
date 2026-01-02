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
from rest_framework.pagination import PageNumberPagination
from accounts.permissions import IsSeller
from .models import StoreLocation, Product
from .serializers import StoreLocationSerializer, ProductSerializer
from .utils import get_products_in_radius, calculate_distance


class ProductPagination(PageNumberPagination):
    page_size = 30  # Default 30 products per page (as requested)
    page_size_query_param = 'page_size'  # Allow client to override
    max_page_size = 100  # Maximum allowed


@api_view(['GET'])
@permission_classes([AllowAny])
def category_list(request):
    categories = Category.objects.filter(is_active=True)
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


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


@api_view(['POST'])
@permission_classes([IsAdmin])
def category_create(request):
    serializer = CategorySerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def category_delete(request, pk):
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


@api_view(['GET'])
@permission_classes([AllowAny])
def product_list(request):    
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
    serializer = ProductCreateUpdateSerializer(data=request.data)
    
    if serializer.is_valid():
        product = serializer.save(seller=request.user)
        
        response_serializer = ProductDetailSerializer(product)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
    
    serializer = ProductCreateUpdateSerializer(product, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        
        response_serializer = ProductDetailSerializer(product)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])  # Changed from IsSeller
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
    ).order_by('-updated_at')  # Changed to show recently updated first
    
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
        
        # Return detailed review data
        response_serializer = ProductReviewSerializer(review)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
    
@api_view(['GET', 'POST'])
@permission_classes([IsSeller])
def store_locations_list(request):
    """
    GET: List all store locations for the authenticated seller
    POST: Create a new store location
    """
    if request.method == 'GET':
        locations = StoreLocation.objects.filter(
            seller=request.user,
            is_active=True
        ).order_by('-created_at')
        
        serializer = StoreLocationSerializer(locations, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = StoreLocationSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(seller=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsSeller])
def store_location_detail(request, pk):
    """
    GET: Retrieve a specific store location
    PATCH: Update a store location
    DELETE: Soft delete a store location
    """
    try:
        location = StoreLocation.objects.get(
            pk=pk,
            seller=request.user,
            is_active=True
        )
    except StoreLocation.DoesNotExist:
        return Response(
            {'error': 'Store location not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = StoreLocationSerializer(location)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        serializer = StoreLocationSerializer(
            location,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Soft delete
        location.is_active = False
        location.save()
        return Response(
            {'message': 'Store location deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )


# ============================================
# LOCATION-BASED PRODUCT SEARCH (BUYERS)
# ============================================

@api_view(['GET'])
def products_near_me(request):
    """
    Get products near user's GPS location.
    
    Query params:
    - lat: User's latitude (required)
    - lng: User's longitude (required)
    - radius: Search radius in km (optional, default: 10)
    - category: Filter by category slug (optional)
    - min_price: Minimum price (optional)
    - max_price: Maximum price (optional)
    - sort: Sort order (optional, default: 'distance')
    """
    # Validate required parameters
    lat = request.GET.get('lat')
    lng = request.GET.get('lng')
    
    if not lat or not lng:
        return Response(
            {'error': 'Latitude (lat) and longitude (lng) are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return Response(
            {'error': 'Invalid latitude or longitude format'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Optional parameters
    radius = float(request.GET.get('radius', 10))
    category = request.GET.get('category')
    min_price = request.GET.get('min_price')
    max_price = request.GET.get('max_price')
    sort = request.GET.get('sort', 'distance')
    
    # Get products using smart radius expansion
    result = get_products_in_radius(lat, lng, radius)
    
    products = result['products']
    
    # Apply additional filters
    if category:
        products = products.filter(category__slug=category)
    
    if min_price:
        products = products.filter(price__gte=min_price)
    
    if max_price:
        products = products.filter(price__lte=max_price)
    
    # Calculate distance for each product (to closest store)
    products_with_distance = []
    nearby_stores = result['nearby_stores']
    
    for product in products:
        product_stores = product.store_locations.all()
        
        # Find closest store for this product
        closest_distance = None
        closest_store = None
        
        for store_info in nearby_stores:
            if store_info['store'] in product_stores:
                if closest_distance is None or store_info['distance_km'] < closest_distance:
                    closest_distance = store_info['distance_km']
                    closest_store = {
                        'id': store_info['store'].id,
                        'name': store_info['store'].name,
                        'address': store_info['store'].address,
                        'city': store_info['store'].city,
                        'state': store_info['store'].state,
                        'distance_km': store_info['distance_km']
                    }
        
        products_with_distance.append({
            'product': product,
            'closest_store': closest_store,
            'distance_km': closest_distance
        })
    
    # Sort by distance or other criteria
    if sort == 'distance':
        products_with_distance.sort(key=lambda x: x['distance_km'] or 9999)
    elif sort == 'price_asc':
        products_with_distance.sort(key=lambda x: x['product'].price)
    elif sort == 'price_desc':
        products_with_distance.sort(key=lambda x: x['product'].price, reverse=True)
    
    # Serialize products
    serialized_products = []
    for item in products_with_distance:
        context = {'closest_store': item['closest_store']}
        serializer = ProductSerializer(item['product'], context=context)
        data = serializer.data
        data['distance_km'] = item['distance_km']
        serialized_products.append(data)
    
    # Paginate
    paginator = PageNumberPagination()
    paginator.page_size = 30
    page = paginator.paginate_queryset(serialized_products, request)
    
    return paginator.get_paginated_response({
        'products': page,
        'metadata': {
            'radius_used': result['radius_used'],
            'total_products': result['product_count'],
            'total_stores': result['store_count'],
            'user_location': {'lat': lat, 'lng': lng}
        }
    })


@api_view(['GET'])
def products_by_location(request):
    """
    Filter products by city/state (text-based, no GPS).
    
    Query params:
    - city: Filter by city name
    - state: Filter by state name
    """
    city = request.GET.get('city')
    state = request.GET.get('state')
    
    if not city and not state:
        return Response(
            {'error': 'Please provide city or state'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    products = Product.objects.filter(
        is_active=True,
        stock_quantity__gt=0
    )
    
    if city:
        products = products.filter(store_locations__city__iexact=city)
    
    if state:
        products = products.filter(store_locations__state__iexact=state)
    
    products = products.select_related('seller', 'category').prefetch_related(
        'store_locations'
    ).distinct()
    
    # Paginate
    paginator = PageNumberPagination()
    paginator.page_size = 30
    page = paginator.paginate_queryset(products, request)
    
    serializer = ProductSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)