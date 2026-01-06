from django.urls import path
from . import views

urlpatterns = [
    # CATEGORIES
    path('categories/', views.category_list, name='category-list'),
    path('categories/create/', views.category_create, name='category-create'),
    path('categories/<slug:slug>/', views.category_detail, name='category-detail'),
    path('categories/<int:pk>/update/', views.category_update, name='category-update'),
    path('categories/<int:pk>/delete/', views.category_delete, name='category-delete'),
    
    # PRODUCTS
    path('products/', views.product_list, name='product-list'),
    path('products/create/', views.product_create, name='product-create'),
    path('products/<slug:slug>/', views.product_detail, name='product-detail'),
    path('products/<int:pk>/update/', views.product_update, name='product-update'),
    path('products/<int:pk>/delete/', views.product_delete, name='product-delete'),
    
    # SELLER INVENTORY
    path('inventory/', views.my_products, name='my-products'),
    
    # STORE LOCATIONS (SELLERS)
    path('store-locations/', views.store_location_list, name='store-location-list-create'),    
    path('store-locations/<int:pk>/', views.store_location_detail, name='store-location-detail'),    
    path('store-locations/<int:pk>/update/', views.store_location_update, name='store-location-update'),
    path('store-locations/<int:pk>/delete/', views.store_location_delete, name='store-location-delete'),
    path('store-locations/<int:pk>/set-primary/', views.store_location_set_primary, name='store-location-set-primary'),
    
    # PRODUCT REVIEWS
    path('products/<int:product_id>/reviews/', views.product_reviews, name='product-reviews'),
    path('products/<int:product_id>/reviews/create/', views.create_review, name='create-review'),
    path('reviews/<int:review_id>/', views.update_review, name='update-review'),
    path('reviews/<int:review_id>/delete/', views.delete_review, name='delete-review'),
]