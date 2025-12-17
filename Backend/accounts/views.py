from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db import transaction
from django.utils import timezone
from .models import User, SellerProfile
from .serializers import (
    UserRegistrationSerializer, UserProfileSerializer,
    SellerProfileSerializer, SellerApplicationSerializer,
    UserUpdateSerializer, ChangePasswordSerializer
)
from credits.models import CreditAccount
from orders.models import Cart
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings

#For user registration
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        # Saving the user like that - signals will handle the rest
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Registration successful',
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    """User login"""
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response(
            {'error': 'Please provide both email and password'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Authenticate user
    user = authenticate(username=email, password=password)
    
    if not user:
        # Try with email lookup
        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass
    
    if user:
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_200_OK)
    
    return Response(
        {'error': 'Invalid credentials'},
        status=status.HTTP_401_UNAUTHORIZED
    )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout(request):
    """User logout"""
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response(
            {'message': 'Logged out successfully'},
            status=status.HTTP_200_OK
        )
    except Exception:
        return Response(
            {'error': 'Invalid token'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def user_profile(request):
    """Get or update user profile"""
    user = request.user
    
    if request.method == 'GET':
        serializer = UserProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                UserProfileSerializer(user).data,
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """Change user password"""
    serializer = ChangePasswordSerializer(data=request.data)
    
    if serializer.is_valid():
        user = request.user
        
        # Check old password
        if not user.check_password(serializer.data.get('old_password')):
            return Response(
                {'error': 'Old password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set new password
        user.set_password(serializer.data.get('new_password'))
        user.save()
        
        return Response(
            {'message': 'Password changed successfully'},
            status=status.HTTP_200_OK
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def apply_for_seller(request):
    """Buyer applies to become a seller"""
    user = request.user
    
    # Check if user is already a seller
    if user.role == User.UserRole.SELLER:
        return Response(
            {'error': 'You are already a seller'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if already applied
    if hasattr(user, 'seller_profile'):
        return Response(
            {'error': 'You have already applied. Waiting for approval.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = SellerApplicationSerializer(data=request.data)
    
    if serializer.is_valid():
        with transaction.atomic():
            # Create seller profile (pending approval)
            SellerProfile.objects.create(
                user=user,
                **serializer.validated_data
            )
            
            return Response(
                {'message': 'Application submitted successfully. Awaiting admin approval.'},
                status=status.HTTP_201_CREATED
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def seller_profile(request):
    """View seller profile"""
    user = request.user
    
    if not hasattr(user, 'seller_profile'):
        return Response(
            {'error': 'Seller profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = SellerProfileSerializer(user.seller_profile)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_seller_profile(request):
    """Update seller profile"""
    user = request.user
    
    if not hasattr(user, 'seller_profile'):
        return Response(
            {'error': 'Seller profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = SellerProfileSerializer(
        user.seller_profile,
        data=request.data,
        partial=True
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Admin Views
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def approve_seller(request, user_id):
    """Admin approves seller application"""
    # Check if user is admin
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can approve sellers'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        user = User.objects.get(id=user_id)
        
        if not hasattr(user, 'seller_profile'):
            return Response(
                {'error': 'User has not applied to be a seller'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if user.role == User.UserRole.SELLER:
            return Response(
                {'error': 'User is already approved as a seller'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Convert to seller
            user.role = User.UserRole.SELLER
            user.is_seller_approved = True
            user.save()
            
            # Verify seller profile
            seller_profile = user.seller_profile
            seller_profile.is_verified = True
            seller_profile.verified_at = timezone.now()
            seller_profile.save()
            
            # Disable credit account (sellers don't use credits)
            if hasattr(user, 'credit_account'):
                credit_account = user.credit_account
                credit_account.loan_status = CreditAccount.LoanStatus.SUSPENDED
                credit_account.save()
        
        return Response(
            {
                'message': f'{user.get_full_name()} approved as seller',
                'user': UserProfileSerializer(user).data
            },
            status=status.HTTP_200_OK
        )
        
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_users(request):
    """Admin lists all users"""
    # Only admins can access
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can view all users'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    role = request.query_params.get('role')
    queryset = User.objects.all()
    
    if role:
        queryset = queryset.filter(role=role)
    
    serializer = UserProfileSerializer(queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_detail(request, user_id):
    """Admin views specific user details"""
    if not request.user.is_admin_user:
        return Response(
            {'error': 'Only admins can view user details'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        user = User.objects.get(id=user_id)
        serializer = UserProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def google_login(request):
    """Handle Google OAuth login/signup"""
    token = request.data.get('token')
    
    if not token:
        return Response(
            {'error': 'Google token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )
        
        # Check if token is from correct app
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            return Response(
                {'error': 'Invalid token issuer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extract user info from Google
        email = idinfo.get('email')
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')
        picture = idinfo.get('picture', '')
        
        if not email:
            return Response(
                {'error': 'Email not provided by Google'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Check if user exists
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email.split('@')[0],
                    'first_name': first_name,
                    'last_name': last_name,
                    'profile_image': picture,
                    'is_verified': True,  # Google accounts are pre-verified
                    'role': User.UserRole.BUYER
                }
            )
            
            # If user was just created, set up their account
            if created:
                # Set unusable password (they use Google OAuth)
                user.set_unusable_password()
                user.save()
                
                # Create credit account
                CreditAccount.objects.create(user=user)
                
                # Create cart
                Cart.objects.create(user=user)
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'is_new_user': created
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        # Invalid token
        return Response(
            {'error': 'Invalid Google token'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )