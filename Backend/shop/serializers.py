
from rest_framework import serializers
from .models import Category, Product, ProductReview
from accounts.models import StoreLocation
import logging

logger = logging.getLogger(__name__)


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'is_active', 'product_count', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']
    
    def validate_name(self, value):
        category_id = self.instance.id if self.instance else None
        if Category.objects.filter(name__iexact=value).exclude(id=category_id).exists():
            raise serializers.ValidationError("A category with this name already exists.")
        return value


class StoreLocationSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    store_name = serializers.CharField(read_only=True)
    address = serializers.CharField(read_only=True)
    city = serializers.CharField(read_only=True)
    state = serializers.CharField(read_only=True)
    phone_number = serializers.CharField(read_only=True)
    is_primary = serializers.BooleanField(read_only=True)
    full_address = serializers.SerializerMethodField()
    
    def get_full_address(self, obj):
        return f"{obj.address}, {obj.city}, {obj.state}, {obj.country}"


class SellerInfoSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(source='phone_number', read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    store_name = serializers.SerializerMethodField()
    business_name = serializers.SerializerMethodField()
    business_address = serializers.SerializerMethodField()
    city = serializers.CharField(read_only=True)
    state = serializers.CharField(read_only=True)
    
    primary_location = serializers.SerializerMethodField()
    other_locations = serializers.SerializerMethodField()
    
    def get_store_name(self, obj):
        # Try to get from primary store location first
        try:
            primary_location = obj.store_locations.filter(
                is_primary=True, 
                is_active=True
            ).first()
            if primary_location:
                return primary_location.store_name
        except Exception as e:
            logger.exception("Error fetching primary location")

        
        # Fallback to seller profile or generated name
        if hasattr(obj, 'seller_profile') and obj.seller_profile:
            profile = obj.seller_profile
            if hasattr(profile, 'get_store_name'):
                return profile.get_store_name()
            if profile.business_name:
                return profile.business_name
        
        # Generate from first name or email
        if obj.first_name:
            return f"{obj.first_name}'s Store"
        
        return f"{obj.email.split('@')[0]}'s Store"
    
    def get_business_name(self, obj):
        if hasattr(obj, 'seller_profile') and obj.seller_profile:
            return obj.seller_profile.business_name
        return self.get_store_name(obj)
    
    def get_business_address(self, obj):
        # Try to get from primary store location first
        try:
            primary_location = obj.store_locations.filter(
                is_primary=True, 
                is_active=True
            ).first()
            if primary_location:
                return primary_location.address
        except:
            pass
        
        # Fallback to seller profile
        if hasattr(obj, 'seller_profile') and obj.seller_profile:
            if obj.seller_profile.business_address:
                return obj.seller_profile.business_address
        
        if obj.address:
            return obj.address
        
        return "Location not specified"
    
    def get_primary_location(self, obj):
        try:
            primary_location = obj.store_locations.filter(
                is_primary=True,
                is_active=True
            ).first()
            
            if primary_location:
                return StoreLocationSerializer(primary_location).data
        except Exception as e:
            logger.exception("Error getting primary location")
        
        return None
    
    def get_other_locations(self, obj):
        try:
            other_locations = obj.store_locations.filter(
                is_primary=False,
                is_active=True
            ).order_by('created_at')
            
            if other_locations.exists():
                return StoreLocationSerializer(other_locations, many=True).data
        except Exception as e:
            logger.exception("Error getting other locations")        
        return []


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    seller_name = serializers.SerializerMethodField()
    seller_store_name = serializers.SerializerMethodField()
    seller_city = serializers.CharField(source='seller.city', read_only=True)
    seller_state = serializers.CharField(source='seller.state', read_only=True)
    average_rating = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name',
            'seller', 'seller_name', 'seller_store_name',
            'seller_city', 'seller_state',
            'price', 'formatted_price',
            'stock_quantity', 'is_in_stock', 'main_image',
            'weight', 'unit', 'is_featured', 'views_count',
            'sales_count', 'average_rating', 'created_at'
        ]
        read_only_fields = ['slug', 'seller', 'views_count', 'sales_count']
    
    def get_seller_name(self, obj):
        return obj.seller.get_full_name()
    
    def get_seller_store_name(self, obj):
        # Try primary location first
        try:
            primary_location = obj.seller.store_locations.filter(
                is_primary=True,
                is_active=True
            ).first()
            if primary_location:
                return primary_location.store_name
        except:
            pass
        
        # Fallback to generated name
        if hasattr(obj.seller, 'seller_profile') and obj.seller.seller_profile:
            profile = obj.seller.seller_profile
            if hasattr(profile, 'get_store_name'):
                return profile.get_store_name()
            if profile.business_name:
                return profile.business_name
        
        if obj.seller.first_name:
            return f"{obj.seller.first_name}'s Store"
        
        return f"{obj.seller.email.split('@')[0]}'s Store"


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    seller = serializers.SerializerMethodField()
    average_rating = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'price', 'formatted_price',
            'stock_quantity', 'is_in_stock', 'main_image', 'additional_images',
            'category', 'seller',
            'is_active', 'is_featured', 'views_count', 'sales_count',
            'average_rating', 'created_at'
        ]
    
    def get_seller(self, obj):
        return {
            'id': obj.seller.id,
            'store_name': f"{obj.seller.first_name}'s Store" if obj.seller.first_name else f"{obj.seller.email.split('@')[0]}'s Store",
            'email': obj.seller.email,
            'phone_number': obj.seller.phone_number,
            'city': obj.seller.city,
            'state': obj.seller.state,
        }


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    seller_info = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()
    average_rating = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'category',
            'seller', 'seller_info', 'price', 'formatted_price', 'stock_quantity',
            'is_in_stock', 'main_image', 'additional_images',
            'weight', 'unit', 'is_active', 'is_featured',
            'views_count', 'sales_count',
            'reviews', 'average_rating',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'seller', 'views_count', 'sales_count', 'created_at', 'updated_at']
    
    def get_seller_info(self, obj):
        return SellerInfoSerializer(obj.seller).data
    
    def get_reviews(self, obj):
        reviews = obj.reviews.select_related('buyer').order_by('-created_at')[:10]
        return ProductReviewSerializer(reviews, many=True).data


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Product
        fields = [
            'name', 'description', 'category', 'price',
            'stock_quantity', 'main_image', 'additional_images',
            'weight', 'unit', 'is_active'
        ]
    
    def validate_main_image(self, value):
        if not value:
            raise serializers.ValidationError("Main image is required")
        if not value.startswith('http'):
            raise serializers.ValidationError("Invalid image URL. Must start with http:// or https://")
        return value
    
    def validate_additional_images(self, value):
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
        if not value.is_active:
            raise serializers.ValidationError("Cannot assign product to inactive category")
        return value


class ProductReviewSerializer(serializers.ModelSerializer):
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


class ProductReviewCreateUpdateSerializer(serializers.ModelSerializer):
    
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