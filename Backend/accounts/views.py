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


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    """User registration"""
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        with transaction.atomic():
            user = serializer.save()
            
            # Create credit account for buyer
            CreditAccount.objects.create(user=user)
            
            # Create cart for buyer
            Cart.objects.create(user=user)
            
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