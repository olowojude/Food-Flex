from rest_framework import serializers
from .models import CreditAccount, RepaymentHistory, CreditLimitHistory, CreditTransaction
from accounts.serializers import UserProfileSerializer


class CreditAccountSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    outstanding_balance = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    
    class Meta:
        model = CreditAccount
        fields = [
            'id', 'user', 'credit_limit', 'credit_balance',
            'available_credit', 'outstanding_balance',
            'total_credit_used', 'loan_status', 'total_repaid',
            'last_repayment_date', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'credit_balance', 'total_credit_used', 'loan_status',
            'total_repaid', 'last_repayment_date'
        ]


class RepaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Repayment amount must be greater than 0")
        return value


class RepaymentHistorySerializer(serializers.ModelSerializer):
    credit_account_user = serializers.CharField(
        source='credit_account.user.get_full_name',
        read_only=True
    )
    repaid_by_name = serializers.CharField(
        source='repaid_by.get_full_name',
        read_only=True
    )
    
    class Meta:
        model = RepaymentHistory
        fields = [
            'id', 'credit_account', 'credit_account_user',
            'amount', 'repaid_by', 'repaid_by_name',
            'notes', 'created_at'
        ]


class CreditLimitIncreaseSerializer(serializers.Serializer):
    new_limit = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate_new_limit(self, value):
        if value <= 0:
            raise serializers.ValidationError("Credit limit must be greater than 0")
        return value


class CreditLimitHistorySerializer(serializers.ModelSerializer):
    credit_account_user = serializers.CharField(
        source='credit_account.user.get_full_name',
        read_only=True
    )
    increased_by_name = serializers.CharField(
        source='increased_by.get_full_name',
        read_only=True
    )
    
    class Meta:
        model = CreditLimitHistory
        fields = [
            'id', 'credit_account', 'credit_account_user',
            'old_limit', 'new_limit', 'increased_by',
            'increased_by_name', 'reason', 'created_at'
        ]


class CreditTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditTransaction
        fields = [
            'id', 'credit_account', 'transaction_type',
            'amount', 'balance_before', 'balance_after',
            'description', 'reference', 'created_at'
        ]