# Backend/orders/serializers.py
# REPLACE THE ENTIRE FILE - Simplified version

from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem, Product


class CartItemSerializer(serializers.ModelSerializer):
    from shop.serializers import ProductListSerializer
    
    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source='product',
        write_only=True
    )
    total_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    
    class Meta:
        model = CartItem
        fields = [
            'id', 'cart', 'product', 'product_id',
            'quantity', 'total_price', 'created_at'
        ]
        read_only_fields = ['cart']
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value
    
    def validate(self, attrs):
        product = attrs.get('product')
        quantity = attrs.get('quantity', 1)
        
        if product and quantity > product.stock_quantity:
            raise serializers.ValidationError({
                'quantity': f'Only {product.stock_quantity} units available in stock'
            })
        
        return attrs


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    subtotal = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    
    class Meta:
        model = Cart
        fields = [
            'id', 'user', 'items', 'total_items',
            'subtotal', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user']


class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)


class OrderItemSerializer(serializers.ModelSerializer):
    product_image = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_price',
            'quantity', 'subtotal', 'product_image'
        ]
    
    def get_product_image(self, obj):
        """Get product image if product still exists"""
        if obj.product and obj.product.main_image:
            return obj.product.main_image
        return None


class OrderListSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    seller_name = serializers.CharField(source='seller.get_full_name', read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'buyer', 'buyer_name',
            'seller', 'seller_name', 'total_amount',
            'status', 'items_count', 'created_at'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()


class OrderDetailSerializer(serializers.ModelSerializer):
    # Buyer information - Direct from User model
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    buyer_email = serializers.EmailField(source='buyer.email', read_only=True)
    buyer_phone = serializers.CharField(source='buyer.phone_number', read_only=True, allow_null=True)
    buyer_address = serializers.CharField(source='buyer.address', read_only=True, allow_null=True)
    
    # Seller information - Just use first name as store name
    seller_name = serializers.SerializerMethodField()
    seller_email = serializers.EmailField(source='seller.email', read_only=True)
    seller_phone = serializers.CharField(source='seller.phone_number', read_only=True, allow_null=True)
    seller_address = serializers.SerializerMethodField()
    
    # Order items
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'buyer', 'seller',
            # Buyer details
            'buyer_name', 'buyer_email', 'buyer_phone', 'buyer_address',
            # Seller details
            'seller_name', 'seller_email', 'seller_phone', 'seller_address',
            # Order details
            'total_amount', 'status', 'qr_code_token',
            'qr_code_image', 'items', 'notes',
            'created_at', 'confirmed_at', 'completed_at'
        ]
    
    def get_seller_name(self, obj):
        """Just use first name as store name"""
        if obj.seller.first_name:
            return f"{obj.seller.first_name}'s Store"
        return f"{obj.seller.email.split('@')[0]}'s Store"
    
    def get_seller_address(self, obj):
        """Get seller's address"""
        if hasattr(obj.seller, 'seller_profile') and obj.seller.seller_profile.business_address:
            return obj.seller.seller_profile.business_address
        if obj.seller.address:
            return obj.seller.address
        return "Jos, Plateau State, Nigeria"


class CheckoutSerializer(serializers.Serializer):
    """Serializer for checkout process"""
    pass  # No input needed, uses cart items


class ConfirmOrderSerializer(serializers.Serializer):
    """Serializer for order confirmation via QR code"""
    qr_code_token = serializers.CharField(max_length=100)


class OrderQRCodeSerializer(serializers.Serializer):
    """Serializer for QR code upload after generation"""
    qr_code_image = serializers.URLField()