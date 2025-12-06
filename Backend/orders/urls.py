from django.urls import path
from . import views

app_name = 'orders'

urlpatterns = [
    # Cart
    path('cart/', views.my_cart, name='my_cart'),
    path('cart/add/', views.add_to_cart, name='add_to_cart'),
    path('cart/item/<int:item_id>/update/', views.update_cart_item, name='update_cart_item'),
    path('cart/item/<int:item_id>/remove/', views.remove_from_cart, name='remove_from_cart'),
    path('cart/clear/', views.clear_cart, name='clear_cart'),
    
    # Checkout
    path('checkout/', views.checkout, name='checkout'),
    
    # Orders
    path('my-orders/', views.my_orders, name='my_orders'),
    path('orders/<int:order_id>/', views.order_detail, name='order_detail'),
    path('orders/<int:order_id>/save-qr/', views.save_qr_code, name='save_qr_code'),
    
    # Seller Order Management
    path('seller/orders/', views.seller_orders, name='seller_orders'),
    path('seller/verify-qr/', views.verify_qr_code, name='verify_qr_code'),
    path('seller/orders/<int:order_id>/confirm/', views.confirm_order, name='confirm_order'),
    path('seller/orders/<int:order_id>/complete/', views.complete_order, name='complete_order'),
    
    # Admin
    path('admin/orders/', views.all_orders, name='all_orders'),
]