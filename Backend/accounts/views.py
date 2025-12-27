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
from accounts.permissions import IsAdmin, IsSeller, IsBuyer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from accounts.permissions import IsAdmin
from .models import User
from .serializers import UserProfileSerializer


# For user registration
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    data = request.data.copy()
    if 'email' in data:
        data['email'] = data['email'].lower().strip()
    if 'username' in data:
        data['username'] = data['username'].lower().strip()
    
    serializer = UserRegistrationSerializer(data=data)
    
    if serializer.is_valid():
        # Create user with BUYER role
        user = serializer.save()
        user.role = 'BUYER'  # Explicitly set to BUYER
        user.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserProfileSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'message': 'Registration successful! You can now start shopping.'
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


#Login
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    email_or_username = request.data.get('email', '').lower().strip()
    password = request.data.get('password')
    
    if not email_or_username or not password:
        return Response(
            {'error': 'Please provide both email/username and password'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Try to find user by email or username (case-insensitive)
    user = None
    try:
        # Try email first
        user = User.objects.get(email__iexact=email_or_username)
    except User.DoesNotExist:
        # Try username
        try:
            user = User.objects.get(username__iexact=email_or_username)
        except User.DoesNotExist:
            pass
    
    # If user found, check password
    if user:
        # Authenticate with username
        authenticated_user = authenticate(username=user.username, password=password)
        
        if authenticated_user:
            # Check if user is active
            if not authenticated_user.is_active:
                return Response(
                    {'error': 'Your account has been disabled. Please contact support.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(authenticated_user)
            
            return Response({
                'user': UserProfileSerializer(authenticated_user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'message': f'Welcome back, {authenticated_user.first_name or authenticated_user.username}!'
            }, status=status.HTTP_200_OK)
    
    return Response(
        {'error': 'Invalid email/username or password'},
        status=status.HTTP_401_UNAUTHORIZED
    )


#User logout
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout(request):
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


#Get or update user profile
@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def user_profile(request):
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


#Change user password
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
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


# @api_view(['POST'])
# @permission_classes([permissions.IsAuthenticated])
# def apply_for_seller(request):
#     #Buyer applies to become a seller
#     user = request.user
    
#     # Check if user is already a seller
#     if user.role == 'SELLER':
#         return Response(
#             {'error': 'You are already a seller'},
#             status=status.HTTP_400_BAD_REQUEST
#         )
    
#     # Check if already applied
#     if hasattr(user, 'seller_profile'):
#         return Response(
#             {'error': 'You have already applied. Waiting for approval.'},
#             status=status.HTTP_400_BAD_REQUEST
#         )
    
#     serializer = SellerApplicationSerializer(data=request.data)
    
#     if serializer.is_valid():
#         with transaction.atomic():
#             # Create seller profile (pending approval)
#             SellerProfile.objects.create(
#                 user=user,
#                 **serializer.validated_data
#             )
            
#             return Response(
#                 {'message': 'Application submitted successfully. Awaiting admin approval.'},
#                 status=status.HTTP_201_CREATED
#             )
    
#     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


#View seller profile
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def seller_profile(request):
    user = request.user
    
    if not hasattr(user, 'seller_profile'):
        return Response(
            {'error': 'Seller profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = SellerProfileSerializer(user.seller_profile)
    return Response(serializer.data, status=status.HTTP_200_OK)


#Update seller profile
@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_seller_profile(request):
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


# #Admin approves seller application
# @api_view(['POST'])
# @permission_classes([IsAdmin])
# def approve_seller(request, user_id):
#     try:
#         user = User.objects.get(id=user_id)
        
#         if not hasattr(user, 'seller_profile'):
#             return Response(
#                 {'error': 'User has not applied to be a seller'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         if user.role == 'SELLER':
#             return Response(
#                 {'error': 'User is already approved as a seller'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         with transaction.atomic():
#             # Convert to seller
#             user.role = 'SELLER'
#             user.save()
            
#             # Disable credit account (sellers don't use credits)
#             if hasattr(user, 'credit_account'):
#                 credit_account = user.credit_account
#                 credit_account.loan_status = 'SUSPENDED'
#                 credit_account.save()
        
#         return Response(
#             {
#                 'message': f'{user.get_full_name()} approved as seller',
#                 'user': UserProfileSerializer(user).data
#             },
#             status=status.HTTP_200_OK
#         )
        
#     except User.DoesNotExist:
#         return Response(
#             {'error': 'User not found'},
#             status=status.HTTP_404_NOT_FOUND
#         )


#Lists all users with optional role filter in admin page
@api_view(['GET'])
@permission_classes([IsAdmin])
def list_users(request):
    role = request.query_params.get('role')
    queryset = User.objects.all()
    
    if role:
        queryset = queryset.filter(role=role)
    
    serializer = UserProfileSerializer(queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


#View specific user details in admin page
@api_view(['GET'])
@permission_classes([IsAdmin])
def user_detail(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        serializer = UserProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    


@api_view(['PATCH', 'PUT'])
@permission_classes([IsAdmin])
def update_user(request, user_id):
    """Admin updates any user's information"""
    try:
        user = User.objects.get(id=user_id)
        
        # Get data from request
        data = request.data
        
        # Update basic fields
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'phone_number' in data:
            user.phone_number = data['phone_number']
        if 'address' in data:
            user.address = data['address']
        if 'role' in data:
            user.role = data['role']
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'is_verified' in data:
            user.is_verified = data['is_verified']
        
        user.save()
        
        return Response(
            {
                'message': 'User updated successfully',
                'user': UserProfileSerializer(user).data
            },
            status=status.HTTP_200_OK
        )
        
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    

@api_view(['DELETE'])
@permission_classes([IsAdmin])
def delete_user(request, user_id):
    """Admin deletes a user"""
    try:
        user = User.objects.get(id=user_id)
        
        # Prevent deleting yourself
        if user.id == request.user.id:
            return Response(
                {'error': 'You cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevent deleting other admins (optional safety measure)
        if user.role == 'ADMIN' and not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can delete admin accounts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_email = user.email
        user.delete()
        
        return Response(
            {'message': f'User {user_email} deleted successfully'},
            status=status.HTTP_200_OK
        )
        
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )



# Google OAuth (placeholder - not implemented)
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def google_login(request):
    """Google OAuth login - Not implemented yet"""
    return Response(
        {'error': 'Google login not implemented yet'},
        status=status.HTTP_501_NOT_IMPLEMENTED
    )