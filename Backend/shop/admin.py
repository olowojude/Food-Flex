from django.contrib import admin
from .models import Category, Product, ProductReview

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'product_count', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Category Information', {
            'fields': ('name', 'slug', 'description', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def product_count(self, obj):
        return obj.products.filter(is_active=True).count()
    product_count.short_description = 'Active Products'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'seller_name', 'category', 'price', 'stock_quantity', 'is_active', 'sales_count', 'created_at']
    list_filter = ['category', 'is_active', 'is_featured', 'created_at']
    search_fields = ['name', 'description', 'seller__email', 'seller__first_name', 'seller__last_name']
    list_editable = ['price', 'stock_quantity', 'is_active']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['views_count', 'sales_count', 'created_at', 'updated_at', 'average_rating']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Product Information', {
            'fields': ('seller', 'category', 'name', 'slug', 'description')
        }),
        ('Pricing & Stock', {
            'fields': ('price', 'stock_quantity', 'weight', 'unit')
        }),
        ('Images', {
            'fields': ('main_image', 'additional_images'),
            'description': 'Enter Cloudinary URLs for images'
        }),
        ('Settings', {
            'fields': ('is_active', 'is_featured')
        }),
        ('Statistics (Read-Only)', {
            'fields': ('views_count', 'sales_count', 'average_rating', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def seller_name(self, obj):
        return obj.seller.get_full_name() or obj.seller.email
    seller_name.short_description = 'Seller'
    
    def average_rating(self, obj):
        return f"{obj.average_rating}/5.0"
    average_rating.short_description = 'Avg Rating'


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ['product', 'buyer_name', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['product__name', 'buyer__email', 'buyer__first_name', 'buyer__last_name', 'comment']
    readonly_fields = ['product', 'buyer', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Review Information', {
            'fields': ('product', 'buyer', 'rating', 'comment')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def buyer_name(self, obj):
        return obj.buyer.get_full_name() or obj.buyer.email
    buyer_name.short_description = 'Buyer'
    
    def has_add_permission(self, request):
        # Reviews should only be created through API, not admin
        return False