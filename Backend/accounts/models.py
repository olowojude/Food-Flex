from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator

class User(AbstractUser):
    """
    Custom User model with role-based access control
    """
    class UserRole(models.TextChoices):
        BUYER = 'BUYER', 'Buyer'
        SELLER = 'SELLER', 'Seller'
        ADMIN = 'ADMIN', 'Admin'
    
    email = models.EmailField(unique=True)
    
    # Fix for groups and permissions clash
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='foodflex_user_set',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='foodflex_user_set',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    phone_number = models.CharField(validators=[phone_regex], max_length=17, blank=True)
    
    role = models.CharField(
        max_length=10,
        choices=UserRole.choices,
        default=UserRole.BUYER
    )
    
    profile_image = models.URLField(blank=True, null=True)
    address = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional fields
    is_verified = models.BooleanField(default=False)
    is_seller_approved = models.BooleanField(default=False)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    @property
    def is_buyer(self):
        return self.role == self.UserRole.BUYER
    
    @property
    def is_seller(self):
        return self.role == self.UserRole.SELLER
    
    @property
    def is_admin_user(self):
        return self.role == self.UserRole.ADMIN or self.is_superuser
    
    def can_purchase(self):
        """Check if user can make purchases"""
        return self.role == self.UserRole.BUYER
    
    def can_sell(self):
        """Check if user can sell products"""
        return self.role == self.UserRole.SELLER and self.is_seller_approved
    
    def update_profile_image(self, image_url):
        """Update profile image URL (uploaded from frontend)"""
        self.profile_image = image_url
        self.save()
        return self.profile_image


class SellerProfile(models.Model):
    """
    Extended profile for sellers with business information
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='seller_profile'
    )
    
    business_name = models.CharField(max_length=255)
    business_description = models.TextField(blank=True)
    business_address = models.TextField()
    business_phone = models.CharField(max_length=17)
    
    # Financial Information
    wallet_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text="Real money earned from completed orders"
    )
    
    total_earnings = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00
    )
    
    # Statistics
    total_products = models.PositiveIntegerField(default=0)
    total_orders_fulfilled = models.PositiveIntegerField(default=0)
    
    # Verification
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'seller_profiles'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.business_name} - {self.user.email}"
    
    def add_earnings(self, amount):
        """Add earnings to seller's wallet"""
        self.wallet_balance += amount
        self.total_earnings += amount
        self.save()
    
    def increment_order_count(self):
        """Increment fulfilled orders count"""
        self.total_orders_fulfilled += 1
        self.save()