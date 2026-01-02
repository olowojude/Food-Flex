# backend/shop/serializers.py
# REPLACE the entire file with this corrected version

from rest_framework import serializers
from .models import Category, Product, ProductReview, StoreLocation


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


class SellerInfoSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(source='phone_number', read_only=True)
    store_name = serializers.SerializerMethodField()
    business_name = serializers.SerializerMethodField()
    business_address = serializers.SerializerMethodField()
    
    def get_store_name(self, obj):
        # Try to get from seller profile first
        if hasattr(obj, 'seller_profile') and obj.seller_profile:
            profile = obj.seller_profile
            # Use the get_store_name method if it exists
            if hasattr(profile, 'get_store_name'):
                return profile.get_store_name()
            # Otherwise use business_name
            if profile.business_name:
                return profile.business_name
        
        # Fallback to generating from user's first name
        if obj.first_name:
            return f"{obj.first_name}'s Store"
        
        # Last resort: use email
        return f"{obj.email.split('@')[0]}'s Store"
    
    def get_business_name(self, obj):
        if hasattr(obj, 'seller_profile') and obj.seller_profile:
            return obj.seller_profile.business_name
        return self.get_store_name(obj)
    
    def get_business_address(self, obj):
        if hasattr(obj, 'seller_profile') and obj.seller_profile:
            if obj.seller_profile.business_address:
                return obj.seller_profile.business_address
        
        # Fallback to user address
        if obj.address:
            return obj.address
        
        return "Location not specified"


# ============================================
# STORE LOCATION SERIALIZERS
# ============================================

class StoreLocationSerializer(serializers.ModelSerializer):
    """Serializer for store locations"""
    seller_name = serializers.CharField(source='seller.first_name', read_only=True)
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = StoreLocation
        fields = [
            'id', 'name', 'address', 'city', 'state',
            'latitude', 'longitude', 'is_active',
            'seller', 'seller_name', 'product_count',
            'created_at'
        ]
        read_only_fields = ['seller', 'created_at']
    
    def get_product_count(self, obj):
        """Count products available at this location"""
        return obj.products.filter(is_active=True, stock_quantity__gt=0).count()


class StoreLocationListSerializer(serializers.ModelSerializer):
    """Minimal serializer for listing store locations"""
    
    class Meta:
        model = StoreLocation
        fields = ['id', 'name', 'city', 'state']


# ============================================
# PRODUCT SERIALIZERS
# ============================================

class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    seller_name = serializers.SerializerMethodField()
    seller_store_name = serializers.SerializerMethodField()
    average_rating = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name',
            'seller', 'seller_name', 'seller_store_name', 'price', 'formatted_price',
            'stock_quantity', 'is_in_stock', 'main_image',
            'weight', 'unit', 'is_featured', 'views_count',
            'sales_count', 'average_rating', 'created_at'
        ]
        read_only_fields = ['slug', 'seller', 'views_count', 'sales_count']
    
    def get_seller_name(self, obj):
        return obj.seller.get_full_name()
    
    def get_seller_store_name(self, obj):
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
    """Main product serializer with location support"""
    category = CategorySerializer(read_only=True)
    seller = serializers.SerializerMethodField()
    store_locations = StoreLocationListSerializer(many=True, read_only=True)
    closest_store = serializers.SerializerMethodField()
    average_rating = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'price', 'formatted_price',
            'stock_quantity', 'is_in_stock', 'main_image', 'additional_images',
            'category', 'seller', 'store_locations', 'closest_store',
            'is_active', 'is_featured', 'views_count', 'sales_count',
            'average_rating', 'created_at'
        ]
    
    def get_seller(self, obj):
        return {
            'id': obj.seller.id,
            'store_name': f"{obj.seller.first_name}'s Store" if obj.seller.first_name else f"{obj.seller.email.split('@')[0]}'s Store",
            'email': obj.seller.email,
            'phone_number': obj.seller.phone_number,
        }
    
    def get_closest_store(self, obj):
        """
        If user location is in context, return closest store with distance.
        This is populated by the view when doing location-based search.
        """
        return self.context.get('closest_store', None)


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    seller_info = serializers.SerializerMethodField()
    store_locations = StoreLocationListSerializer(many=True, read_only=True)
    reviews = serializers.SerializerMethodField()
    average_rating = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'category',
            'seller', 'seller_info', 'price', 'formatted_price', 'stock_quantity',
            'is_in_stock', 'main_image', 'additional_images',
            'weight', 'unit', 'is_active', 'is_featured',
            'views_count', 'sales_count', 'store_locations',
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
    """Serializer for creating/updating products (sellers)"""
    store_locations = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=StoreLocation.objects.filter(is_active=True),
        required=False
    )
    
    class Meta:
        model = Product
        fields = [
            'name', 'description', 'category', 'price',
            'stock_quantity', 'main_image', 'additional_images',
            'weight', 'unit', 'is_active',
            'store_locations'  # Location support
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
    
    def validate_store_locations(self, value):
        """Ensure seller can only assign their own store locations"""
        user = self.context['request'].user
        
        for location in value:
            if location.seller != user:
                raise serializers.ValidationError(
                    "You can only assign your own store locations."
                )
        
        return value
    
    def create(self, validated_data):
        store_locations = validated_data.pop('store_locations', [])
        product = Product.objects.create(**validated_data)
        
        # Assign store locations
        if store_locations:
            product.store_locations.set(store_locations)
        
        return product
    
    def update(self, instance, validated_data):
        store_locations = validated_data.pop('store_locations', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update store locations if provided
        if store_locations is not None:
            instance.store_locations.set(store_locations)
        
        return instance


# ============================================
# PRODUCT REVIEW SERIALIZERS
# ============================================

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