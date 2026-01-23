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
    
    # NEW: Add payment status
    payment_status = serializers.SerializerMethodField()
    amount_due = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'buyer', 'buyer_name',
            'seller', 'seller_name', 'total_amount',
            'status', 'items_count', 'created_at',
            'is_cancelled', 'cancelled_at', 'can_cancel', 'cancellation_info',
            # NEW
            'payment_status', 'amount_due',
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()
    
    def get_can_cancel(self, obj):
        return obj.can_be_cancelled()

    def get_cancellation_info(self, obj):
        return obj.get_cancellation_info()
    
    def get_payment_status(self, obj):
        """Simple payment status for list view"""
        if obj.is_fully_paid:
            return 'PAID'
        if obj.is_overdue:
            return 'OVERDUE'
        if obj.is_in_grace_period:
            return 'GRACE_PERIOD'
        return 'ACTIVE'
    
    def get_amount_due(self, obj):
        """Total amount due (for list view)"""
        if obj.upfront_payment_status == 'PAID':
            obj.update_accrued_interest()
            return str(obj.total_amount_due)
        return '0.00'


class OrderDetailSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    buyer_email = serializers.EmailField(source='buyer.email', read_only=True)
    buyer_phone = serializers.SerializerMethodField()
    buyer_address = serializers.SerializerMethodField()
    
    seller_info = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    can_cancel = serializers.SerializerMethodField()
    cancellation_info = serializers.SerializerMethodField()
    
    # NEW: BNPL Fields
    loan_details = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    
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
            # NEW BNPL fields
            'loan_details', 'payment_status',
        ]
    
    def get_buyer_phone(self, obj):
        return getattr(obj.buyer, 'phone_number', None)
    
    def get_buyer_address(self, obj):
        return getattr(obj.buyer, 'address', None)
    
    def get_seller_info(self, obj):
        """Get seller information"""
        seller = obj.seller
        
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
        
        try:
            location_data = {
                'store_name': store_name,
                'address': 'Jos, Plateau State, Nigeria',
                'city': 'Jos',
                'state': 'Plateau State',
                'phone_number': getattr(seller, 'phone_number', None),
                'is_primary': True
            }
            
            if hasattr(seller, 'seller_profile'):
                profile = seller.seller_profile
                
                if hasattr(profile, 'business_address') and profile.business_address:
                    location_data['address'] = profile.business_address
                
                if hasattr(profile, 'city') and profile.city:
                    location_data['city'] = profile.city
                
                if hasattr(profile, 'state') and profile.state:
                    location_data['state'] = profile.state
                
                if hasattr(profile, 'phone_number') and profile.phone_number:
                    location_data['phone_number'] = profile.phone_number
            
            if not hasattr(seller, 'seller_profile') or not location_data['address']:
                user_address = getattr(seller, 'address', None)
                if user_address:
                    location_data['address'] = user_address
            
            seller_data['primary_location'] = location_data
            
        except Exception as e:
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
    
    # NEW METHODS
    def get_loan_details(self, obj):
    #   Only show loan details if upfront paid AND loan activated
        if obj.upfront_payment_status != 'PAID':
            return {
                'status': 'UPFRONT_PENDING',
                'message': '10% upfront payment required'
            }
        
        #   Check if loan is activated (seller confirmed)
        if not obj.loan_start_date:
            return {
                'status': 'PENDING_CONFIRMATION',
                'upfront_payment': str(obj.upfront_payment),
                'upfront_paid': True,
                'loan_amount': str(obj.loan_amount),
                'principal_amount': str(obj.principal_amount),
                'service_fee_estimate': str(obj.total_service_fee),
                'message': 'Waiting for seller to confirm order. Interest will start counting after confirmation.',
                'order_status': obj.status,
            }
        
        #   Loan is active - show full details
        # Update interest before returning
        obj.update_accrued_interest()
        
        return {
            'status': 'ACTIVE',
            
            # Payment breakdown
            'upfront_payment': str(obj.upfront_payment),
            'upfront_paid': obj.upfront_payment_status == 'PAID',
            'loan_amount': str(obj.loan_amount),
            'principal_amount': str(obj.principal_amount),
            
            # Interest details
            'service_fee_rate': str(obj.service_fee_rate),
            'total_service_fee_30_days': str(obj.total_service_fee),
            'daily_interest_rate': str(obj.daily_interest_rate),
            'accrued_interest': str(obj.accrued_interest),
            
            # Timeline
            'loan_start_date': obj.loan_start_date.isoformat() if obj.loan_start_date else None,
            'loan_due_date': obj.loan_due_date.isoformat() if obj.loan_due_date else None,
            'grace_period_end': obj.grace_period_end_date.isoformat() if obj.grace_period_end_date else None,
            'days_elapsed': obj.days_elapsed,
            'days_remaining': obj.days_remaining,
            'is_in_grace_period': obj.is_in_grace_period,
            'is_overdue': obj.is_overdue,
            
            # Payment status
            'principal_paid': str(obj.principal_paid),
            'interest_paid': str(obj.interest_paid),
            'remaining_principal': str(obj.remaining_principal),
            'total_amount_due': str(obj.total_amount_due),
            'is_fully_paid': obj.is_fully_paid,
            'last_payment_date': obj.last_payment_date.isoformat() if obj.last_payment_date else None,
        }


    
    def get_payment_status(self, obj):
        """Get user-friendly payment status"""
        #   Check if loan is even activated
        if not obj.loan_start_date:
            if obj.upfront_payment_status == 'PAID':
                return {
                    'status': 'PENDING_CONFIRMATION',
                    'message': f'Order is {obj.status}. Loan will activate when seller confirms.',
                    'color': 'blue'
                }
            else:
                return {
                    'status': 'UPFRONT_PENDING',
                    'message': '10% upfront payment required',
                    'color': 'orange'
                }
        
        #   Loan is active - check payment status
        if obj.is_fully_paid:
            return {
                'status': 'PAID',
                'message': 'Loan fully paid',
                'color': 'green'
            }
        
        if obj.is_overdue:
            return {
                'status': 'OVERDUE',
                'message': f'Payment overdue! Grace period ended. Credit bureau report pending.',
                'color': 'red'
            }
        
        if obj.is_in_grace_period:
            return {
                'status': 'GRACE_PERIOD',
                'message': f'In grace period. {obj.days_remaining} days before reporting.',
                'color': 'orange'
            }
        
        if obj.days_remaining <= 7:
            return {
                'status': 'DUE_SOON',
                'message': f'Payment due in {obj.days_remaining} days',
                'color': 'yellow'
            }
        
        return {
            'status': 'ACTIVE',
            'message': f'{obj.days_remaining} days remaining',
            'color': 'blue'
        }
    


class CheckoutSerializer(serializers.Serializer):
    pass


class ConfirmOrderSerializer(serializers.Serializer):
    qr_code_token = serializers.CharField(max_length=100)


class OrderQRCodeSerializer(serializers.Serializer):
    qr_code_image = serializers.URLField()