from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, SellerProfile


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone_number', 'password', 'password2'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate_email(self, value):
        """change email to lowercase and check uniqueness (case-insensitive)"""
        email = value.lower().strip()
        
        # Check if email already exists (case-insensitive)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
        return email
    
    def validate_username(self, value):
        """Change username to lowercase and check uniqueness (case-insensitive)"""
        username = value.lower().strip()
        
        # Check if username already exists (case-insensitive)
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        
        return username
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        
        # Ensure email and username are lowercase
        validated_data['email'] = validated_data['email'].lower().strip()
        validated_data['username'] = validated_data['username'].lower().strip()
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_number=validated_data.get('phone_number', ''),
            password=validated_data['password'],
            role=User.UserRole.BUYER  # Default role
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'phone_number', 'role', 'profile_image',
            'address', 'is_verified', 'is_seller_approved',
            'date_joined'
        ]
        read_only_fields = ['id', 'username', 'email', 'role', 'is_verified', 'is_seller_approved', 'date_joined']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class SellerProfileSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = SellerProfile
        fields = [
            'id', 'user', 'business_name', 'business_description',
            'business_address', 'wallet_balance',
            'total_earnings', 'total_products', 'total_orders_fulfilled',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'wallet_balance', 'total_earnings', 'total_products',
            'total_orders_fulfilled', 'created_at', 'updated_at'
        ]


class SellerApplicationSerializer(serializers.Serializer):
    business_name = serializers.CharField(max_length=255)
    business_description = serializers.CharField()
    business_address = serializers.CharField()


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone_number',
            'profile_image', 'address'
        ]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({
                "new_password": "Password fields didn't match."
            })
        return attrs