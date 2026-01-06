from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, SellerProfile, StoreLocation


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
            'phone_number', 'country', 'state', 'city', 'address',
            'password', 'password2'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'country': {'required': True},
            'state': {'required': True},
            'city': {'required': True},
            'address': {'required': True},
        }
    
    def validate_email(self, value):
        email = value.lower().strip()
        
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
        return email
    
    def validate_username(self, value):
        username = value.lower().strip()
        
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
        
        validated_data['email'] = validated_data['email'].lower().strip()
        validated_data['username'] = validated_data['username'].lower().strip()
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_number=validated_data.get('phone_number', ''),
            country=validated_data['country'],
            state=validated_data['state'],
            city=validated_data['city'],
            address=validated_data['address'],
            password=validated_data['password'],
            role=User.UserRole.BUYER
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    full_location = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'phone_number', 'role', 'profile_image',
            'country', 'state', 'city', 'address', 'full_location',
            'is_verified', 'is_seller_approved', 'date_joined'
        ]
        read_only_fields = [
            'id', 'username', 'email', 'role', 'is_verified', 
            'is_seller_approved', 'date_joined'
        ]
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class StoreLocationSerializer(serializers.ModelSerializer):
    full_address = serializers.ReadOnlyField()
    
    class Meta:
        model = StoreLocation
        fields = [
            'id', 'store_name', 'country', 'state', 'city', 'address',
            'full_address', 'phone_number', 'is_primary', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_store_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Store name cannot be empty.")
        return value.strip()
    
    def validate_phone_number(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Phone number is required.")
        return value.strip()
    
    def validate_address(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Address is required.")
        return value.strip()
    
    def validate_city(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("City is required.")
        return value.strip()
    
    def validate_state(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("State is required.")
        return value.strip()
    
    def validate(self, attrs):
        # Ensure seller doesn't have duplicate locations (same city + state)
        request = self.context.get('request')
        if not request:
            return attrs
        
        seller = request.user
        
        # Get location details for duplicate checking
        city = attrs.get('city')
        state = attrs.get('state')
        address = attrs.get('address')
        
        # If we don't have all location details, skip this validation(individual field validations will catch missing required fields)
        if not all([city, state, address]):
            return attrs
        
        # Normalize for comparison
        city_lower = city.lower().strip()
        state_lower = state.lower().strip()
        address_lower = address.lower().strip()

        
        if self.instance:            
            duplicates = StoreLocation.objects.filter(
                seller=seller,
                city__iexact=city_lower,
                state__iexact=state_lower,
                address__iexact=address_lower,
                is_active=True
            ).exclude(pk=self.instance.pk)
                        
            if duplicates.exists():
                duplicate = duplicates.first()
                raise serializers.ValidationError({
                    "address": f"You already have a store location at this address in {city}, {state}."
                })
        else:
            # Check for duplicate location when creating
            existing_locations = StoreLocation.objects.filter(
                seller=seller,
                is_active=True
            )
        
            for loc in existing_locations:
                print(f"      - '{loc.store_name}' in {loc.city}, {loc.state} (ID: {loc.pk}, Primary: {loc.is_primary})")
            
            # Check if same address already exists
            duplicates = existing_locations.filter(
                city__iexact=city_lower,
                state__iexact=state_lower,
                address__iexact=address_lower
            )
                        
            if duplicates.exists():
                duplicate = duplicates.first()
                raise serializers.ValidationError({
                    "address": f"You already have a store location at '{duplicate.address}' in {city}, {state}. Store names can be the same, but addresses must be unique."
                })
        
        return attrs
    
    def create(self, validated_data):
        seller = validated_data.get('seller')
        
        # Check if this is the seller's first location
        existing_count = StoreLocation.objects.filter(
            seller=seller,
            is_active=True
        ).count()
        
        # If no existing locations, force this to be primary
        if existing_count == 0:
            validated_data['is_primary'] = True
        
        # If marked as primary, unmark all others
        if validated_data.get('is_primary', False):
            StoreLocation.objects.filter(
                seller=seller,
                is_active=True
            ).update(is_primary=False)
        
        location = super().create(validated_data)
        
        return location
    
    def update(self, instance, validated_data):
        # If this location is marked as primary, unmark all others
        if validated_data.get('is_primary', False):
            StoreLocation.objects.filter(
                seller=instance.seller,
                is_active=True
            ).exclude(pk=instance.pk).update(is_primary=False)
        
        location = super().update(instance, validated_data)
        
        return location


class SellerProfileSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    has_store_locations = serializers.ReadOnlyField()
    primary_location = StoreLocationSerializer(read_only=True)
    
    class Meta:
        model = SellerProfile
        fields = [
            'id', 'user', 'business_name', 'business_description',
            'business_address', 'wallet_balance',
            'total_earnings', 'total_products', 'total_orders_fulfilled',
            'has_store_locations', 'primary_location',
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
            'profile_image', 'country', 'state', 'city', 'address'
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