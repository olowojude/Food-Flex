from django.urls import path
from . import views

app_name = 'orders'

urlpatterns = [
    # Cart
    path('cart/', views.my_cart, name='my_cart'),
    path('cart/add/', views.add_to_cart, name='add_to_cart'),
    path('cart/items/<int:item_id>/', views.update_cart_item, name='update_cart_item'),
    path('cart/items/<int:item_id>/remove/', views.remove_from_cart, name='remove_from_cart'),
    path('cart/clear/', views.clear_cart, name='clear_cart'),
    
    # Checkout
    path('checkout/', views.checkout, name='checkout'),
    
    # Orders (unified for both buyers and sellers - permissions handle the difference)
    path('', views.my_orders, name='my_orders'),  # GET for buyers, different response for sellers
    path('<int:order_id>/', views.order_detail, name='order_detail'),
    path('<int:order_id>/qr-code/', views.save_qr_code, name='save_qr_code'),
    
    # Order Actions (seller uses these, but no "seller/" prefix in URL)
    path('<int:order_id>/confirm/', views.confirm_order, name='confirm_order'),
    path('<int:order_id>/complete/', views.complete_order, name='complete_order'),
    path('verify-qr/', views.verify_qr_code, name='verify_qr_code'),
    
    # Management (was admin)
    path('all/', views.all_orders, name='all_orders'),
]