from django.db import models
from django.utils.text import slugify
from accounts.models import User
from django.conf import settings


class StoreLocation(models.Model):
    """
    Stores can have multiple pickup locations.
    Each location has GPS coordinates for distance calculation.
    """
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='store_locations',
        limit_choices_to={'role': 'SELLER'}
    )
    name = models.CharField(max_length=200, help_text="e.g., 'Wuse 2 Branch', 'Main Store'")
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    
    # GPS Coordinates for distance calculation
    latitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        help_text="GPS Latitude"
    )
    longitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        help_text="GPS Longitude"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Store Location'
        verbose_name_plural = 'Store Locations'
    
    def __str__(self):
        return f"{self.seller.first_name}'s Store - {self.name} ({self.city})"

class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    @property
    def product_count(self):
        return self.products.filter(is_active=True).count()


class Product(models.Model):    
    UNIT_CHOICES = (
        ('kg', 'Kilogram'),
        ('g', 'Gram'),
        ('l', 'Liter'),
        ('ml', 'Milliliter'),
        ('piece', 'Piece'),
        ('pack', 'Pack'),
        ('bag', 'Bag'),
    )
    
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

    store_locations = models.ManyToManyField(
        StoreLocation,
        related_name='products',
        blank=True,
        help_text="Select which store locations have this product"
    )

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='kg')
    
    main_image = models.URLField(max_length=500)
    additional_images = models.JSONField(default=list, blank=True)
    
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    
    views_count = models.IntegerField(default=0)
    sales_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
    
    @property
    def is_in_stock(self):
        return self.stock_quantity > 0
    
    @property
    def formatted_price(self):
        return f"₦{self.price:,.2f}"
    
    @property
    def average_rating(self):
        reviews = self.reviews.all()
        if reviews.exists():
            total = sum(review.rating for review in reviews)
            return round(total / reviews.count(), 1)
        return 0
    
    def reduce_stock(self, quantity):
        if self.stock_quantity >= quantity:
            self.stock_quantity -= quantity
            self.sales_count += quantity
            self.save()
            return True
        return False
    
    def increment_views(self):
        self.views_count += 1
        self.save(update_fields=['views_count'])


class ProductReview(models.Model):
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
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Product Review'
        verbose_name_plural = 'Product Reviews'
        ordering = ['-created_at']
        unique_together = ['product', 'buyer']
    
    def __str__(self):
        return f"{self.buyer.email} - {self.product.name} - {self.rating}★"
    

