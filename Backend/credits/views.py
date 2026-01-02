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


# ============================================
# BUYER ENDPOINTS - Self-Service
# ============================================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_credit_account(request):
    """
    Get logged-in buyer's credit account details
    """
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers have credit accounts'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    credit_account, created = CreditAccount.objects.get_or_create(user=user)
    serializer = CreditAccountSerializer(credit_account)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_credit_transactions(request):
    """
    Get logged-in buyer's credit transactions
    """
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_repayment_history(request):
    """
    Get logged-in buyer's repayment history
    """
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def initiate_buyer_repayment(request):
    """
    Buyer initiates loan repayment via Hydrogen Pay (Self-Service Only)
    """
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


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def hydrogen_webhook(request):
    """
    Webhook to handle payment confirmation from Hydrogen Pay
    Applies 5% bonus if payment made within 30 days
    """
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
                # Process the repayment
                old_balance = credit_account.credit_balance
                credit_account.process_repayment(amount, credit_account.user)
                
                # Update transaction
                txn.balance_after = credit_account.credit_balance
                txn.description = "Completed loan repayment via Hydrogen Pay"
                txn.save()
                
                # ============================================
                # CHECK IF BONUS SHOULD BE APPLIED
                # Bonus: 5% if repaid within 30 days
                # ============================================
                bonus_applied = False
                bonus_amount = 0
                
                # Find the most recent PURCHASE transaction (when they borrowed)
                last_purchase = credit_account.transactions.filter(
                    transaction_type=CreditTransaction.TransactionType.PURCHASE
                ).order_by('-created_at').first()
                
                if last_purchase:
                    # Calculate days since last purchase
                    days_since_purchase = (timezone.now() - last_purchase.created_at).days
                    
                    # Apply bonus if repaying within 30 days (on time)
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
                            description=f"5% bonus for repaying within 30 days (paid after {days_since_purchase} days)",
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


# ============================================
# ADMIN ENDPOINTS - Read-Only Monitoring
# ============================================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def all_credit_accounts(request):
    """
    Admin views all credit accounts (monitoring only)
    """
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def credit_account_detail(request, user_id):
    """
    Admin views specific user's credit account (monitoring only)
    """
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def increase_credit_limit(request, user_id):
    """
    Admin increases user's credit limit (promotional/reward purposes)
    """
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def all_repayment_history(request):
    """
    Admin views all repayment history (reporting/analytics)
    """
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can view all repayment history'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    repayments = RepaymentHistory.objects.all()
    serializer = RepaymentHistorySerializer(repayments, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def all_credit_limit_history(request):
    """
    Admin views credit limit history (audit trail)
    """
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can view credit limit history'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    history = CreditLimitHistory.objects.all()
    serializer = CreditLimitHistorySerializer(history, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)