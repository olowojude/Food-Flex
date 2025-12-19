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
    path('google-login/', views.google_login, name='google_login'),
    
    # User Profile
    path('profile/', views.user_profile, name='user_profile'),
    path('profile/password/', views.change_password, name='change_password'),
    
    # Seller Application & Profile (cleaner, no "seller" prefix)
    path('profile/business/', views.seller_profile, name='seller_profile'),
    path('profile/business/apply/', views.apply_for_seller, name='apply_seller'),
    path('profile/business/update/', views.update_seller_profile, name='update_seller_profile'),
    
    # Management (was admin) - User Management
    path('users/', views.list_users, name='list_users'),
    path('users/<int:user_id>/', views.user_detail, name='user_detail'),
    path('users/<int:user_id>/approve-seller/', views.approve_seller, name='approve_seller'),
]