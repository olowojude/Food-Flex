from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    """
    Permission class for Admin users.
    Allows access if user is authenticated and has ADMIN role or is superuser.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'ADMIN' or request.user.is_superuser)
        )


class IsSeller(BasePermission):
    """
    Permission class for Seller users.
    Allows access if user is authenticated and has SELLER role.
    """
    def has_permission(self, request, view):
        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # User must have SELLER role
        if request.user.role != 'SELLER':
            return False
        
        # Check if seller profile exists (no approval check)
        return hasattr(request.user, 'seller_profile')
    


class IsBuyer(BasePermission):
    """
    Permission class for Buyer users.
    Allows access if user is authenticated and has BUYER role.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'BUYER'
        )


class IsSellerOrAdmin(BasePermission):
    """
    Permission class for Seller or Admin users.
    Useful for endpoints that both sellers and admins should access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin access
        if request.user.role == 'ADMIN' or request.user.is_superuser:
            return True
        
        # Seller access (must be approved)
        if request.user.role == 'SELLER':
            try:
                return request.user.seller_profile.is_approved
            except AttributeError:
                return False
        
        return False