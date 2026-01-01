from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db import transaction
from .models import Cart, CartItem, Order, OrderItem
from shop.models import Product
from credits.models import CreditAccount, CreditTransaction
from .serializers import (
    CartSerializer, CartItemSerializer, AddToCartSerializer,
    UpdateCartItemSerializer, OrderListSerializer, OrderDetailSerializer,
    ConfirmOrderSerializer, OrderQRCodeSerializer
)
from accounts.permissions import IsSeller
import json
import qrcode
from io import BytesIO
import base64
from django.db import transaction



# Cart Views
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_cart(request):
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers have carts'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get or create cart
    cart, created = Cart.objects.get_or_create(user=user)
    serializer = CartSerializer(cart)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_to_cart(request):
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers can add to cart'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = AddToCartSerializer(data=request.data)
    
    if serializer.is_valid():
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']
        
        try:
            product = Product.objects.get(id=product_id, is_active=True)
            
            if quantity > product.stock_quantity:
                return Response(
                    {'error': f'Only {product.stock_quantity} units available'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                # Get or create cart
                cart, _ = Cart.objects.get_or_create(user=user)
                
                # Check if item already in cart
                cart_item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    product=product,
                    defaults={'quantity': quantity}
                )
                
                if not created:
                    # Update quantity
                    new_quantity = cart_item.quantity + quantity
                    if new_quantity > product.stock_quantity:
                        return Response(
                            {'error': f'Cannot add more. Only {product.stock_quantity} units available'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    cart_item.quantity = new_quantity
                    cart_item.save()
            
            return Response(
                {
                    'message': 'Product added to cart',
                    'cart': CartSerializer(cart).data
                },
                status=status.HTTP_200_OK
            )
            
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_cart_item(request, item_id):
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers can update cart'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = UpdateCartItemSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            cart_item = CartItem.objects.get(id=item_id, cart__user=user)
            quantity = serializer.validated_data['quantity']
            
            if quantity > cart_item.product.stock_quantity:
                return Response(
                    {'error': f'Only {cart_item.product.stock_quantity} units available'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            cart_item.quantity = quantity
            cart_item.save()
            
            return Response(
                {
                    'message': 'Cart item updated',
                    'cart': CartSerializer(cart_item.cart).data
                },
                status=status.HTTP_200_OK
            )
            
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Cart item not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def remove_from_cart(request, item_id):
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers can remove from cart'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        cart_item = CartItem.objects.get(id=item_id, cart__user=user)
        cart = cart_item.cart
        
        cart_item.delete()
        
        return Response(
            {
                'message': 'Item removed from cart',
                'cart': CartSerializer(cart).data
            },
            status=status.HTTP_200_OK
        )
        
    except CartItem.DoesNotExist:
        return Response(
            {'error': 'Cart item not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def clear_cart(request):
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers can clear cart'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        cart = Cart.objects.get(user=user)
        cart.clear()
        
        return Response(
            {'message': 'Cart cleared successfully'},
            status=status.HTTP_200_OK
        )
        
    except Cart.DoesNotExist:
        return Response(
            {'error': 'Cart not found'},
            status=status.HTTP_404_NOT_FOUND
        )



# Order Views
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def checkout(request):
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers can checkout'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        with transaction.atomic():
            # Get cart
            cart = Cart.objects.get(user=user)
            
            if not cart.items.exists():
                return Response(
                    {'error': 'Cart is empty'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Calculate total
            total_amount = cart.subtotal
            
            # Get credit account
            credit_account = user.credit_account
            
            # Check if user can purchase
            if not credit_account.can_purchase(total_amount):
                return Response(
                    {
                        'error': 'Insufficient credit',
                        'available_credit': float(credit_account.credit_balance),
                        'required': float(total_amount)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            for cart_item in cart.items.all():
                cart_item.product.refresh_from_db()
                
                if cart_item.quantity > cart_item.product.stock_quantity:
                    return Response(
                        {
                            'error': f'Insufficient stock for {cart_item.product.name}',
                            'available': cart_item.product.stock_quantity,
                            'requested': cart_item.quantity
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                success = cart_item.product.reduce_stock(cart_item.quantity)
                if not success:
                    return Response(
                        {
                            'error': f'Failed to reserve stock for {cart_item.product.name}',
                            'available': cart_item.product.stock_quantity
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            first_item = cart.items.first()
            seller = first_item.product.seller
            
            order = Order.objects.create(
                buyer=user,
                seller=seller,
                total_amount=total_amount,
                status=Order.OrderStatus.PENDING
            )
            
            for cart_item in cart.items.all():
                OrderItem.objects.create(
                    order=order,
                    product=cart_item.product,
                    quantity=cart_item.quantity
                )
            
            old_balance = credit_account.credit_balance
            credit_account.deduct_credit(total_amount)
            
            CreditTransaction.objects.create(
                credit_account=credit_account,
                transaction_type=CreditTransaction.TransactionType.PURCHASE,
                amount=total_amount,
                balance_before=old_balance,
                balance_after=credit_account.credit_balance,
                description=f"Purchase - Order {order.order_number}",
                reference=order.order_number
            )
            
            # Generate QR code with order information
            qr_data = json.dumps({
                'order_id': order.id,
                'order_number': order.order_number,
                'total_amount': str(order.total_amount),
                'buyer_id': user.id,
                'seller_id': seller.id
            })
            
            # Create QR code image
            qr = qrcode.QRCode(
                version=1, 
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,  
                border=4,  
            )
            qr.add_data(qr_data)
            qr.make(fit=True)
            
            # Generate image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            qr_code_base64 = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"
            
            # order.qr_code_token = qr_data  # Store the raw data
            order.save()
            
            # Clear cart
            cart.clear()
            
            return Response(
                {
                    'message': 'Order placed successfully',
                    'order': OrderDetailSerializer(order).data,
                    'qr_code_base64': qr_code_base64  # This is what frontend needs
                },
                status=status.HTTP_201_CREATED
            )
            
    except Cart.DoesNotExist:
        return Response(
            {'error': 'Cart not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    

@api_view(['POST'])
@permission_classes([IsSeller])
def verify_qr_code(request):
    qr_data = request.data.get('qr_data')
    
    if not qr_data:
        return Response(
            {'error': 'QR code data is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        try:
            data = json.loads(qr_data)
            order_id = data.get('order_id')
            order_number = data.get('order_number')
        except (json.JSONDecodeError, AttributeError):
            order_number = qr_data
            order_id = None
        
        # Find the order
        if order_id:
            order = Order.objects.get(id=order_id, seller=request.user)
        elif order_number:
            order = Order.objects.get(order_number=order_number, seller=request.user)
        else:
            raise Order.DoesNotExist
        
        # Check if order is in correct status
        if order.status not in ['PENDING', 'CONFIRMED']:
            return Response(
                {'error': f'This order is already {order.status}. Cannot scan again.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        otp_code = order.generate_otp()

        # Return order details
        return Response({
            'id': order.id,
            'order_number': order.order_number,
            'status': order.status,
            'buyer_name': order.buyer.get_full_name(),
            'buyer_email': order.buyer.email,
            'total_amount': str(order.total_amount),
            'items_count': order.items.count(),
            'otp_generated': True, 
            'message': 'QR code verified. OTP sent to buyer. Ask buyer for OTP code.'
        }, status=status.HTTP_200_OK)
        
    except Order.DoesNotExist:
        return Response(
            {'error': 'Invalid QR code or order not found for your store'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to verify QR code: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def save_qr_code(request, order_id):
    serializer = OrderQRCodeSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            order = Order.objects.get(id=order_id, buyer=request.user)
            order.qr_code_image = serializer.validated_data['qr_code_image']
            order.save()
            
            return Response(
                {'message': 'QR code saved successfully'},
                status=status.HTTP_200_OK
            )
            
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def confirm_order(request, order_id):
    user = request.user
    
    if user.role != 'SELLER':
        return Response(
            {'error': 'Only sellers can confirm orders'},
            status=status.HTTP_403_FORBIDDEN
        )
    
        # Get OTP from request
    otp_code = request.data.get('otp_code')
    
    if not otp_code:
        return Response(
            {'error': 'OTP code is required to confirm order'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        with transaction.atomic():
            order = Order.objects.get(id=order_id, seller=user)
            
            success, message = order.verify_otp(otp_code)
            
            if not success:
                return Response(
                    {'error': message},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # OTP verified! Now confirm the order
            order.confirm_order(user)
            
            # Clear OTP after successful confirmation
            order.clear_otp()
            
            from .serializers import OrderDetailSerializer
            
            return Response(
                {
                    'message': 'Order confirmed successfully',
                    'order': OrderDetailSerializer(order).data
                },
                status=status.HTTP_200_OK
            )
            
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_buyer_otp(request, order_id):
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers can view OTP'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        order = Order.objects.get(id=order_id, buyer=user)
        
        # Check if OTP exists and not expired
        if not order.otp_code:
            return Response(
                {
                    'has_otp': False,
                    'message': 'No OTP generated yet. Seller needs to scan your QR code first.'
                },
                status=status.HTTP_200_OK
            )
        
        # Check if expired
        time_remaining = order.get_otp_time_remaining()
        if time_remaining <= 0:
            return Response(
                {
                    'has_otp': False,
                    'expired': True,
                    'message': 'OTP has expired. Ask seller to scan QR code again.'
                },
                status=status.HTTP_200_OK
            )
        
        # Check if already used
        if order.otp_verified:
            return Response(
                {
                    'has_otp': False,
                    'verified': True,
                    'message': 'OTP already used. Order is being processed.'
                },
                status=status.HTTP_200_OK
            )
        
        # Return valid OTP
        return Response(
            {
                'has_otp': True,
                'otp_code': order.otp_code,
                'time_remaining': time_remaining,
                'expires_at': order.otp_expires_at,
                'message': 'Share this code with the seller to collect your order.'
            },
            status=status.HTTP_200_OK
        )
        
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def complete_order(request, order_id):
    user = request.user
    
    if user.role != 'SELLER':
        return Response(
            {'error': 'Only sellers can complete orders'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        with transaction.atomic():
            order = Order.objects.get(id=order_id, seller=user)
            
            # Complete order
            order.complete_order()
            
            return Response(
                {
                    'message': 'Order completed successfully',
                    'order': OrderDetailSerializer(order).data
                },
                status=status.HTTP_200_OK
            )
            
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_orders(request):
    user = request.user
    
    # Determine which orders to fetch based on role
    if user.role == 'BUYER':
        orders = Order.objects.filter(buyer=user).select_related('seller', 'buyer').prefetch_related('items__product')
    elif user.role == 'SELLER':
        orders = Order.objects.filter(seller=user).select_related('seller', 'buyer').prefetch_related('items__product')
    elif user.is_admin_user:
        orders = Order.objects.all().select_related('seller', 'buyer').prefetch_related('items__product')
    else:
        return Response(
            {'error': 'Invalid user role'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Order by newest first
    orders = orders.order_by('-created_at')
    
    # Filter by status if provided
    order_status = request.query_params.get('status')
    if order_status:
        orders = orders.filter(status=order_status.upper())
    
    # Pagination
    paginator = PageNumberPagination()
    paginator.page_size = 20
    paginated_orders = paginator.paginate_queryset(orders, request)
    
    if paginated_orders is not None:
        serializer = OrderListSerializer(paginated_orders, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = OrderListSerializer(orders, many=True)
    return Response({
        'count': orders.count(),
        'results': serializer.data
    }, status=status.HTTP_200_OK)


# Keep seller_orders for backward compatibility, but make it use my_orders logic
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def seller_orders(request):
    return my_orders(request)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def order_detail(request, order_id):
    user = request.user
    
    try:
        # Users can only view their own orders
        if user.role == 'BUYER':
            order = Order.objects.get(id=order_id, buyer=user)
        elif user.role == 'SELLER':
            order = Order.objects.get(id=order_id, seller=user)
        elif user.is_admin_user:
            order = Order.objects.get(id=order_id)
        else:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = OrderDetailSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND
        )


# Admin Views
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def all_orders(request):
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can view all orders'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    orders = Order.objects.all()
    
    # Filter by status
    order_status = request.query_params.get('status')
    if order_status:
        orders = orders.filter(status=order_status)
    
    # Pagination
    paginator = PageNumberPagination()
    paginator.page_size = 20
    paginated_orders = paginator.paginate_queryset(orders, request)
    
    serializer = OrderListSerializer(paginated_orders, many=True)
    return paginator.get_paginated_response(serializer.data)