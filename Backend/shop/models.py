from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator
from accounts.models import User


class Category(models.Model):
    """Product categories"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True)
    image = models.URLField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
        ordering = ['name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(models.Model):
    """Products listed by sellers"""
    seller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='products',
        limit_choices_to={'role': 'SELLER'}
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name='products'
    )
    
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, blank=True)
    description = models.TextField()
    
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    
    stock_quantity = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    
    # Images - URLs uploaded from frontend
    main_image = models.URLField()
    additional_images = models.JSONField(default=list, blank=True)
    
    # Product attributes (optional)
    weight = models.CharField(max_length=50, blank=True, help_text="e.g., 1kg, 500g")
    unit = models.CharField(max_length=20, blank=True, help_text="e.g., pack, piece, kg")
    
    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    
    # Statistics
    views_count = models.PositiveIntegerField(default=0)
    sales_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['seller', 'is_active']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['slug']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.seller.get_full_name()}"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
    
    @property
    def is_in_stock(self):
        """Check if product has available stock"""
        return self.stock_quantity > 0
    
    @property
    def formatted_price(self):
        """Return formatted price with currency"""
        return f"₦{self.price:,.2f}"
    
    def reduce_stock(self, quantity):
        """Reduce stock after purchase"""
        if quantity > self.stock_quantity:
            raise ValueError(f"Insufficient stock. Available: {self.stock_quantity}")
        self.stock_quantity -= quantity
        self.sales_count += quantity
        self.save()
    
    def increment_views(self):
        """Increment product views"""
        self.views_count += 1
        self.save(update_fields=['views_count'])


class ProductReview(models.Model):
    """Product reviews by buyers"""
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reviews',
        limit_choices_to={'role': 'BUYER'}
    )
    
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Rating from 1 to 5"
    )
    comment = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_reviews'
        ordering = ['-created_at']
        unique_together = ['product', 'buyer']
        indexes = [
            models.Index(fields=['product', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.buyer.get_full_name()} - {self.product.name} ({self.rating}★)"