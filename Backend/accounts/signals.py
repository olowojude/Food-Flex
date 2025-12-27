from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User
from credits.models import CreditAccount
from orders.models import Cart

#Automatically create credit account and cart when a new buyer is created
@receiver(post_save, sender=User)
def create_user_dependencies(sender, instance, created, **kwargs):



    if created:
        # To create credit account for only BUYERS
        if instance.role == User.UserRole.BUYER:
            # Create credit account
            CreditAccount.objects.get_or_create(user=instance)
            
            # Create shopping cart for buyers also
            Cart.objects.get_or_create(user=instance)
        