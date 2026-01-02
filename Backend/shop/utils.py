# backend/shop/utils.py
from math import radians, cos, sin, asin, sqrt

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two GPS coordinates in kilometers"""
    lat1, lon1, lat2, lon2 = map(radians, [
        float(lat1), float(lon1),
        float(lat2), float(lon2)
    ])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    radius = 6371  # Earth radius in km
    return round(c * radius, 2)


def get_nearby_stores(user_lat, user_lng, radius_km=10):
    """Get all store locations within a given radius"""
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
    
    nearby_stores.sort(key=lambda x: x['distance_km'])
    return nearby_stores


def get_products_in_radius(user_lat, user_lng, radius_km=10, min_products=5):
    """Smart product search with progressive radius expansion"""
    from .models import Product
    
    radii = [5, 10, 25, 50, 100]
    
    for current_radius in radii:
        if current_radius < radius_km:
            continue
            
        nearby_stores = get_nearby_stores(user_lat, user_lng, current_radius)
        
        if not nearby_stores:
            continue
        
        store_ids = [item['store'].id for item in nearby_stores]
        
        products = Product.objects.filter(
            is_active=True,
            stock_quantity__gt=0,
            store_locations__id__in=store_ids
        ).select_related('seller', 'category').prefetch_related(
            'store_locations'
        ).distinct()
        
        product_count = products.count()
        
        if product_count >= min_products or current_radius == radii[-1]:
            return {
                'products': products,
                'radius_used': current_radius,
                'product_count': product_count,
                'store_count': len(nearby_stores),
                'nearby_stores': nearby_stores
            }
    
    return {
        'products': Product.objects.none(),
        'radius_used': radii[-1],
        'product_count': 0,
        'store_count': 0,
        'nearby_stores': []
    }