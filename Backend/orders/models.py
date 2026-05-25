from django.db import models
from django.core.validators import MinValueValidator
from django.utils.crypto import get_random_string
from django.utils import timezone
from datetime import timedelta
from accounts.models import User
from shop.models import Product
import qrcode
from io import BytesIO
import base64
import random
import string


class Cart(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='cart',
        limit_choices_to={'role': 'BUYER'}
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'carts'
    
    def __str__(self):
        return f"Cart - {self.user.get_full_name()}"
    
    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())
    
    @property
    def subtotal(self):
        return sum(item.total_price for item in self.items.all())
    
    def clear(self):
        self.items.all().delete()


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE
    )
    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cart_items'
        unique_together = ['cart', 'product']
        indexes = [
            models.Index(fields=['cart', 'product']),
        ]
    
    def __str__(self):
        return f"{self.product.name} x{self.quantity}"
    
    @property
    def total_price(self):
        return self.product.price * self.quantity
    
    def update_quantity(self, quantity):
        if quantity > self.product.stock_quantity:
            raise ValueError(
                f"Insufficient stock. Available: {self.product.stock_quantity}"
            )
        self.quantity = quantity
        self.save()


class Order(models.Model):
    class OrderStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'
    
    order_number = models.CharField(
        max_length=20,
        unique=True,
        editable=False
    )
    
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='orders',
        limit_choices_to={'role': 'BUYER'}
    )
    
    seller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='seller_orders',
        limit_choices_to={'role': 'SELLER'}
    )
    
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )

        # BNPL (Buy Now Pay Later) Fields
    upfront_payment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="10% upfront payment (for commitment)"
    )
    
    upfront_payment_status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Pending'),
            ('PAID', 'Paid'),
            ('FAILED', 'Failed')
        ],
        default='PENDING'
    )
    
    upfront_payment_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Payment transaction reference"
    )
    
    # Loan Details
    loan_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Full order amount (deducted from credit limit)"
    )
    
    principal_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="90% - Amount after upfront payment (what interest is calculated on)"
    )
    
    # Interest Calculation
    service_fee_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=8.5,
        help_text="Service fee percentage (default 8.5%)"
    )
    
    total_service_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Total service fee for 30 days (principal * 8.5%)"
    )
    
    accrued_interest = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Interest accrued so far (updated daily)"
    )
    
    daily_interest_rate = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=0,
        help_text="Daily interest rate (8.5% / 30)"
    )
    
    # Loan Timeline
    loan_start_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the loan started (after upfront payment)"
    )
    
    loan_due_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="30 days after loan start"
    )
    
    grace_period_end_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="35 days after loan start (5 day grace)"
    )
    
    days_elapsed = models.IntegerField(
        default=0,
        help_text="Days since loan started"
    )
    
    # Repayment Tracking
    principal_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Principal amount paid so far"
    )
    
    interest_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Interest amount paid so far"
    )
    
    remaining_principal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Principal still owed"
    )
    
    is_fully_paid = models.BooleanField(
        default=False,
        help_text="Whether loan is fully repaid"
    )
    
    is_overdue = models.BooleanField(
        default=False,
        help_text="Whether payment is past grace period"
    )
    
    last_payment_date = models.DateTimeField(
        null=True,
        blank=True
    )
    
    status = models.CharField(
        max_length=10,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING
    )
    
    qr_code_token = models.TextField(blank=True, null=True)
    qr_code_image = models.URLField(blank=True, null=True)
    
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_generated_at = models.DateTimeField(blank=True, null=True)
    otp_expires_at = models.DateTimeField(blank=True, null=True)
    otp_verified = models.BooleanField(default=False)
    
    is_cancelled = models.BooleanField(default=False)
    cancelled_at = models.DateTimeField(blank=True, null=True)
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_orders'
    )
    cancellation_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['buyer', '-created_at']),
            models.Index(fields=['seller', '-created_at']),
            models.Index(fields=['order_number']),
            models.Index(fields=['qr_code_token']),
            models.Index(fields=['status']),
            models.Index(fields=['otp_code']),
            models.Index(fields=['is_cancelled']),
        ]
    
    def __str__(self):
        return f"Order {self.order_number} - {self.buyer.get_full_name()}"
    
    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self.generate_order_number()
        if not self.qr_code_token:
            self.qr_code_token = self.generate_qr_token()
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_order_number():
        prefix = 'FF'
        random_string = get_random_string(12, allowed_chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')
        return f"{prefix}{random_string}"
    
    @staticmethod
    def generate_qr_token():
        return get_random_string(64)
    
    def generate_qr_code(self):
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            
            qr_data = f"FOODFLEX_ORDER:{self.order_number}:{self.qr_code_token}"
            qr.add_data(qr_data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{img_base64}"
            
        except Exception as e:
            raise Exception(f"QR code generation failed: {str(e)}")
    
    def generate_otp(self):
        self.otp_code = ''.join(random.choices(string.digits, k=6))
        self.otp_generated_at = timezone.now()
        self.otp_expires_at = timezone.now() + timedelta(minutes=10)
        self.otp_verified = False
        self.save()
        
        
        return self.otp_code
    
    def verify_otp(self, otp_input):
        if not self.otp_code:
            return False, "No OTP generated for this order"
        
        if timezone.now() > self.otp_expires_at:
            return False, "OTP has expired. Please scan QR code again."
        
        if self.otp_verified:
            return False, "OTP already used"
        
        if self.otp_code == otp_input:
            self.otp_verified = True
            self.save()
            return True, "OTP verified successfully"
        else:
            return False, "Invalid OTP code"
    
    def clear_otp(self):
        self.otp_code = None
        self.otp_generated_at = None
        self.otp_expires_at = None
        self.otp_verified = False
        self.save()
    
    def get_otp_time_remaining(self):
        if not self.otp_expires_at:
            return 0
        
        remaining = (self.otp_expires_at - timezone.now()).total_seconds()
        return max(0, int(remaining))
    
    # Order Cancellation Methods
    def can_be_cancelled(self):
        return self.status == self.OrderStatus.PENDING and not self.is_cancelled
    
    def cancel_order_by_buyer(self, buyer, reason=None):

        if not self.can_be_cancelled():
            return False, "This order cannot be cancelled. Only pending orders can be cancelled.", 0
        
        if self.buyer.id != buyer.id:
            return False, "You can only cancel your own orders.", 0
        
        try:
            from credits.models import CreditTransaction
            
            # Mark as cancelled
            self.status = self.OrderStatus.CANCELLED
            self.is_cancelled = True
            self.cancelled_at = timezone.now()
            self.cancelled_by = buyer
            self.cancellation_reason = reason or "Cancelled by buyer"
            
            # Void the QR code by clearing OTP
            if self.otp_code:
                self.clear_otp()
            
            # Restore stock for all items
            for item in self.items.all():
                if item.product:
                    item.product.stock_quantity += item.quantity
                    item.product.save(update_fields=['stock_quantity'])
            
            # Get credit account
            credit_account = self.buyer.credit_account
            old_balance = credit_account.credit_balance
            
            # Calculate refund amounts
            from decimal import Decimal
            
            # 1. Refund the FULL loan amount (credit that was deducted)
            credit_refund = self.loan_amount  # Full ₦10,000
            
            # 2. Refund the 10% upfront payment (to actual wallet/account)
            upfront_refund = self.upfront_payment  # ₦1,000
            
            # Restore credit
            credit_account.credit_balance += credit_refund
            credit_account.total_credit_used -= credit_refund
            
            # Update loan status if needed
            if credit_account.loan_status == 'EXHAUSTED':
                credit_account.loan_status = 'ACTIVE'
            
            credit_account.save()
            
            # Create credit refund transaction
            CreditTransaction.objects.create(
                credit_account=credit_account,
                transaction_type=CreditTransaction.TransactionType.ADJUSTMENT,
                amount=credit_refund,
                balance_before=old_balance,
                balance_after=credit_account.credit_balance,
                description=f"Credit refund - Order {self.order_number} cancelled: {reason or 'No reason provided'}",
                reference=f"CANCEL_{self.order_number}"
            )
            
            # TODO: In production, refund the 10% upfront to buyer's bank account
            # For now, we just track it
            self.upfront_payment_status = 'REFUNDED'
            
            # Update notes
            refund_note = f"Cancelled by buyer: {reason or 'No reason provided'}\n"
            refund_note += f"Credit refunded: ₦{float(credit_refund):,.2f}\n"
            refund_note += f"Upfront payment to be refunded: ₦{float(upfront_refund):,.2f}"
            self.notes = refund_note
            
            self.save()
            
            return True, f"Order cancelled successfully. ₦{float(credit_refund):,.2f} credit restored. ₦{float(upfront_refund):,.2f} will be refunded to your account.", {
                'credit_refund': float(credit_refund),
                'upfront_refund': float(upfront_refund),
                'total_refund': float(credit_refund + upfront_refund)
            }
            
        except Exception as e:
            return False, f"Error cancelling order: {str(e)}", 0
        
    
        # ADD this new method for auto-cancellation
    def auto_cancel_if_expired(self):

        from django.utils import timezone
        from datetime import timedelta
        
        # Only auto-cancel PENDING orders
        if self.status != self.OrderStatus.PENDING or self.is_cancelled:
            return False, "Order not eligible for auto-cancellation"
        
        # Check if order is older than 3 days
        three_days_ago = timezone.now() - timedelta(days=3)
        
        if self.created_at <= three_days_ago:
            # Auto-cancel
            success, message, refunds = self.cancel_order_by_buyer(
                buyer=self.buyer,
                reason="Auto-cancelled: Order not confirmed within 3 days"
            )
            
            if success:
                return True, f"Order {self.order_number} auto-cancelled after 3 days"
            else:
                return False, f"Failed to auto-cancel: {message}"
        
        return False, "Order not yet expired"

    
    def get_cancellation_info(self):
        if not self.is_cancelled:
            return None
        
        return {
            'cancelled_at': self.cancelled_at,
            'cancelled_by': self.cancelled_by.get_full_name() if self.cancelled_by else 'Unknown',
            'cancelled_by_id': self.cancelled_by.id if self.cancelled_by else None,
            'reason': self.cancellation_reason or 'No reason provided'
        }
    
    def confirm_order(self, confirmed_by_seller):
        if self.status != self.OrderStatus.PENDING:
            raise ValueError(f"Cannot confirm order with status: {self.status}")
        
        if self.is_cancelled:
            raise ValueError("Cannot confirm a cancelled order")
        
        if confirmed_by_seller.id != self.seller.id:
            raise ValueError("Only the assigned seller can confirm this order")
        
        # Update order status
        self.status = self.OrderStatus.CONFIRMED
        self.confirmed_at = timezone.now()
        
        #   ACTIVATE LOAN NOW (not at checkout)
        if self.upfront_payment_status == 'PAID' and not self.loan_start_date:
            self.activate_loan()
        
        self.save()
    
    def complete_order(self):
        if self.status != self.OrderStatus.CONFIRMED:
            raise ValueError(f"Cannot complete order with status: {self.status}")
        
        if self.is_cancelled:
            raise ValueError("Cannot complete a cancelled order")
        
        self.status = self.OrderStatus.COMPLETED
        self.completed_at = timezone.now()
        self.save()
        
        seller_profile = self.seller.seller_profile
        seller_profile.add_earnings(self.total_amount)
        seller_profile.increment_order_count()

    
    def calculate_loan_details(self):
        """Calculate all loan-related amounts"""
        from decimal import Decimal
        
        # 10% upfront
        self.upfront_payment = (self.total_amount * Decimal('0.10')).quantize(Decimal('0.01'))
        
        # Full amount is the loan
        self.loan_amount = self.total_amount
        
        # Principal = 90% (amount after upfront)
        self.principal_amount = (self.total_amount * Decimal('0.90')).quantize(Decimal('0.01'))
        
        # Total service fee (8.5% of principal over 30 days)
        self.total_service_fee = (self.principal_amount * Decimal('0.085')).quantize(Decimal('0.01'))
        
        # Daily interest rate
        self.daily_interest_rate = (Decimal('0.085') / Decimal('30'))
        
        # Remaining principal starts at full principal
        self.remaining_principal = self.principal_amount
        
        self.save()
    
    def activate_loan(self):
        """Activate loan after upfront payment is successful"""
        from django.utils import timezone
        from datetime import timedelta
        
        self.upfront_payment_status = 'PAID'
        self.loan_start_date = timezone.now()
        self.loan_due_date = self.loan_start_date + timedelta(days=30)
        self.grace_period_end_date = self.loan_start_date + timedelta(days=35)
        self.save()
    
    def update_accrued_interest(self):
        """Update accrued interest based on days elapsed"""
        from django.utils import timezone
        from decimal import Decimal
        
        if not self.loan_start_date or self.is_fully_paid:
            return
        
        # Calculate days elapsed
        self.days_elapsed = (timezone.now().date() - self.loan_start_date.date()).days
        
        # Calculate accrued interest (daily rate * days * remaining principal)
        daily_interest = self.remaining_principal * self.daily_interest_rate
        self.accrued_interest = (daily_interest * Decimal(str(self.days_elapsed))).quantize(Decimal('0.01'))
        
        # Check if overdue (past grace period)
        if timezone.now() > self.grace_period_end_date:
            self.is_overdue = True
        
        self.save()
    
    @property
    def total_amount_due(self):
        """Total amount buyer must pay (principal + accrued interest)"""
        from decimal import Decimal
        return (self.remaining_principal + self.accrued_interest).quantize(Decimal('0.01'))
    
    @property
    def days_remaining(self):
        """Days until due date"""
        from django.utils import timezone
        if not self.loan_due_date:
            return 0
        remaining = (self.loan_due_date - timezone.now()).days
        return max(0, remaining)
    
    @property
    def is_in_grace_period(self):
        """Check if in 5-day grace period"""
        from django.utils import timezone
        if not self.loan_due_date:
            return False
        return self.loan_due_date < timezone.now() <= self.grace_period_end_date
    
    def process_partial_payment(self, amount):
        """Process partial payment (interest first, then principal)"""
        from decimal import Decimal
        from django.utils import timezone
        
        amount = Decimal(str(amount))
        
        # Update accrued interest first
        self.update_accrued_interest()
        
        # Pay interest first
        interest_payment = min(amount, self.accrued_interest)
        self.interest_paid += interest_payment
        self.accrued_interest -= interest_payment
        remaining_amount = amount - interest_payment
        
        # Then pay principal
        if remaining_amount > 0:
            principal_payment = min(remaining_amount, self.remaining_principal)
            self.principal_paid += principal_payment
            self.remaining_principal -= principal_payment
        
        # Check if fully paid
        if self.remaining_principal <= 0 and self.accrued_interest <= 0:
            self.is_fully_paid = True
        
        self.last_payment_date = timezone.now()
        self.save()
        
        return {
            'interest_paid': float(interest_payment),
            'principal_paid': float(principal_payment),
            'remaining_principal': float(self.remaining_principal),
            'remaining_interest': float(self.accrued_interest),
            'is_fully_paid': self.is_fully_paid
        }


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True
    )
    
    product_name = models.CharField(max_length=255)
    product_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    
    class Meta:
        db_table = 'order_items'
        indexes = [
            models.Index(fields=['order']),
        ]
    
    def __str__(self):
        return f"{self.product_name} x{self.quantity} (Order: {self.order.order_number})"
    
    def save(self, *args, **kwargs):
        if self.product:
            self.product_name = self.product.name
            self.product_price = self.product.price
        
        self.subtotal = self.product_price * self.quantity
        super().save(*args, **kwargs)