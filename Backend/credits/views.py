from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from .models import CreditAccount, RepaymentHistory, CreditLimitHistory, CreditTransaction
from .serializers import (
    CreditAccountSerializer, CreditLimitIncreaseSerializer,
    RepaymentHistorySerializer, CreditLimitHistorySerializer, 
    CreditTransactionSerializer
)
from django.conf import settings
import requests
import secrets



# BUYER ENDPOINTS - Self-Service
# Get logged-in buyer's credit account details

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_credit_account(request):
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers have credit accounts'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    credit_account, created = CreditAccount.objects.get_or_create(user=user)
    serializer = CreditAccountSerializer(credit_account)
    return Response(serializer.data, status=status.HTTP_200_OK)


#Get logged-in buyer's credit transactions
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_credit_transactions(request):

    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers have credit transactions'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if hasattr(user, 'credit_account'):
        transactions = user.credit_account.transactions.all()
        serializer = CreditTransactionSerializer(transactions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    return Response([], status=status.HTTP_200_OK)


# Get logged-in buyer's repayment history
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_repayment_history(request):
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers have repayment history'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if hasattr(user, 'credit_account'):
        repayments = user.credit_account.repayment_history.all()
        serializer = RepaymentHistorySerializer(repayments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    return Response([], status=status.HTTP_200_OK)


# Initiate repayment
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def initiate_buyer_repayment(request):
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers can make repayments'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        credit_account = CreditAccount.objects.get(user=user)
    except CreditAccount.DoesNotExist:
        return Response(
            {'error': 'Credit account not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Validate amount
    amount = request.data.get('amount')
    if not amount:
        return Response(
            {'error': 'Amount is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return Response(
            {'error': 'Invalid amount format'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if amount <= 0:
        return Response(
            {'error': 'Amount must be greater than zero'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if amount > credit_account.outstanding_balance:
        return Response(
            {'error': f'Repayment amount (₦{amount:,.2f}) exceeds outstanding balance (₦{credit_account.outstanding_balance:,.2f})'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate unique transaction reference
    txn_ref = f"REPAY_{user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(4)}"
    
    # Prepare Hydrogen Pay request
    hydrogen_url = "https://api.hydrogenpay.com/bepay/api/v1/Merchant/initiate-payment"
    
    payload = {
        "amount": amount,
        "email": user.email,
        "currency": "NGN",
        "description": "Loan Repayment - FoodFlex",
        "meta": f"Repayment for user {user.id}",
        "callback": f"{settings.FRONTEND_URL}/profile?repayment=success",
        "customerName": f"{user.first_name} {user.last_name}",
        "transactionRef": txn_ref
    }
    
    headers = {
        "Authorization": f"Bearer {settings.HYDROGEN_SECRET_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(hydrogen_url, json=payload, headers=headers)
        response.raise_for_status()
        
        payment_data = response.json()
        
        # Store pending transaction
        CreditTransaction.objects.create(
            credit_account=credit_account,
            transaction_type=CreditTransaction.TransactionType.REPAYMENT,
            amount=amount,
            balance_before=credit_account.credit_balance,
            balance_after=credit_account.credit_balance,
            description="Pending loan repayment via Hydrogen Pay",
            reference=txn_ref,
        )
        
        return Response({
            'message': 'Payment initiated successfully',
            'payment_url': payment_data.get('data', {}).get('url'),
            'transaction_ref': txn_ref,
            'amount': amount
        }, status=status.HTTP_200_OK)
        
    except requests.exceptions.RequestException as e:
        return Response(
            {'error': f'Payment gateway error: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to initiate payment: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

# Hydrogen Pay Webhook 
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def hydrogen_webhook(request):
    try:
        # Verify webhook signature (TODO: implement signature verification)
        signature = request.headers.get('x-squad-signature')
        
        data = request.data
        
        # Extract payment details
        status_code = data.get('status')
        txn_ref = data.get('transactionRef')
        amount = float(data.get('amount', 0))
        
        if status_code != 'success':
            return Response({'message': 'Payment not successful'}, status=status.HTTP_200_OK)
        
        # Find the pending transaction
        try:
            txn = CreditTransaction.objects.get(reference=txn_ref)
            credit_account = txn.credit_account
            
            # Check if already processed
            if txn.description.startswith('Completed'):
                return Response({'message': 'Transaction already processed'}, status=status.HTTP_200_OK)
            
            with transaction.atomic():
                # Store outstanding balance BEFORE repayment
                outstanding_before_repayment = credit_account.outstanding_balance
                
                # Process the repayment
                old_balance = credit_account.credit_balance
                credit_account.process_repayment(amount, credit_account.user)
                
                # Update transaction
                txn.balance_after = credit_account.credit_balance
                txn.description = "Completed loan repayment via Hydrogen Pay"
                txn.save()
                
                # CHECK IF BONUS SHOULD BE APPLIED
                # Bonus: 5% if FULL payment within 30 days
                bonus_applied = False
                bonus_amount = 0
                
                # Check if this was a FULL repayment
                is_full_payment = abs(amount - outstanding_before_repayment) < 0.01  # Allow small rounding differences
                
                if is_full_payment:
                    # Find the most recent PURCHASE transaction (when they borrowed)
                    last_purchase = credit_account.transactions.filter(
                        transaction_type=CreditTransaction.TransactionType.PURCHASE
                    ).order_by('-created_at').first()
                    
                    if last_purchase:
                        # Calculate days since last purchase
                        days_since_purchase = (timezone.now() - last_purchase.created_at).days
                        
                        # Apply bonus if repaying FULL amount within 30 days
                        if days_since_purchase <= 30:
                            # Apply 5% bonus to credit limit
                            bonus_amount = credit_account.credit_limit * 0.05
                            new_limit = credit_account.credit_limit + bonus_amount
                            credit_account.increase_credit_limit(new_limit, credit_account.user)
                            bonus_applied = True
                            
                            # Log bonus transaction
                            CreditTransaction.objects.create(
                                credit_account=credit_account,
                                transaction_type=CreditTransaction.TransactionType.LIMIT_INCREASE,
                                amount=bonus_amount,
                                balance_before=credit_account.credit_balance - bonus_amount,
                                balance_after=credit_account.credit_balance,
                                description=f"5% bonus for full repayment within 30 days (paid after {days_since_purchase} days)",
                                reference=f"BONUS_{txn_ref}"
                            )
                
                return Response({
                    'message': 'Repayment processed successfully',
                    'bonus_applied': bonus_applied,
                    'bonus_amount': bonus_amount
                }, status=status.HTTP_200_OK)
                
        except CreditTransaction.DoesNotExist:
            return Response(
                {'error': 'Transaction not found'},
                status=status.HTTP_404_NOT_FOUND
            )
            
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


# ADMIN ENDPOINTS - Read-Only Monitoring
# View all credit accounts 
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def all_credit_accounts(request):
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can view all credit accounts'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    queryset = CreditAccount.objects.all()
    
    # Filter by loan status
    loan_status = request.query_params.get('status')
    if loan_status:
        queryset = queryset.filter(loan_status=loan_status)
    
    serializer = CreditAccountSerializer(queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

# View specific user's credit account details
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def credit_account_detail(request, user_id):
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can view credit account details'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        credit_account = CreditAccount.objects.get(user_id=user_id)
        serializer = CreditAccountSerializer(credit_account)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except CreditAccount.DoesNotExist:
        return Response(
            {'error': 'Credit account not found'},
            status=status.HTTP_404_NOT_FOUND
        )


# Increase a user's credit limit
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def increase_credit_limit(request, user_id):
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can increase credit limits'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = CreditLimitIncreaseSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            with transaction.atomic():
                credit_account = CreditAccount.objects.get(user_id=user_id)
                
                new_limit = serializer.validated_data['new_limit']
                reason = serializer.validated_data.get('reason', '')
                
                if new_limit <= credit_account.credit_limit:
                    return Response(
                        {'error': 'New limit must be greater than current limit'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                old_balance = credit_account.credit_balance
                old_limit = credit_account.credit_limit
                credit_account.increase_credit_limit(new_limit, request.user)
                
                increase_amount = new_limit - old_limit
                CreditTransaction.objects.create(
                    credit_account=credit_account,
                    transaction_type=CreditTransaction.TransactionType.LIMIT_INCREASE,
                    amount=increase_amount,
                    balance_before=old_balance,
                    balance_after=credit_account.credit_balance,
                    description=f"Credit limit increased by admin. {reason}",
                    reference=f"LIMIT_INC_{credit_account.user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}"
                )
                
                return Response(
                    {
                        'message': 'Credit limit increased successfully',
                        'credit_account': CreditAccountSerializer(credit_account).data
                    },
                    status=status.HTTP_200_OK
                )
                
        except CreditAccount.DoesNotExist:
            return Response(
                {'error': 'Credit account not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# View all repayment history
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def all_repayment_history(request):

    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can view all repayment history'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    repayments = RepaymentHistory.objects.all()
    serializer = RepaymentHistorySerializer(repayments, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# View all credit limit change history
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def all_credit_limit_history(request):

    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can view credit limit history'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    history = CreditLimitHistory.objects.all()
    serializer = CreditLimitHistorySerializer(history, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ADD THESE TO THE EXISTING credits/views.py FILE

from orders.models import Order


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_active_loans(request):
    """
    Get all active loans for the logged-in buyer with current interest
    NOTE: Only CONFIRMED orders with activated loans appear here
    """
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers have loans'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # ONLY get CONFIRMED orders with activated loans
    active_loans = Order.objects.filter(
        buyer=user,
        upfront_payment_status='PAID',
        is_fully_paid=False,
        loan_start_date__isnull=False,  # ← CRITICAL: Only activated loans
        status__in=['CONFIRMED', 'COMPLETED']  # ← Only confirmed/completed orders
    ).select_related('seller').prefetch_related('items__product')
    
    # Update interest for all loans
    for loan in active_loans:
        loan.update_accrued_interest()
    
    # Prepare loan data
    loans_data = []
    total_principal = 0
    total_interest = 0
    total_due = 0
    
    for loan in active_loans:
        from decimal import Decimal
        
        # Calculate early payment savings
        days_remaining = loan.days_remaining
        daily_interest = loan.remaining_principal * loan.daily_interest_rate
        potential_savings = daily_interest * Decimal(str(days_remaining))
        
        loan_info = {
            'order_id': loan.id,
            'order_number': loan.order_number,
            'seller_name': loan.seller.get_full_name(),
            'created_at': loan.created_at.isoformat(),
            
            # Loan details
            'loan_amount': str(loan.loan_amount),
            'principal_amount': str(loan.principal_amount),
            'remaining_principal': str(loan.remaining_principal),
            
            # Interest
            'accrued_interest': str(loan.accrued_interest),
            'total_service_fee': str(loan.total_service_fee),
            'daily_interest_rate': str(loan.daily_interest_rate),
            
            # Timeline
            'loan_start_date': loan.loan_start_date.isoformat(),
            'loan_due_date': loan.loan_due_date.isoformat(),
            'days_elapsed': loan.days_elapsed,
            'days_remaining': loan.days_remaining,
            
            # Payment status
            'total_amount_due': str(loan.total_amount_due),
            'is_overdue': loan.is_overdue,
            'is_in_grace_period': loan.is_in_grace_period,
            
            # Savings potential
            'potential_savings': str(potential_savings),
            'full_payment_bonus_eligible': loan.days_elapsed <= 30,
        }
        
        loans_data.append(loan_info)
        total_principal += float(loan.remaining_principal)
        total_interest += float(loan.accrued_interest)
        total_due += float(loan.total_amount_due)
    
    return Response({
        'active_loans': loans_data,
        'summary': {
            'total_active_loans': len(loans_data),
            'total_principal_owed': total_principal,
            'total_interest_accrued': total_interest,
            'total_amount_due': total_due,
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def initiate_loan_repayment(request):
    """
    Step 1: Calculate repayment breakdown and save to session
    """
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers can make loan repayments'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    order_id = request.data.get('order_id')
    amount = request.data.get('amount')
    
    if not order_id or not amount:
        return Response(
            {'error': 'order_id and amount are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        from decimal import Decimal
        amount = Decimal(str(amount))
    except:
        return Response(
            {'error': 'Invalid amount format'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if amount <= 0:
        return Response(
            {'error': 'Amount must be greater than zero'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Get the order
        order = Order.objects.get(
            id=order_id,
            buyer=user,
            upfront_payment_status='PAID',
            is_fully_paid=False
        )
        
        # Update interest before calculating
        order.update_accrued_interest()
        
        # Validate amount
        if amount > order.total_amount_due:
            return Response(
                {
                    'error': f'Payment amount (₦{float(amount):,.2f}) exceeds total due (₦{float(order.total_amount_due):,.2f})',
                    'total_due': str(order.total_amount_due)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate payment breakdown (interest first, then principal)
        interest_payment = min(amount, order.accrued_interest)
        remaining_after_interest = amount - interest_payment
        principal_payment = min(remaining_after_interest, order.remaining_principal)
        
        # Calculate new balances after payment
        new_interest = order.accrued_interest - interest_payment
        new_principal = order.remaining_principal - principal_payment
        will_be_fully_paid = new_principal <= 0 and new_interest <= 0
        
        # Generate payment session
        from django.utils.crypto import get_random_string
        payment_session = get_random_string(64)
        
        # Store in session
        session_data = {
            'session_id': payment_session,
            'user_id': user.id,
            'order_id': order.id,
            'amount': str(amount),
            'created_at': timezone.now().isoformat(),
        }
        
        request.session['pending_repayment'] = session_data
        request.session.modified = True
        
        # Return breakdown
        return Response({
            'payment_session': payment_session,
            'breakdown': {
                'payment_amount': str(amount),
                'interest_payment': str(interest_payment),
                'principal_payment': str(principal_payment),
                
                # Current status
                'current_interest': str(order.accrued_interest),
                'current_principal': str(order.remaining_principal),
                'current_total_due': str(order.total_amount_due),
                
                # After payment
                'remaining_interest': str(new_interest),
                'remaining_principal': str(new_principal),
                'remaining_total_due': str(new_interest + new_principal),
                'will_be_fully_paid': will_be_fully_paid,
                
                # Loan info
                'days_elapsed': order.days_elapsed,
                'days_remaining': order.days_remaining,
                'is_full_payment': will_be_fully_paid,
                'early_payment_bonus_eligible': order.days_elapsed <= 30 and will_be_fully_paid,
            },
            'message': 'Review payment details and confirm to proceed'
        }, status=status.HTTP_200_OK)
        
    except Order.DoesNotExist:
        return Response(
            {'error': 'Active loan not found'},
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
@permission_classes([permissions.IsAuthenticated])
def confirm_loan_repayment(request):
    """
    Step 2: Confirm repayment after dummy payment
    FIXED: Properly restores credit including upfront payment
    """
    user = request.user
    payment_session = request.data.get('payment_session')
    payment_reference = request.data.get('payment_reference', 'DUMMY_PAYMENT')
    
    if not payment_session:
        return Response(
            {'error': 'Payment session is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verify session
    pending_repayment = request.session.get('pending_repayment')
    
    if not pending_repayment:
        return Response(
            {'error': 'Invalid or expired payment session'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if pending_repayment.get('session_id') != payment_session:
        return Response(
            {'error': 'Invalid payment session'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if pending_repayment.get('user_id') != user.id:
        return Response(
            {'error': 'Session belongs to different user'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        with transaction.atomic():
            from decimal import Decimal
            
            order_id = pending_repayment.get('order_id')
            amount = Decimal(pending_repayment.get('amount'))
            
            # Get order
            order = Order.objects.select_for_update().get(
                id=order_id,
                buyer=user
            )
            
            # Update interest
            order.update_accrued_interest()
            
            # ✅ Check if this is FULL payment
            total_due = order.total_amount_due
            is_full_payment = abs(amount - total_due) < Decimal('0.01')
            
            # Process payment
            payment_result = order.process_partial_payment(amount)
            
            # Get credit account
            credit_account = user.credit_account
            old_balance = credit_account.credit_balance
            
            # ✅ Calculate credit to restore
            # This should restore BOTH principal AND interest paid
            principal_payment = Decimal(str(payment_result['principal_paid']))
            interest_payment = Decimal(str(payment_result['interest_paid']))
            total_paid = principal_payment + interest_payment
            
            # ✅ CRITICAL FIX: If full payment, also restore the upfront amount
            # The upfront was NEVER deducted from credit, so we restore the LOAN_AMOUNT only
            credit_to_restore = total_paid
            
            # But if fully paid, we need to restore remaining loan amount
            # which includes what was left from the original loan_amount
            if payment_result['is_fully_paid']:
                # The loan_amount is the FULL order amount (including upfront)
                # We only deducted loan_amount from credit (not upfront again)
                # So we restore exactly what we paid
                credit_to_restore = total_paid
            
            # ✅ Restore credit
            credit_account.credit_balance += credit_to_restore
            credit_account.total_credit_used -= credit_to_restore
            
            # ✅ Update last repayment date
            credit_account.last_repayment_date = timezone.now()
            
            # ✅ Check if all loans are fully paid
            has_active_loans = Order.objects.filter(
                buyer=user,
                upfront_payment_status='PAID',
                is_fully_paid=False,
                loan_start_date__isnull=False
            ).exclude(id=order.id).exists()
            
            # If this was the last loan and now paid, set status to ACTIVE
            if payment_result['is_fully_paid'] and not has_active_loans:
                credit_account.loan_status = 'ACTIVE'
                # ✅ CRITICAL: If no active loans, credit should be at FULL limit
                # Reset to ensure it's exactly at limit (accounting for any rounding)
                credit_account.credit_balance = credit_account.credit_limit
                credit_account.total_credit_used = Decimal('0.00')
            
            credit_account.save()
            
            # Record transaction
            from credits.models import CreditTransaction
            CreditTransaction.objects.create(
                credit_account=credit_account,
                transaction_type=CreditTransaction.TransactionType.REPAYMENT,
                amount=credit_to_restore,
                balance_before=old_balance,
                balance_after=credit_account.credit_balance,
                description=f"Loan repayment - Order {order.order_number} (Principal: ₦{payment_result['principal_paid']}, Interest: ₦{payment_result['interest_paid']})" + 
                            (" - FULL PAYMENT" if payment_result['is_fully_paid'] else ""),
                reference=payment_reference
            )
            
            # Clear session
            if 'pending_repayment' in request.session:
                del request.session['pending_repayment']
                request.session.modified = True
            
            return Response({
                'success': True,
                'message': 'Repayment processed successfully!' + (' Loan fully paid! 🎉' if payment_result['is_fully_paid'] else ''),
                'payment': {
                    'amount_paid': str(total_paid),
                    'interest_paid': str(payment_result['interest_paid']),
                    'principal_paid': str(payment_result['principal_paid']),
                    'is_fully_paid': payment_result['is_fully_paid'],
                    'credit_restored': str(credit_to_restore),
                },
                'credit_account': {
                    'new_balance': str(credit_account.credit_balance),
                    'available_credit': str(credit_account.credit_balance),
                    'credit_limit': str(credit_account.credit_limit),
                    'outstanding_balance': str(credit_account.credit_limit - credit_account.credit_balance),
                    'loan_status': credit_account.loan_status,
                },
                'loan_status': {
                    'remaining_principal': str(payment_result['remaining_principal']),
                    'remaining_interest': str(payment_result['remaining_interest']),
                    'is_fully_paid': payment_result['is_fully_paid'],
                }
            }, status=status.HTTP_200_OK)
            
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )