from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView

urlpatterns = [
    # Commented out admin route because the admin page will be manage via frontend
    path('admin/', admin.site.urls),
    # path('admin/', RedirectView.as_view(url='http://localhost:3000/manage', permanent=False)),

    # API endpoints
    # path('api/auth/', include('accounts.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/shop/', include('shop.urls')),
    path('api/credits/', include('credits.urls')),
    path('api/orders/', include('orders.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)