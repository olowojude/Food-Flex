from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, SellerProfile

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active', 'is_verified', 'date_joined']
    search_fields = ['email', 'first_name', 'last_name', 'phone_number']
    ordering = ['-date_joined']
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('email', 'first_name', 'last_name', 'phone_number', 'address', 'profile_image')
        }),
        ('Account Settings', {
            'fields': ('role', 'is_active', 'is_verified')
        }),
        ('Password', {
            'fields': ('password',),
            'description': 'Use the "change password" form to update password'
        }),
        ('Advanced (Technical)', {
            'classes': ('collapse',),
            'fields': ('username', 'is_staff', 'is_superuser', 'groups', 'user_permissions', 'last_login', 'date_joined'),
        }),
    )
    
    add_fieldsets = (
        ('Create New User', {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2', 'first_name', 'last_name', 'role'),
        }),
    )
    
    readonly_fields = ['last_login', 'date_joined']


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'user_email', 'total_products', 'total_orders_fulfilled', 'wallet_balance']
    search_fields = ['business_name', 'user__email']
    list_filter = ['created_at']
    readonly_fields = ['wallet_balance', 'total_earnings', 'total_products', 'total_orders_fulfilled', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Business Information', {
            'fields': ('user', 'business_name', 'business_description', 'business_address')
        }),
        ('Statistics (Read-Only)', {
            'fields': ('wallet_balance', 'total_earnings', 'total_products', 'total_orders_fulfilled')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'