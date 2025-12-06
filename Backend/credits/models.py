from django.db import models
from django.core.validators import MinValueValidator
from accounts.models import User

# Default credit limit constant
DEFAULT_CREDIT_LIMIT = 50000  # ₦50,000


class CreditAccount(models.Model):
    """
    Manages buyer's credit/loan account
    Each buyer has one credit account
    """
    class LoanStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        EXHAUSTED = 'EXHAUSTED', 'Exhausted'
        REPAID = 'REPAID', 'Repaid'
        SUSPENDED = 'SUSPENDED', 'Suspended'
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='credit_account',
        limit_choices_to={'role': 'BUYER'}
    )
    
    # Credit Information
    credit_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=DEFAULT_CREDIT_LIMIT,
        validators=[MinValueValidator(0)]
    )
    
    credit_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=DEFAULT_CREDIT_LIMIT,
        validators=[MinValueValidator(0)]
    )
    
    total_credit_used = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00
    )
    
    # Loan Status
    loan_status = models.CharField(
        max_length=10,
        choices=LoanStatus.choices,
        default=LoanStatus.ACTIVE
    )
    
    # Repayment tracking
    total_repaid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00
    )
    
    last_repayment_date = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'credit_accounts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['loan_status']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - ₦{self.credit_balance:,.2f} / ₦{self.credit_limit:,.2f}"
    
    @property
    def available_credit(self):
        """Return available credit balance"""
        return self.credit_balance
    
    @property
    def outstanding_balance(self):
        """Calculate outstanding loan amount"""
        return self.credit_limit - self.credit_balance
    
    def can_purchase(self, amount):
        """Check if user has sufficient credit for purchase"""
        return (
            self.loan_status == self.LoanStatus.ACTIVE and
            self.credit_balance >= amount
        )
    
    def deduct_credit(self, amount):
        """Deduct credit after purchase"""
        if not self.can_purchase(amount):
            raise ValueError(
                f"Insufficient credit. Available: ₦{self.credit_balance:,.2f}, Required: ₦{amount:,.2f}"
            )
        
        self.credit_balance -= amount
        self.total_credit_used += amount
        
        # Update loan status if exhausted
        if self.credit_balance <= 0:
            self.loan_status = self.LoanStatus.EXHAUSTED
        
        self.save()
    
    def process_repayment(self, amount, repaid_by_admin):
        """Process loan repayment"""
        from django.utils import timezone
        
        if amount <= 0:
            raise ValueError("Repayment amount must be greater than zero")
        
        # Record repayment
        self.total_repaid += amount
        self.credit_balance += amount
        self.last_repayment_date = timezone.now()
        
        # If fully repaid, reset status
        if self.credit_balance >= self.credit_limit:
            self.credit_balance = self.credit_limit
            self.loan_status = self.LoanStatus.ACTIVE
            self.total_credit_used = 0
        
        self.save()
        
        # Create repayment record
        RepaymentHistory.objects.create(
            credit_account=self,
            amount=amount,
            repaid_by=repaid_by_admin
        )
    
    def increase_credit_limit(self, new_limit, approved_by_admin):
        """Admin increases user's credit limit"""
        if new_limit <= self.credit_limit:
            raise ValueError("New limit must be greater than current limit")
        
        old_limit = self.credit_limit
        increase_amount = new_limit - old_limit
        
        self.credit_limit = new_limit
        self.credit_balance += increase_amount
        self.loan_status = self.LoanStatus.ACTIVE
        self.save()
        
        # Create credit increase record
        CreditLimitHistory.objects.create(
            credit_account=self,
            old_limit=old_limit,
            new_limit=new_limit,
            increased_by=approved_by_admin
        )


class RepaymentHistory(models.Model):
    """Track all loan repayments"""
    credit_account = models.ForeignKey(
        CreditAccount,
        on_delete=models.CASCADE,
        related_name='repayment_history'
    )
    
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    
    repaid_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='processed_repayments',
        help_text="Admin who processed the repayment"
    )
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'repayment_history'
        ordering = ['-created_at']
        verbose_name_plural = 'Repayment histories'
    
    def __str__(self):
        return f"{self.credit_account.user.get_full_name()} - ₦{self.amount:,.2f}"


class CreditLimitHistory(models.Model):
    """Track credit limit increases"""
    credit_account = models.ForeignKey(
        CreditAccount,
        on_delete=models.CASCADE,
        related_name='limit_history'
    )
    
    old_limit = models.DecimalField(max_digits=12, decimal_places=2)
    new_limit = models.DecimalField(max_digits=12, decimal_places=2)
    
    increased_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='approved_credit_increases',
        help_text="Admin who approved the increase"
    )
    
    reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'credit_limit_history'
        ordering = ['-created_at']
        verbose_name_plural = 'Credit limit histories'
    
    def __str__(self):
        return (
            f"{self.credit_account.user.get_full_name()} - "
            f"₦{self.old_limit:,.2f} → ₦{self.new_limit:,.2f}"
        )


class CreditTransaction(models.Model):
    """Log all credit transactions"""
    class TransactionType(models.TextChoices):
        PURCHASE = 'PURCHASE', 'Purchase'
        REPAYMENT = 'REPAYMENT', 'Repayment'
        LIMIT_INCREASE = 'LIMIT_INCREASE', 'Limit Increase'
        ADJUSTMENT = 'ADJUSTMENT', 'Adjustment'
    
    credit_account = models.ForeignKey(
        CreditAccount,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    
    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices
    )
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    balance_before = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    
    description = models.TextField()
    reference = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'credit_transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['credit_account', '-created_at']),
            models.Index(fields=['transaction_type']),
        ]
    
    def __str__(self):
        return f"{self.transaction_type} - ₦{self.amount:,.2f} ({self.created_at})"