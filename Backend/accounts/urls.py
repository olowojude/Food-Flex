from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User Profile
    path('profile/', views.user_profile, name='user_profile'),
    path('change-password/', views.change_password, name='change_password'),
    
    # Seller Application
    path('apply-seller/', views.apply_for_seller, name='apply_seller'),
    path('seller-profile/', views.seller_profile, name='seller_profile'),
    path('seller-profile/update/', views.update_seller_profile, name='update_seller_profile'),
    
    # Admin - User Management
    path('admin/users/', views.list_users, name='list_users'),
    path('admin/users/<int:user_id>/', views.user_detail, name='user_detail'),
    path('admin/approve-seller/<int:user_id>/', views.approve_seller, name='approve_seller'),
]