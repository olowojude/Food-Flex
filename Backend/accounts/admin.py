from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, SellerProfile, StoreLocation

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'role', 'city', 'state', 'is_active', 'date_joined']
    list_filter = ['role', 'state', 'is_active', 'is_verified', 'date_joined']
    search_fields = ['email', 'first_name', 'last_name', 'phone_number', 'city', 'state']
    ordering = ['-date_joined']
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('email', 'first_name', 'last_name', 'phone_number', 'profile_image')
        }),
        ('Location Information', {
            'fields': ('country', 'state', 'city', 'address')
        }),
        ('Account Settings', {
            'fields': ('role', 'is_active', 'is_verified', 'is_seller_approved')
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
            'fields': (
                'email', 
                'username', 
                'password1', 
                'password2', 
                'first_name', 
                'last_name',
                'phone_number',
                'country',
                'state',
                'city', 
                'address',
                'role'
            ),
        }),
    )
    
    readonly_fields = ['last_login', 'date_joined']


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'user_email', 'total_products', 'total_orders_fulfilled', 'wallet_balance', 'has_store_locations']
    search_fields = ['business_name', 'user__email']
    list_filter = ['created_at']
    readonly_fields = ['wallet_balance', 'total_earnings', 'total_products', 'total_orders_fulfilled', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Business Information', {
            'fields': ('user', 'store_name', 'business_name', 'business_description', 'business_address')
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
    
    def has_store_locations(self, obj):
        return obj.has_store_locations
    has_store_locations.boolean = True
    has_store_locations.short_description = 'Has Locations'


@admin.register(StoreLocation)
class StoreLocationAdmin(admin.ModelAdmin):
    list_display = ['store_name', 'seller_email', 'city', 'state', 'is_primary', 'is_active', 'created_at']
    list_filter = ['state', 'is_primary', 'is_active', 'created_at']
    search_fields = ['store_name', 'seller__email', 'city', 'state', 'address']
    ordering = ['-is_primary', '-created_at']
    
    fieldsets = (
        ('Store Information', {
            'fields': ('seller', 'store_name', 'phone_number')
        }),
        ('Location', {
            'fields': ('country', 'state', 'city', 'address')
        }),
        ('Settings', {
            'fields': ('is_primary', 'is_active')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def seller_email(self, obj):
        return obj.seller.email
    seller_email.short_description = 'Seller Email'