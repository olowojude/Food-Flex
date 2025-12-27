from django.contrib import admin
from .models import Order, OrderItem, Cart, CartItem

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'buyer_email', 'seller_email', 'total_amount', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['order_number', 'buyer__email', 'seller__email']
    readonly_fields = ['order_number', 'qr_code_token', 'qr_code_image', 'created_at', 'confirmed_at', 'completed_at']
    
    fieldsets = (
        ('Order Information', {
            'fields': ('order_number', 'buyer', 'seller', 'total_amount', 'status')
        }),
        ('QR Code', {
            'fields': ('qr_code_token', 'qr_code_image')
        }),
        ('Dates', {
            'fields': ('created_at', 'confirmed_at', 'completed_at')
        }),
    )
    
    def buyer_email(self, obj):
        return obj.buyer.email
    buyer_email.short_description = 'Buyer'
    
    def seller_email(self, obj):
        return obj.seller.email
    seller_email.short_description = 'Seller'


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product_name', 'quantity', 'item_price']  # Fixed from 'price'
    search_fields = ['order__order_number', 'product_name']
    
    def item_price(self, obj):
        return obj.price
    item_price.short_description = 'Price'


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'item_count', 'total_amount', 'created_at']
    search_fields = ['user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    
    def item_count(self, obj):
        return obj.items.count()
    item_count.short_description = 'Items'
    
    def total_amount(self, obj):
        return sum(item.total_price for item in obj.items.all())
    total_amount.short_description = 'Total'


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ['cart', 'product', 'quantity', 'total_price']
    search_fields = ['cart__user__email', 'product__name']