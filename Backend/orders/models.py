from django.db import models
from django.core.validators import MinValueValidator
from django.utils.crypto import get_random_string
from accounts.models import User
from shop.models import Product
import qrcode
from io import BytesIO
import base64


class Cart(models.Model):
    """Shopping cart for buyers"""
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
        """Total number of items in cart"""
        return sum(item.quantity for item in self.items.all())
    
    @property
    def subtotal(self):
        """Calculate cart subtotal"""
        return sum(item.total_price for item in self.items.all())
    
    def clear(self):
        """Clear all items from cart"""
        self.items.all().delete()


class CartItem(models.Model):
    """Individual items in shopping cart"""
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
        """Calculate total price for this cart item"""
        return self.product.price * self.quantity
    
    def update_quantity(self, quantity):
        """Update quantity and validate stock"""
        if quantity > self.product.stock_quantity:
            raise ValueError(
                f"Insufficient stock. Available: {self.product.stock_quantity}"
            )
        self.quantity = quantity
        self.save()


class Order(models.Model):
    """Orders placed by buyers"""
    class OrderStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'
    
    # Generate unique order number
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
    
    # Order Details
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    
    status = models.CharField(
        max_length=10,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING
    )
    
    # QR Code
    qr_code_token = models.CharField(
        max_length=100,
        unique=True,
        editable=False
    )
    qr_code_image = models.URLField(blank=True, null=True)
    
    # Timestamps
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
        """Generate unique order number"""
        prefix = 'FF'
        random_string = get_random_string(12, allowed_chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')
        return f"{prefix}{random_string}"
    
    @staticmethod
    def generate_qr_token():
        """Generate secure QR code token"""
        return get_random_string(64)
    
    def generate_qr_code(self):
        """Generate QR code image as base64 string"""
        try:
            # Create QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            
            # QR data includes order number and token for security
            qr_data = f"FOODFLEX_ORDER:{self.order_number}:{self.qr_code_token}"
            qr.add_data(qr_data)
            qr.make(fit=True)
            
            # Generate image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64 for frontend to upload to Cloudinary
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            # Return base64 string - frontend will upload this to Cloudinary
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{img_base64}"
            
        except Exception as e:
            raise Exception(f"QR code generation failed: {str(e)}")
    
    def confirm_order(self, confirmed_by_seller):
        """Seller confirms order after scanning QR (stock already reduced at checkout)"""
        from django.utils import timezone
        
        if self.status != self.OrderStatus.PENDING:
            raise ValueError(f"Cannot confirm order with status: {self.status}")
        
        if confirmed_by_seller.id != self.seller.id:
            raise ValueError("Only the assigned seller can confirm this order")
        
        self.status = self.OrderStatus.CONFIRMED
        self.confirmed_at = timezone.now()
        self.save()
    
    def complete_order(self):
        """
        Complete order and transfer earnings to seller
        Stock was ALREADY reduced at checkout, so no stock manipulation here
        """
        from django.utils import timezone
        
        if self.status != self.OrderStatus.CONFIRMED:
            raise ValueError(f"Cannot complete order with status: {self.status}")
        
        # Mark as completed
        self.status = self.OrderStatus.COMPLETED
        self.completed_at = timezone.now()
        self.save()
        
        # Stock was already reduced at checkout, so we don't touch it here
        # Just transfer earnings to seller
        seller_profile = self.seller.seller_profile
        seller_profile.add_earnings(self.total_amount)
        seller_profile.increment_order_count()
    
    def cancel_order(self, reason=''):
        """
        Cancel order and refund credit to buyer
        ✅ RESTORE STOCK because it was reduced at checkout
        """
        if self.status in [self.OrderStatus.COMPLETED, self.OrderStatus.CANCELLED]:
            raise ValueError(f"Cannot cancel order with status: {self.status}")
        
        # ✅ RESTORE STOCK - Add back the quantities that were reduced at checkout
        for item in self.items.all():
            if item.product:  # Check product still exists
                item.product.stock_quantity += item.quantity
                item.product.save(update_fields=['stock_quantity'])
        
        # Refund credit to buyer
        credit_account = self.buyer.credit_account
        credit_account.credit_balance += self.total_amount
        credit_account.total_credit_used -= self.total_amount
        
        # If loan was exhausted, make it active again
        if credit_account.loan_status == 'EXHAUSTED':
            credit_account.loan_status = 'ACTIVE'
        
        credit_account.save()
        
        # Log refund transaction
        from credits.models import CreditTransaction
        CreditTransaction.objects.create(
            credit_account=credit_account,
            transaction_type=CreditTransaction.TransactionType.ADJUSTMENT,
            amount=self.total_amount,
            balance_before=credit_account.credit_balance - self.total_amount,
            balance_after=credit_account.credit_balance,
            description=f"Refund - Order {self.order_number} cancelled: {reason}",
            reference=self.order_number
        )
        
        # Update order status
        self.status = self.OrderStatus.CANCELLED
        if reason:
            self.notes = f"Cancelled: {reason}"
        self.save()


class OrderItem(models.Model):
    """Individual items in an order"""
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
        # Store product details at time of order
        if self.product:
            self.product_name = self.product.name
            self.product_price = self.product.price
        
        # Calculate subtotal
        self.subtotal = self.product_price * self.quantity
        super().save(*args, **kwargs)