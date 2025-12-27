from django.contrib import admin
from .models import CreditAccount, RepaymentHistory, CreditTransaction, CreditLimitHistory

@admin.register(CreditAccount)
class CreditAccountAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'credit_limit', 'credit_balance', 'outstanding_balance', 'loan_status']
    list_filter = ['loan_status']
    search_fields = ['user__email']
    readonly_fields = ['total_credit_used', 'total_repaid', 'last_repayment_date']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Credit Information', {
            'fields': ('credit_limit', 'credit_balance', 'loan_status')
        }),
        ('Statistics (Read-Only)', {
            'fields': ('total_credit_used', 'total_repaid', 'last_repayment_date')
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    
    def outstanding_balance(self, obj):
        return obj.outstanding_balance
    outstanding_balance.short_description = 'Outstanding'


@admin.register(RepaymentHistory)
class RepaymentHistoryAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'amount', 'admin_email', 'created_at']  # Fixed field names
    list_filter = ['created_at']  # Fixed from 'processed_at'
    search_fields = ['credit_account__user__email']
    readonly_fields = ['created_at']  # Fixed from 'processed_at'
    
    def user_email(self, obj):
        return obj.credit_account.user.email
    user_email.short_description = 'User'
    
    def admin_email(self, obj):
        return obj.processed_by_admin.email if obj.processed_by_admin else 'N/A'
    admin_email.short_description = 'Processed By'


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'transaction_type', 'amount', 'created_at']
    list_filter = ['transaction_type', 'created_at']
    search_fields = ['credit_account__user__email']
    readonly_fields = ['created_at']
    
    def user_email(self, obj):
        return obj.credit_account.user.email
    user_email.short_description = 'User'


@admin.register(CreditLimitHistory)
class CreditLimitHistoryAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'old_limit', 'new_limit', 'admin_email', 'created_at']
    list_filter = ['created_at']
    search_fields = ['credit_account__user__email']
    readonly_fields = ['created_at']
    
    def user_email(self, obj):
        return obj.credit_account.user.email
    user_email.short_description = 'User'
    
    def admin_email(self, obj):
        return obj.processed_by_admin.email if obj.processed_by_admin else 'N/A'
    admin_email.short_description = 'Processed By'
