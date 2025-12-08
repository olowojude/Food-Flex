from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem, Product
from shop.serializers import ProductListSerializer
from accounts.serializers import UserProfileSerializer


class CartItemSerializer(serializers.ModelSerializer):
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
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_price',
            'quantity', 'subtotal'
        ]


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
    buyer = UserProfileSerializer(read_only=True)
    seller = UserProfileSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'buyer', 'seller',
            'total_amount', 'status', 'qr_code_token',
            'qr_code_image', 'items', 'notes',
            'created_at', 'confirmed_at', 'completed_at'
        ]


class CheckoutSerializer(serializers.Serializer):
    """Serializer for checkout process"""
    pass  # No input needed, uses cart items


class ConfirmOrderSerializer(serializers.Serializer):
    """Serializer for order confirmation via QR code"""
    qr_code_token = serializers.CharField(max_length=100)


class OrderQRCodeSerializer(serializers.Serializer):
    """Serializer for QR code upload after generation"""
    qr_code_image = serializers.URLField()


from shop.models import Product  # Import at bottom to avoid circular import