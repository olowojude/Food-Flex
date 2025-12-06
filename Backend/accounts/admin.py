from django.contrib import admin
from accounts.models import User, SellerProfile

# Register your models here.
admin.site.register(User)
admin.site.register(SellerProfile)