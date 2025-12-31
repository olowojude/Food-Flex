from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'ADMIN' or request.user.is_superuser)
        )


class IsSeller(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.role != 'SELLER':
            return False
        
        return hasattr(request.user, 'seller_profile')
    


class IsBuyer(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'BUYER'
        )


class IsSellerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.role == 'ADMIN' or request.user.is_superuser:
            return True
        
        if request.user.role == 'SELLER':
            try:
                return request.user.seller_profile.is_approved
            except AttributeError:
                return False
        
        return False