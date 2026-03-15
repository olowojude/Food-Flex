from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),

    # Profile
    path('profile/', views.user_profile, name='user-profile'),
    path('profile/password/', views.change_password, name='change-password'),
    path('profile/business/', views.seller_profile, name='seller-profile'),
    path('profile/business/update/', views.update_seller_profile, name='update-seller-profile'),

    # Admin - User Management
    path('users/', views.list_users, name='list-users'),
    path('users/<int:user_id>/', views.user_detail, name='user-detail'),
    path('users/<int:user_id>/update/', views.update_user, name='update-user'),
    path('users/<int:user_id>/delete/', views.delete_user, name='delete-user'),

    # ── Phone Verification ──────────────────────────────────────────
    path('verification/status/', views.get_verification_status, name='verification-status'),
    path('verification/phone/send-otp/', views.send_phone_verification_otp, name='send-phone-otp'),
    path('verification/phone/verify-otp/', views.verify_phone_otp, name='verify-phone-otp'),

    # ── BVN Verification ────────────────────────────────────────────
    path('bvn/submit/', views.submit_bvn, name='submit-bvn'),

    # ── Admin BVN ───────────────────────────────────────────────────
    path('admin/verify-bvn/<int:user_id>/', views.admin_verify_bvn, name='admin-verify-bvn'),
]