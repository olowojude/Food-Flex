from rest_framework import serializers
from .models import Category, Product, ProductReview
from accounts.serializers import UserProfileSerializer


class CategorySerializer(serializers.ModelSerializer):
    """Category Serializer - NO IMAGE FIELD"""
    product_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'is_active', 'product_count', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']
    
    def validate_name(self, value):
        """Check for duplicate names (case-insensitive)"""
        category_id = self.instance.id if self.instance else None
        if Category.objects.filter(name__iexact=value).exclude(id=category_id).exists():
            raise serializers.ValidationError("A category with this name already exists.")
        return value


class ProductListSerializer(serializers.ModelSerializer):
    """Serializer for product list view"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    seller_name = serializers.CharField(source='seller.get_full_name', read_only=True)
    seller_email = serializers.CharField(source='seller.email', read_only=True)
    average_rating = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name',
            'seller', 'seller_name', 'seller_email', 'price', 'formatted_price',
            'stock_quantity', 'is_in_stock', 'main_image',
            'weight', 'unit', 'is_featured', 'views_count',
            'sales_count', 'average_rating', 'created_at'
        ]
        read_only_fields = ['slug', 'seller', 'views_count', 'sales_count']


class ProductReviewSerializer(serializers.ModelSerializer):
    """Serializer for product reviews"""
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    buyer_email = serializers.CharField(source='buyer.email', read_only=True)
    
    class Meta:
        model = ProductReview
        fields = [
            'id', 'product', 'buyer', 'buyer_name', 'buyer_email',
            'rating', 'comment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['buyer', 'created_at', 'updated_at']
    
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value


class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single product view"""
    category = CategorySerializer(read_only=True)
    seller = UserProfileSerializer(read_only=True)
    reviews = ProductReviewSerializer(many=True, read_only=True)
    average_rating = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'category',
            'seller', 'price', 'formatted_price', 'stock_quantity',
            'is_in_stock', 'main_image', 'additional_images',
            'weight', 'unit', 'is_active', 'is_featured',
            'views_count', 'sales_count', 'reviews', 'average_rating',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'seller', 'views_count', 'sales_count', 'created_at', 'updated_at']


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating products"""
    
    class Meta:
        model = Product
        fields = [
            'name', 'description', 'category', 'price',
            'stock_quantity', 'main_image', 'additional_images',
            'weight', 'unit', 'is_active', 'is_featured'
        ]
    
    def validate_main_image(self, value):
        """Validate main image URL"""
        if not value:
            raise serializers.ValidationError("Main image is required")
        if not value.startswith('http'):
            raise serializers.ValidationError("Invalid image URL. Must start with http:// or https://")
        return value
    
    def validate_additional_images(self, value):
        """Validate additional images are URLs"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Additional images must be a list")
        for url in value:
            if not url.startswith('http'):
                raise serializers.ValidationError(f"Invalid image URL: {url}")
        return value
    
    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        return value
    
    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock quantity cannot be negative")
        return value
    
    def validate_category(self, value):
        """Ensure category exists and is active"""
        if not value.is_active:
            raise serializers.ValidationError("Cannot assign product to inactive category")
        return value


class ProductReviewCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating reviews"""
    
    class Meta:
        model = ProductReview
        fields = ['rating', 'comment']
    
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
    
    def validate_comment(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Comment must be at least 10 characters long")
        return value