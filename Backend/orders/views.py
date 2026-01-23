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
from accounts.permissions import IsSeller, IsBuyer
import json
import qrcode
from io import BytesIO
import base64
from collections import defaultdict
from django.utils import timezone


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
                cart, _ = Cart.objects.get_or_create(user=user)
                
                cart_item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    product=product,
                    defaults={'quantity': quantity}
                )
                
                if not created:
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def checkout(request):
    """
    Step 1: Calculate BNPL breakdown and save to session
    """
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers can checkout'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        cart = Cart.objects.prefetch_related(
            'items__product__seller'
        ).get(user=user)
        
        if not cart.items.exists():
            return Response(
                {'error': 'Cart is empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Group cart items by seller
        items_by_seller = defaultdict(list)
        for item in cart.items.select_related('product__seller'):
            seller = item.product.seller
            items_by_seller[seller].append(item)
        
        # Calculate total amount
        total_amount = cart.subtotal
        
        # Calculate BNPL breakdown
        from decimal import Decimal
        upfront_amount = (total_amount * Decimal('0.10')).quantize(Decimal('0.01'))
        loan_amount = total_amount
        principal_amount = (total_amount * Decimal('0.90')).quantize(Decimal('0.01'))
        service_fee = (principal_amount * Decimal('0.085')).quantize(Decimal('0.01'))
        total_repayment = (principal_amount + service_fee).quantize(Decimal('0.01'))
        
        # Check credit availability
        credit_account = user.credit_account
        if not credit_account.can_purchase(loan_amount):
            return Response(
                {
                    'error': 'Insufficient credit limit',
                    'available_credit': float(credit_account.credit_balance),
                    'required': float(loan_amount),
                    'shortfall': float(loan_amount - credit_account.credit_balance)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check stock availability
        for seller, seller_items in items_by_seller.items():
            for cart_item in seller_items:
                product = cart_item.product
                product.refresh_from_db()
                
                if cart_item.quantity > product.stock_quantity:
                    return Response(
                        {
                            'error': f'Insufficient stock for {product.name}',
                            'available': product.stock_quantity,
                            'requested': cart_item.quantity
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        # Generate checkout session ID
        from django.utils.crypto import get_random_string
        checkout_session = get_random_string(64)
        
        # CRITICAL: Store in session
        session_data = {
            'session_id': checkout_session,
            'user_id': user.id,
            'total_amount': str(total_amount),
            'upfront_amount': str(upfront_amount),
            'created_at': timezone.now().isoformat(),
        }
        
        request.session['pending_checkout'] = session_data
        request.session.modified = True  # ✅ CRITICAL: Force save
        
    
        # Return payment breakdown
        return Response({
            'checkout_session': checkout_session,
            'breakdown': {
                'cart_total': float(total_amount),
                'upfront_payment': float(upfront_amount),
                'upfront_percentage': 10,
                'loan_amount': float(loan_amount),
                'principal_amount': float(principal_amount),
                'service_fee_rate': 8.5,
                'total_service_fee': float(service_fee),
                'service_fee_duration_days': 30,
                'total_repayment_due': float(total_repayment),
                'daily_interest_rate': 0.2833,
                'grace_period_days': 5
            },
            'message': 'Review payment breakdown and confirm to proceed',
        }, status=status.HTTP_200_OK)
        
    except Cart.DoesNotExist:
        return Response(
            {'error': 'Cart not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print(f"❌ Checkout error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def confirm_checkout(request):
    """
    Step 2: Confirm checkout after dummy payment
    NOTE: Loan is NOT activated here - only when seller confirms order
    """
    user = request.user
    checkout_session = request.data.get('checkout_session')
    payment_reference = request.data.get('payment_reference', 'DUMMY_PAYMENT')
    
    if not checkout_session:
        return Response(
            {'error': 'Checkout session is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verify session
    pending_checkout = request.session.get('pending_checkout')
    
    if not pending_checkout:
        return Response(
            {'error': 'Invalid or expired checkout session. Please try again.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate session ID
    if pending_checkout.get('session_id') != checkout_session:
        return Response(
            {'error': 'Invalid checkout session'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate user ID
    if pending_checkout.get('user_id') != user.id:
        return Response(
            {'error': 'Session belongs to different user'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        with transaction.atomic():
            cart = Cart.objects.prefetch_related(
                'items__product__seller'
            ).get(user=user)
            
            if not cart.items.exists():
                return Response(
                    {'error': 'Cart is empty'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Group cart items by seller
            items_by_seller = defaultdict(list)
            for item in cart.items.select_related('product__seller'):
                seller = item.product.seller
                items_by_seller[seller].append(item)
            
            total_amount = cart.subtotal
            credit_account = user.credit_account
            
            # Validate total matches session
            from decimal import Decimal
            session_total = Decimal(pending_checkout['total_amount'])
            if abs(total_amount - session_total) > Decimal('0.01'):
                return Response(
                    {'error': 'Cart total has changed. Please checkout again.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check credit again
            if not credit_account.can_purchase(total_amount):
                return Response(
                    {'error': 'Insufficient credit'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create orders for each seller
            created_orders = []
            order_ids = []
            
            for seller, seller_items in items_by_seller.items():
                order_total = sum(
                    item.product.price * item.quantity 
                    for item in seller_items
                )
                
                # Create order with BNPL fields
                order = Order.objects.create(
                    buyer=user,
                    seller=seller,
                    total_amount=order_total,
                    status=Order.OrderStatus.PENDING,
                    qr_code_token=checkout_session,
                    upfront_payment_reference=payment_reference
                )
                
                # Calculate loan details (but DON'T activate yet)
                order.calculate_loan_details()
                
                # Mark upfront as PAID (10% received)
                order.upfront_payment_status = 'PAID'
                
                # ✅ DON'T activate loan yet - wait for confirmation
                # order.activate_loan()  ← REMOVED
                
                order.save()
                
                # Create order items and reduce stock
                for cart_item in seller_items:
                    product = cart_item.product
                    product.refresh_from_db()
                    
                    if cart_item.quantity > product.stock_quantity:
                        raise Exception(
                            f'Insufficient stock for {product.name}'
                        )
                    
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=cart_item.quantity
                    )
                    
                    success = product.reduce_stock(cart_item.quantity)
                    if not success:
                        raise Exception(f'Failed to reserve stock for {product.name}')
                
                created_orders.append(order)
                order_ids.append(order.id)
            
            # Generate QR code
            qr_data_dict = {
                'buyer_id': user.id,
                'order_ids': order_ids,
                'checkout_session': checkout_session,
                'timestamp': timezone.now().isoformat()
            }
            
            qr_data_string = json.dumps(qr_data_dict)
            
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_data_string)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            qr_code_base64 = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"
            
            # Deduct FULL amount from credit
            old_balance = credit_account.credit_balance
            credit_account.deduct_credit(total_amount)
            
            # Record transaction
            CreditTransaction.objects.create(
                credit_account=credit_account,
                transaction_type=CreditTransaction.TransactionType.PURCHASE,
                amount=total_amount,
                balance_before=old_balance,
                balance_after=credit_account.credit_balance,
                description=f"BNPL Purchase - {len(created_orders)} order(s) - Pending confirmation (loan will activate upon seller confirmation)",
                reference=checkout_session
            )
            
            # Clear cart
            cart.clear()
            
            # Clear session
            if 'pending_checkout' in request.session:
                del request.session['pending_checkout']
                request.session.modified = True
            
            # Serialize orders
            from .serializers import OrderDetailSerializer
            serialized_orders = OrderDetailSerializer(created_orders, many=True).data
            
            return Response({
                'success': True,
                'message': f'Checkout successful! {len(created_orders)} order(s) created. Show QR code to seller to collect items.',
                'orders': serialized_orders,
                'order_count': len(created_orders),
                'order_ids': order_ids,
                'total_amount': float(total_amount),
                'qr_code_base64': qr_code_base64,
                'checkout_session': checkout_session,
                'payment_info': {
                    'upfront_paid': float(created_orders[0].upfront_payment) if created_orders else 0,
                    'total_loan': float(total_amount),
                    'principal_owed': float(created_orders[0].principal_amount) if created_orders else 0,
                    'service_fee_estimate': float(created_orders[0].total_service_fee) if created_orders else 0,
                    'loan_status': 'PENDING_CONFIRMATION',
                    'note': 'Interest will start counting when seller confirms your order'
                }
            }, status=status.HTTP_201_CREATED)
            
    except Cart.DoesNotExist:
        return Response(
            {'error': 'Cart not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
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
        # Parse QR data
        if isinstance(qr_data, str):
            try:
                data = json.loads(qr_data)
            except json.JSONDecodeError:
                return Response(
                    {'error': 'Invalid QR code format. Could not parse JSON.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif isinstance(qr_data, dict):
            data = qr_data
        else:
            return Response(
                {'error': 'Invalid QR code data type'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extract required fields
        buyer_id = data.get('buyer_id')
        order_ids = data.get('order_ids', [])
        checkout_session = data.get('checkout_session')
        
        # Validate required fields
        if not buyer_id or not order_ids or not checkout_session:
            missing = []
            if not buyer_id:
                missing.append('buyer_id')
            if not order_ids:
                missing.append('order_ids')
            if not checkout_session:
                missing.append('checkout_session')
            
            return Response(
                {
                    'error': 'Invalid QR code. Missing order information.',
                    'missing_fields': missing
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure order_ids is a list
        if not isinstance(order_ids, list):
            order_ids = [order_ids]
        
        # Find orders belonging to this seller
        seller_orders = Order.objects.filter(
            id__in=order_ids,
            seller=request.user,
            qr_code_token=checkout_session
        ).prefetch_related('items__product')
        
        if not seller_orders.exists():
            return Response(
                {
                    'error': 'No orders found',
                    'message': 'This QR code has no orders for your store.'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get first pending order
        pending_orders = seller_orders.filter(status=Order.OrderStatus.PENDING)
        
        if not pending_orders.exists():
            return Response(
                {
                    'error': 'Orders already processed',
                    'message': 'All orders from this QR code have been processed.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order = pending_orders.first()
        
        # Generate OTP
        otp_code = order.generate_otp()
        
        # Prepare order items
        items = []
        for item in order.items.all():
            items.append({
                'id': item.id,
                'product_name': item.product_name,
                'product_price': str(item.product_price),
                'quantity': item.quantity,
                'subtotal': str(item.subtotal),
                'product_image': item.product.main_image if item.product else None
            })
        
        # Prepare buyer info
        buyer_info = {
            'id': order.buyer.id,
            'name': order.buyer.get_full_name(),
            'email': order.buyer.email,
            'phone': getattr(order.buyer, 'phone_number', None)
        }
        
        return Response({
            'success': True,
            'order': {
                'id': order.id,
                'order_number': order.order_number,
                'total_amount': str(order.total_amount),
                'status': order.status,
                'items': items,
                'created_at': order.created_at.isoformat()
            },
            'buyer': buyer_info,
            'otp_generated': True,
            'otp_expires_in_seconds': order.get_otp_time_remaining(),
            'message': 'QR code verified! Ask buyer for the 6-digit OTP code.'
        }, status=status.HTTP_200_OK)
        
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
            
            order.confirm_order(user)
            order.clear_otp()
            
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
        
        if not order.otp_code:
            return Response(
                {
                    'has_otp': False,
                    'message': 'No OTP generated yet. Seller needs to scan your QR code first.'
                },
                status=status.HTTP_200_OK
            )
        
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
        
        if order.otp_verified:
            return Response(
                {
                    'has_otp': False,
                    'verified': True,
                    'message': 'OTP already used. Order is being processed.'
                },
                status=status.HTTP_200_OK
            )
        
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



from django.shortcuts import get_object_or_404

@api_view(['POST'])
@permission_classes([IsBuyer])
def cancel_order(request, order_id):
    """
    Cancel a pending order and refund credit to buyer.
    Only the buyer can cancel their own pending orders.
    """
    user = request.user
    
    order = get_object_or_404(Order, id=order_id)
    
    # Check if user is the buyer
    if order.buyer != user:
        return Response(
            {'error': 'You can only cancel your own orders.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Check if order can be cancelled
    if not order.can_be_cancelled():
        return Response(
            {
                'error': 'This order cannot be cancelled.',
                'reason': 'Only pending orders can be cancelled.',
                'current_status': order.status
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get cancellation reason from request
    reason = request.data.get('reason', '')
    
    # Cancel the order
    success, message, refunded_amount = order.cancel_order_by_buyer(user, reason)
    
    if success:
        serializer = OrderDetailSerializer(order)
        return Response(
            {
                'success': True,
                'message': message,
                'order': serializer.data,
                'refunded_amount': refunded_amount
            },
            status=status.HTTP_200_OK
        )
    else:
        return Response(
            {'error': message},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_orders(request):
    user = request.user
    
    if user.role == 'BUYER':
        orders = Order.objects.filter(buyer=user)
    elif user.role == 'SELLER':
        orders = Order.objects.filter(seller=user)
    elif user.is_admin_user:
        orders = Order.objects.all()
    else:
        return Response(
            {'error': 'Invalid user role'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    orders = orders.select_related('seller', 'buyer').prefetch_related('items__product').order_by('-created_at')
    
    order_status = request.query_params.get('status')
    if order_status:
        orders = orders.filter(status=order_status.upper())
    
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def seller_orders(request):
    return my_orders(request)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def order_detail(request, order_id):
    user = request.user
    
    try:
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def all_orders(request):
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can view all orders'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    orders = Order.objects.all()
    
    order_status = request.query_params.get('status')
    if order_status:
        orders = orders.filter(status=order_status)
    
    paginator = PageNumberPagination()
    paginator.page_size = 20
    paginated_orders = paginator.paginate_queryset(orders, request)
    
    serializer = OrderListSerializer(paginated_orders, many=True)
    return paginator.get_paginated_response(serializer.data)