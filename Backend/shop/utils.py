# backend/shop/utils.py
# Create this new file

from math import radians, cos, sin, asin, sqrt

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the distance between two GPS coordinates in kilometers.
    Uses the Haversine formula.
    
    Args:
        lat1, lon1: First coordinate (user location)
        lat2, lon2: Second coordinate (store location)
    
    Returns:
        float: Distance in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [
        float(lat1), float(lon1),
        float(lat2), float(lon2)
    ])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Radius of Earth in kilometers
    radius = 6371
    
    return round(c * radius, 2)  # Return distance rounded to 2 decimal places


def get_nearby_stores(user_lat, user_lng, radius_km=10):
    """
    Get all store locations within a given radius.
    
    Args:
        user_lat: User's latitude
        user_lng: User's longitude
        radius_km: Search radius in kilometers (default 10)
    
    Returns:
        list: List of dicts with store info and distance
    """
    from .models import StoreLocation
    
    stores = StoreLocation.objects.filter(is_active=True).select_related('seller')
    nearby_stores = []
    
    for store in stores:
        distance = calculate_distance(
            user_lat, user_lng,
            store.latitude, store.longitude
        )
        
        if distance <= radius_km:
            nearby_stores.append({
                'store': store,
                'distance_km': distance
            })
    
    # Sort by distance (closest first)
    nearby_stores.sort(key=lambda x: x['distance_km'])
    
    return nearby_stores


def get_products_in_radius(user_lat, user_lng, radius_km=10, min_products=5):
    """
    Smart product search with progressive radius expansion.
    
    Args:
        user_lat: User's latitude
        user_lng: User's longitude
        radius_km: Initial search radius (default 10)
        min_products: Minimum products to return (default 5)
    
    Returns:
        dict: Products and metadata
    """
    from .models import Product
    
    # Progressive radius expansion: 5km → 10km → 25km → 50km → 100km
    radii = [5, 10, 25, 50, 100]
    
    for current_radius in radii:
        # Skip radii smaller than requested
        if current_radius < radius_km:
            continue
            
        nearby_stores = get_nearby_stores(user_lat, user_lng, current_radius)
        
        if not nearby_stores:
            continue
        
        # Get store IDs
        store_ids = [item['store'].id for item in nearby_stores]
        
        # Find products available at these stores
        products = Product.objects.filter(
            is_active=True,
            stock_quantity__gt=0,
            store_locations__id__in=store_ids
        ).select_related('seller', 'category').prefetch_related(
            'store_locations'
        ).distinct()
        
        product_count = products.count()
        
        # Return if we found enough products or reached max radius
        if product_count >= min_products or current_radius == radii[-1]:
            return {
                'products': products,
                'radius_used': current_radius,
                'product_count': product_count,
                'store_count': len(nearby_stores),
                'nearby_stores': nearby_stores
            }
    
    # No products found even at max radius
    return {
        'products': Product.objects.none(),
        'radius_used': radii[-1],
        'product_count': 0,
        'store_count': 0,
        'nearby_stores': []
    }