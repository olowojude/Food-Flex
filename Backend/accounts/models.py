from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


# Custom User Manager
class CustomUserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        if not username:
            raise ValueError('The Username field must be set')
        
        email = self.normalize_email(email).lower().strip()
        username = username.lower().strip()
        
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(username, email, password, **extra_fields)


# User Model
class User(AbstractUser):
    class UserRole(models.TextChoices):
        BUYER = 'BUYER', 'Buyer'
        SELLER = 'SELLER', 'Seller'
        ADMIN = 'ADMIN', 'Admin'
    
    objects = CustomUserManager()
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    
    country = models.CharField(max_length=100, default='Nigeria')
    state = models.CharField(max_length=100)  
    city = models.CharField(max_length=100) 
    address = models.TextField() 
    
    profile_image = models.URLField(blank=True, null=True)
    role = models.CharField(
        max_length=10,
        choices=UserRole.choices,
        default=UserRole.BUYER
    )
    is_verified = models.BooleanField(default=False)
    is_seller_approved = models.BooleanField(default=False)
    username = models.CharField(max_length=150, unique=True)
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return self.email
    
    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.lower().strip()
        if self.username:
            self.username = self.username.lower().strip()
        
        if self.is_superuser:
            self.role = self.UserRole.ADMIN
        
        super().save(*args, **kwargs)
    
    @property
    def is_admin_user(self):
        return self.role == self.UserRole.ADMIN or self.is_superuser
    
    def can_purchase(self):
        return self.role == self.UserRole.BUYER
    
    def can_sell(self):
        return self.role == self.UserRole.SELLER
    
    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.email
    
    @property
    def full_location(self):
        return f"{self.city}, {self.state}, {self.country}"


class StoreLocation(models.Model):
    seller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='store_locations',
        limit_choices_to={'role': 'SELLER'}
    )
    
    store_name = models.CharField(max_length=255, help_text="e.g., 'Stop-to-Shop', 'Lagos Branch'")
    country = models.CharField(max_length=100, default='Nigeria')
    state = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    address = models.TextField(help_text="Full street address")
    
    phone_number = models.CharField(max_length=20)
    
    is_primary = models.BooleanField(default=False, help_text="Primary/Main store location")
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Store Location'
        verbose_name_plural = 'Store Locations'
        ordering = ['-is_primary', '-created_at']
        unique_together = ['seller', 'store_name']
    
    def __str__(self):
        return f"{self.store_name} - {self.city}, {self.state}"
    
    def save(self, *args, **kwargs):
        if self.is_primary:
            StoreLocation.objects.filter(
                seller=self.seller, 
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        
        if not self.pk and not StoreLocation.objects.filter(seller=self.seller).exists():
            self.is_primary = True
        
        super().save(*args, **kwargs)
    
    @property
    def full_address(self):
        return f"{self.address}, {self.city}, {self.state}, {self.country}"


class SellerProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='seller_profile'
    )
    store_name = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Store name (optional). Defaults to '{First Name}'s Store' if not provided"
    )
    business_name = models.CharField(max_length=255)
    business_description = models.TextField(blank=True, null=True)
    business_address = models.TextField(blank=True, null=True)  # Legacy field
    wallet_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00
    )
    total_earnings = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00
    )
    total_products = models.IntegerField(default=0)
    total_orders_fulfilled = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Seller Profile'
        verbose_name_plural = 'Seller Profiles'
    
    def __str__(self):
        return f"{self.get_store_name()} - {self.user.email}"
    
    def get_store_name(self):
        if self.store_name:
            return self.store_name
        return f"{self.user.first_name}'s Store" if self.user.first_name else f"{self.user.email.split('@')[0]}'s Store"
    
    def add_earnings(self, amount):
        self.wallet_balance += amount
        self.total_earnings += amount
        self.save()
    
    def increment_order_count(self):
        self.total_orders_fulfilled += 1
        self.save()
    
    @property
    def has_store_locations(self):
        return self.user.store_locations.filter(is_active=True).exists()
    
    @property
    def primary_location(self):
        return self.user.store_locations.filter(is_primary=True, is_active=True).first()