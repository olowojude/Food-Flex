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


# Cart Views
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_cart(request):
    """Get buyer's cart"""
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
    """Add product to cart - DOES NOT reduce stock"""
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
            
            # Check stock availability (but don't reduce it)
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
    """Update cart item quantity - DOES NOT affect stock"""
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
            
            # Check stock availability (but don't reduce it)
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
    """Remove item from cart - DOES NOT restore stock"""
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers can remove from cart'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        cart_item = CartItem.objects.get(id=item_id, cart__user=user)
        cart = cart_item.cart
        
        # Simply delete the cart item - no stock manipulation
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
    """Clear all items from cart - DOES NOT restore stock"""
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
    """
    Checkout and create order
    ⚠️ STOCK IS REDUCED HERE IMMEDIATELY - Prevents double purchases
    """
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
            
            # Verify stock for all items AND reduce stock immediately
            for cart_item in cart.items.all():
                # Refresh product data from DB to get latest stock
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
                
                # ✅ REDUCE STOCK IMMEDIATELY AT CHECKOUT
                success = cart_item.product.reduce_stock(cart_item.quantity)
                if not success:
                    # Rollback will happen automatically due to transaction.atomic()
                    return Response(
                        {
                            'error': f'Failed to reserve stock for {cart_item.product.name}',
                            'available': cart_item.product.stock_quantity
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Get seller (assume all products from same seller)
            first_item = cart.items.first()
            seller = first_item.product.seller
            
            # Create order
            order = Order.objects.create(
                buyer=user,
                seller=seller,
                total_amount=total_amount,
                status=Order.OrderStatus.PENDING
            )
            
            # Create order items (snapshot of products at order time)
            for cart_item in cart.items.all():
                OrderItem.objects.create(
                    order=order,
                    product=cart_item.product,
                    quantity=cart_item.quantity
                )
            
            # Deduct credit from buyer
            old_balance = credit_account.credit_balance
            credit_account.deduct_credit(total_amount)
            
            # Log credit transaction
            CreditTransaction.objects.create(
                credit_account=credit_account,
                transaction_type=CreditTransaction.TransactionType.PURCHASE,
                amount=total_amount,
                balance_before=old_balance,
                balance_after=credit_account.credit_balance,
                description=f"Purchase - Order {order.order_number}",
                reference=order.order_number
            )
            
            # Generate QR code
            qr_code_base64 = order.generate_qr_code()
            
            # Clear cart
            cart.clear()
            
            return Response(
                {
                    'message': 'Order placed successfully',
                    'order': OrderDetailSerializer(order).data,
                    'qr_code_base64': qr_code_base64
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


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def save_qr_code(request, order_id):
    """Save QR code image URL after frontend uploads to Cloudinary"""
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
def verify_qr_code(request):
    """Seller verifies QR code"""
    user = request.user
    
    if user.role != 'SELLER':
        return Response(
            {'error': 'Only sellers can verify orders'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = ConfirmOrderSerializer(data=request.data)
    
    if serializer.is_valid():
        qr_code_token = serializer.validated_data['qr_code_token']
        
        try:
            order = Order.objects.get(
                qr_code_token=qr_code_token,
                seller=user,
                status=Order.OrderStatus.PENDING
            )
            
            return Response(
                {
                    'message': 'QR code verified',
                    'order': OrderDetailSerializer(order).data
                },
                status=status.HTTP_200_OK
            )
            
        except Order.DoesNotExist:
            return Response(
                {'error': 'Invalid QR code or order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def confirm_order(request, order_id):
    """Seller confirms order after verification"""
    user = request.user
    
    if user.role != 'SELLER':
        return Response(
            {'error': 'Only sellers can confirm orders'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        with transaction.atomic():
            order = Order.objects.get(id=order_id, seller=user)
            
            # Confirm order (stock already reduced at checkout)
            order.confirm_order(user)
            
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def complete_order(request, order_id):
    """
    Seller completes order
    Stock was already reduced at checkout, just pay seller now
    """
    user = request.user
    
    if user.role != 'SELLER':
        return Response(
            {'error': 'Only sellers can complete orders'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        with transaction.atomic():
            order = Order.objects.get(id=order_id, seller=user)
            
            # Complete order (stock already reduced, just transfer earnings)
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
    """
    Unified view for orders - works for both buyers and sellers
    Automatically detects user role and returns appropriate orders
    """
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
    """
    Seller views their orders (backward compatibility)
    Now just redirects to my_orders which handles both roles
    """
    return my_orders(request)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def order_detail(request, order_id):
    """View order details"""
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
    """Admin views all orders"""
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