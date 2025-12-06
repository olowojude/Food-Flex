from rest_framework import serializers
from .models import Category, Product, ProductReview
from accounts.serializers import UserProfileSerializer


class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'description', 'image',
            'is_active', 'products_count', 'created_at'
        ]
        read_only_fields = ['slug']
    
    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    seller_name = serializers.CharField(source='seller.get_full_name', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name',
            'seller', 'seller_name', 'price', 'formatted_price',
            'stock_quantity', 'is_in_stock', 'main_image',
            'weight', 'unit', 'is_featured', 'views_count',
            'sales_count', 'created_at'
        ]
        read_only_fields = ['slug', 'seller', 'views_count', 'sales_count']


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True
    )
    seller = UserProfileSerializer(read_only=True)
    reviews = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'category', 'category_id',
            'seller', 'price', 'formatted_price', 'stock_quantity',
            'is_in_stock', 'main_image', 'additional_images',
            'weight', 'unit', 'is_active', 'is_featured',
            'views_count', 'sales_count', 'reviews', 'average_rating',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'seller', 'views_count', 'sales_count']
    
    def get_reviews(self, obj):
        reviews = obj.reviews.all()[:5]  # Latest 5 reviews
        return ProductReviewSerializer(reviews, many=True).data
    
    def get_average_rating(self, obj):
        reviews = obj.reviews.all()
        if reviews.exists():
            total = sum(review.rating for review in reviews)
            return round(total / reviews.count(), 1)
        return 0


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'name', 'description', 'category', 'price',
            'stock_quantity', 'main_image', 'additional_images',
            'weight', 'unit', 'is_active', 'is_featured'
        ]
    
    def validate_main_image(self, value):
        if not value:
            raise serializers.ValidationError("Main image is required")
        if not value.startswith('http'):
            raise serializers.ValidationError("Invalid image URL")
        return value
    
    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        return value
    
    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock quantity cannot be negative")
        return value


class ProductReviewSerializer(serializers.ModelSerializer):
    buyer = UserProfileSerializer(read_only=True)
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    
    class Meta:
        model = ProductReview
        fields = [
            'id', 'product', 'buyer', 'buyer_name',
            'rating', 'comment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['buyer']
    
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value


class ProductReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReview
        fields = ['rating', 'comment']
    
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value