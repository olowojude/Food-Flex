from django.urls import path
from . import views

app_name = 'shop'

urlpatterns = [
    # Categories
    path('categories/', views.category_list, name='category_list'),
    path('categories/create/', views.category_create, name='category_create'),
    path('categories/<slug:slug>/', views.category_detail, name='category_detail'),
    path('categories/<int:pk>/update/', views.category_update, name='category_update'),
    path('categories/<int:pk>/delete/', views.category_delete, name='category_delete'),
    
    # Products
    path('products/', views.product_list, name='product_list'),
    path('products/create/', views.product_create, name='product_create'),
    path('products/<slug:slug>/', views.product_detail, name='product_detail'),
    path('products/<int:pk>/update/', views.product_update, name='product_update'),
    path('products/<int:pk>/delete/', views.product_delete, name='product_delete'),
    
    # View products for sellers
    path('inventory/', views.my_products, name='my_products'),  # Changed from "my-products"
    
    # Product Reviews
    path('products/<int:product_id>/reviews/', views.product_reviews, name='product_reviews'),
    path('products/<int:product_id>/reviews/create/', views.create_review, name='create_review'),
    path('reviews/<int:review_id>/', views.update_review, name='update_review'),
    path('reviews/<int:review_id>/delete/', views.delete_review, name='delete_review'),

    # STORE LOCATION ENDPOINTS (Sellers)
    path('store-locations/', views.store_locations_list, name='store_locations_list'),
    path('store-locations/<int:pk>/', views.store_location_detail, name='store_location_detail'),
    
    # LOCATION-BASED PRODUCT SEARCH (Buyers)
    path('products/near-me/', views.products_near_me, name='products_near_me'),
    path('products/by-location/', views.products_by_location, name='products_by_location'),
]
