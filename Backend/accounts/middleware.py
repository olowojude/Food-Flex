from django.utils.deprecation import MiddlewareMixin

class AdminRoleMiddleware(MiddlewareMixin):
    '''
    Middleware to ensure superusers always have ADMIN role
    '''
    def process_request(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            if request.user.is_superuser and request.user.role != 'ADMIN':
                request.user.role = 'ADMIN'
                request.user.save(update_fields=['role'])
        return None