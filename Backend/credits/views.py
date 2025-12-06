from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from .models import CreditAccount, RepaymentHistory, CreditLimitHistory, CreditTransaction
from .serializers import (
    CreditAccountSerializer, RepaymentSerializer,
    RepaymentHistorySerializer, CreditLimitIncreaseSerializer,
    CreditLimitHistorySerializer, CreditTransactionSerializer
)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_credit_account(request):
    """Buyer views their credit account"""
    user = request.user
    
    if user.role != 'BUYER':
        return Response(
            {'error': 'Only buyers have credit accounts'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get or create credit account
    credit_account, created = CreditAccount.objects.get_or_create(user=user)
    serializer = CreditAccountSerializer(credit_account)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_credit_transactions(request):
    """Buyer views their credit transaction history"""
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
    """Buyer views their repayment history"""
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


# Admin Views
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def all_credit_accounts(request):
    """Admin views all credit accounts"""
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
    """Admin views specific user's credit account"""
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
def process_repayment(request, user_id):
    """Admin processes a loan repayment"""
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can process repayments'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = RepaymentSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            with transaction.atomic():
                # Get user's credit account
                credit_account = CreditAccount.objects.get(user_id=user_id)
                
                amount = serializer.validated_data['amount']
                notes = serializer.validated_data.get('notes', '')
                
                # Validate repayment amount
                if amount > credit_account.outstanding_balance:
                    return Response(
                        {'error': f'Repayment amount exceeds outstanding balance of ₦{credit_account.outstanding_balance:,.2f}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Process repayment
                old_balance = credit_account.credit_balance
                credit_account.process_repayment(amount, request.user)
                
                # Create transaction log
                CreditTransaction.objects.create(
                    credit_account=credit_account,
                    transaction_type=CreditTransaction.TransactionType.REPAYMENT,
                    amount=amount,
                    balance_before=old_balance,
                    balance_after=credit_account.credit_balance,
                    description=f"Loan repayment processed by admin. {notes}",
                    reference=f"REPAY_{credit_account.user.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}"
                )
                
                return Response(
                    {
                        'message': 'Repayment processed successfully',
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def increase_credit_limit(request, user_id):
    """Admin increases a user's credit limit"""
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
                
                # Validate new limit
                if new_limit <= credit_account.credit_limit:
                    return Response(
                        {'error': 'New limit must be greater than current limit'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Increase credit limit
                old_balance = credit_account.credit_balance
                old_limit = credit_account.credit_limit
                credit_account.increase_credit_limit(new_limit, request.user)
                
                # Create transaction log
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
    """Admin views all repayment history"""
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
    """Admin views all credit limit increase history"""
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can view credit limit history'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    history = CreditLimitHistory.objects.all()
    serializer = CreditLimitHistorySerializer(history, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)