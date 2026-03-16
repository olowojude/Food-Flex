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
from rest_framework.permissions import IsAuthenticated
from credits.sms_utils import send_kudisms_otp, verify_kudisms_otp
import logging

logger = logging.getLogger(__name__)


# Login page
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

    user = None
    try:
        user = User.objects.get(email__iexact=email_or_username)
    except User.DoesNotExist:
        try:
            user = User.objects.get(username__iexact=email_or_username)
        except User.DoesNotExist:
            pass

    if user:
        authenticated_user = authenticate(username=user.username, password=password)

        if authenticated_user:
            if not authenticated_user.is_active:
                return Response(
                    {'error': 'Your account has been disabled. Please contact support.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            refresh = RefreshToken.for_user(authenticated_user)
            refresh['email'] = authenticated_user.email
            refresh['role'] = authenticated_user.role
            refresh['first_name'] = authenticated_user.first_name
            refresh['last_name'] = authenticated_user.last_name

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


# Register page
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
        user = serializer.save()
        user.role = 'BUYER'
        user.save()

        refresh = RefreshToken.for_user(user)
        refresh['email'] = user.email
        refresh['role'] = user.role
        refresh['first_name'] = user.first_name
        refresh['last_name'] = user.last_name

        return Response({
            'user': UserProfileSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'message': 'Registration successful! You can now start shopping.'
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# User logout
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


# Get or update user profile
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


# Change user password
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)

    if serializer.is_valid():
        user = request.user

        if not user.check_password(serializer.data.get('old_password')):
            return Response(
                {'error': 'Old password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.data.get('new_password'))
        user.save()

        return Response(
            {'message': 'Password changed successfully'},
            status=status.HTTP_200_OK
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# View seller profile
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


# Update seller profile
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


# Lists all users in admin page
@api_view(['GET'])
@permission_classes([IsAdmin])
def list_users(request):
    role = request.query_params.get('role')
    queryset = User.objects.all()

    if role:
        queryset = queryset.filter(role=role)

    serializer = UserProfileSerializer(queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# View specific user details in admin page
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
    try:
        user = User.objects.get(id=user_id)
        data = request.data

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
    try:
        user = User.objects.get(id=user_id)

        if user.id == request.user.id:
            return Response(
                {'error': 'You cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )

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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_verification_status(request):
    """Get current user's verification status."""
    user = request.user

    return Response({
        'phone_number': user.phone_number,
        'phone_verified': user.phone_verified,
        'phone_verified_at': user.phone_verified_at.isoformat() if user.phone_verified_at else None,

        'bvn_number': user.bvn_number[-4:] if user.bvn_number else None,  # Last 4 digits only
        'bvn_verified': user.bvn_verified,
        'bvn_verified_at': user.bvn_verified_at.isoformat() if user.bvn_verified_at else None,

        'is_fully_verified': user.is_fully_verified(),
        'can_checkout': user.can_checkout() if user.role == 'BUYER' else None,
        'can_withdraw': user.can_withdraw() if user.role == 'SELLER' else None,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_phone_verification_otp(request):
    """
    Send OTP to user's phone via Kudisms OTP API.
    Kudisms generates and sends the OTP themselves.
    We store the verification_id they return for use during verification.
    """
    user = request.user

    if not user.phone_number:
        return Response(
            {'error': 'No phone number found. Please add a phone number in Personal Info first.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if user.phone_verified:
        return Response(
            {'error': 'Phone number is already verified.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Ask Kudisms to send the OTP
    success, result = send_kudisms_otp(user.phone_number)

    if success:
        # result is the verification_id string
        verification_id = result
        user.set_kudisms_verification_id(verification_id)

        logger.info(f"Kudisms OTP sent for user {user.id}, phone {user.phone_number}")

        return Response({
            'success': True,
            'message': f'OTP sent to {user.phone_number}. Valid for 10 minutes.',
        }, status=status.HTTP_200_OK)
    else:
        # result is an error dict
        logger.error(f"Failed to send Kudisms OTP for user {user.id}: {result}")
        return Response(
            {'error': result.get('error', 'Failed to send OTP. Please try again.')},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_phone_otp(request):
    """
    Verify OTP entered by user against Kudisms verifyotp API.
    On success, marks the phone as verified and clears the stored verification_id.
    """
    user = request.user
    otp_input = request.data.get('otp')

    if not otp_input:
        return Response(
            {'error': 'OTP is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not user.kudisms_verification_id:
        return Response(
            {'error': 'No OTP request found. Please request a new OTP first.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify against Kudisms
    success, message = verify_kudisms_otp(user.kudisms_verification_id, otp_input)

    if success:
        # Mark phone verified and clear the verification_id
        user.mark_phone_verified()

        logger.info(f"Phone verified for user {user.id}")

        return Response({
            'success': True,
            'message': 'Phone verified successfully!',
            'phone_verified': True,
            'phone_verified_at': user.phone_verified_at.isoformat(),
        }, status=status.HTTP_200_OK)
    else:
        return Response(
            {'error': message},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_bvn(request):
    """
    Submit BVN for verification. Pending admin review.
    """
    user = request.user
    bvn = request.data.get('bvn')

    if not bvn:
        return Response(
            {'error': 'BVN is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not bvn.isdigit() or len(bvn) != 11:
        return Response(
            {'error': 'Invalid BVN. Must be exactly 11 digits.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if user.bvn_verified:
        return Response(
            {'error': 'BVN is already verified.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.bvn_number = bvn
    user.save(update_fields=['bvn_number'])

    logger.info(f"BVN submitted for user {user.id}")

    return Response({
        'success': True,
        'message': 'BVN submitted successfully. Verification pending admin review.',
        'bvn_last_4': bvn[-4:],
        'status': 'pending',
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_bvn(request):
    """
    Verify BVN (webhook from external BVN verification service).
    """
    user_id = request.data.get('user_id')
    verification_status = request.data.get('status')

    try:
        user = User.objects.get(id=user_id)

        if verification_status == 'verified':
            user.bvn_verified = True
            user.bvn_verified_at = timezone.now()
            user.save(update_fields=['bvn_verified', 'bvn_verified_at'])

            logger.info(f"BVN verified for user {user_id}")

            return Response({
                'success': True,
                'message': 'BVN verified successfully',
            }, status=status.HTTP_200_OK)
        else:
            logger.warning(f"BVN verification failed for user {user_id}")
            return Response({
                'success': False,
                'message': 'BVN verification failed',
            }, status=status.HTTP_400_BAD_REQUEST)

    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_verify_bvn(request, user_id):
    """
    Admin endpoint to manually approve a submitted BVN.
    """
    try:
        user = User.objects.get(id=user_id)

        if not user.bvn_number:
            return Response(
                {'error': 'User has not submitted a BVN yet'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.bvn_verified = True
        user.bvn_verified_at = timezone.now()
        user.save(update_fields=['bvn_verified', 'bvn_verified_at'])

        logger.info(f"BVN manually verified by admin for user {user_id}")

        return Response({
            'success': True,
            'message': f'BVN verified for {user.get_full_name()}',
            'user': {
                'id': user.id,
                'name': user.get_full_name(),
                'bvn_last_4': user.bvn_number[-4:],
                'bvn_verified': user.bvn_verified,
                'bvn_verified_at': user.bvn_verified_at.isoformat(),
            }
        }, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )