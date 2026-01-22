from django.urls import path
from . import views

app_name = 'orders'

urlpatterns = [
# Cart
    path('cart/', views.my_cart, name='my-cart'),
    path('cart/add/', views.add_to_cart, name='add-to-cart'),
    path('cart/items/<int:item_id>/', views.update_cart_item, name='update-cart-item'),
    path('cart/items/<int:item_id>/remove/', views.remove_from_cart, name='remove-from-cart'),
    path('cart/clear/', views.clear_cart, name='clear-cart'),
    
    # NEW: BNPL Checkout Flow
    path('checkout/', views.checkout, name='checkout'),  # Step 1: Get payment breakdown
    path('confirm-checkout/', views.confirm_checkout, name='confirm-checkout'),  # Step 2: Finalize after payment
    
    # Orders
    path('', views.my_orders, name='my-orders'),
    path('<int:order_id>/', views.order_detail, name='order-detail'),
    path('<int:order_id>/cancel/', views.cancel_order, name='cancel-order'),
    
    # QR & OTP
    path('<int:order_id>/qr-code/', views.save_qr_code, name='save-qr-code'),
    path('verify-qr/', views.verify_qr_code, name='verify-qr-code'),
    path('<int:order_id>/otp/', views.get_buyer_otp, name='get-buyer-otp'),
    
    # Seller Actions
    path('<int:order_id>/confirm/', views.confirm_order, name='confirm-order'),
    path('<int:order_id>/complete/', views.complete_order, name='complete-order'),
    
    # Admin
    path('all/', views.all_orders, name='all-orders'),
]