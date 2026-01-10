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
        if obj.product and obj.product.main_image:
            return obj.product.main_image
        return None


class OrderListSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    seller_name = serializers.CharField(source='seller.get_full_name', read_only=True)
    items_count = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    cancellation_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'buyer', 'buyer_name',
            'seller', 'seller_name', 'total_amount',
            'status', 'items_count', 'created_at',
            'is_cancelled', 'cancelled_at', 'can_cancel', 'cancellation_info'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()
    
    def get_can_cancel(self, obj):
        return obj.can_be_cancelled()

    def get_cancellation_info(self, obj):
        return obj.get_cancellation_info()


class OrderDetailSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    buyer_email = serializers.EmailField(source='buyer.email', read_only=True)
    buyer_phone = serializers.SerializerMethodField()
    buyer_address = serializers.SerializerMethodField()
    
    seller_info = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    can_cancel = serializers.SerializerMethodField()
    cancellation_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'buyer', 'seller',
            'buyer_name', 'buyer_email', 'buyer_phone', 'buyer_address',
            'seller_info',
            'total_amount', 'status', 'qr_code_token',
            'qr_code_image', 'items', 'notes',
            'created_at', 'confirmed_at', 'completed_at',
            'is_cancelled', 'cancelled_at', 'cancellation_reason', 
            'can_cancel', 'cancellation_info',
        ]
    
    def get_buyer_phone(self, obj):
        return getattr(obj.buyer, 'phone_number', None)
    
    def get_buyer_address(self, obj):
        return getattr(obj.buyer, 'address', None)
    
    def get_seller_info(self, obj):
        """Get seller information - simplified and safe version"""
        seller = obj.seller
        
        # Build store name
        if seller.first_name and seller.last_name:
            store_name = f"{seller.first_name} {seller.last_name}'s Store"
        elif seller.first_name:
            store_name = f"{seller.first_name}'s Store"
        else:
            store_name = f"{seller.email.split('@')[0]}'s Store"
        
        seller_data = {
            'id': seller.id,
            'email': seller.email,
            'store_name': store_name,
            'phone_number': getattr(seller, 'phone_number', None),
        }
        
        # Try to get location info safely
        try:
            # Default location
            location_data = {
                'store_name': store_name,
                'address': 'Jos, Plateau State, Nigeria',
                'city': 'Jos',
                'state': 'Plateau State',
                'phone_number': getattr(seller, 'phone_number', None),
                'is_primary': True
            }
            
            # Check if seller has profile
            if hasattr(seller, 'seller_profile'):
                profile = seller.seller_profile
                
                # Try to get business address from profile
                if hasattr(profile, 'business_address') and profile.business_address:
                    location_data['address'] = profile.business_address
                
                # Try to get city/state from profile
                if hasattr(profile, 'city') and profile.city:
                    location_data['city'] = profile.city
                
                if hasattr(profile, 'state') and profile.state:
                    location_data['state'] = profile.state
                
                # Try to get phone from profile
                if hasattr(profile, 'phone_number') and profile.phone_number:
                    location_data['phone_number'] = profile.phone_number
            
            # Fallback to user's address if available
            if not hasattr(seller, 'seller_profile') or not location_data['address']:
                user_address = getattr(seller, 'address', None)
                if user_address:
                    location_data['address'] = user_address
            
            seller_data['primary_location'] = location_data
            
        except Exception as e:
            # If anything fails, just provide basic info
            print(f"Warning: Could not get seller location info: {str(e)}")
            seller_data['primary_location'] = {
                'store_name': store_name,
                'address': 'Jos, Plateau State, Nigeria',
                'city': 'Jos',
                'state': 'Plateau State',
                'phone_number': getattr(seller, 'phone_number', None),
                'is_primary': True
            }
        
        return seller_data
    

    def get_can_cancel(self, obj):
        return obj.can_be_cancelled()

    def get_cancellation_info(self, obj):
        return obj.get_cancellation_info()
    


class CheckoutSerializer(serializers.Serializer):
    pass


class ConfirmOrderSerializer(serializers.Serializer):
    qr_code_token = serializers.CharField(max_length=100)


class OrderQRCodeSerializer(serializers.Serializer):
    qr_code_image = serializers.URLField()