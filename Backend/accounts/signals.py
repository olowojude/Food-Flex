from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User
from credits.models import CreditAccount
from orders.models import Cart


@receiver(post_save, sender=User)
def create_user_dependencies(sender, instance, created, **kwargs):
    """
    Automatically create credit account and cart when a new buyer is created
    """
    if created:
        # Only create credit account and cart for BUYERS
        if instance.role == User.UserRole.BUYER:
            # Create credit account
            CreditAccount.objects.get_or_create(user=instance)
            
            # Create shopping cart
            Cart.objects.get_or_create(user=instance)
        
        # Superusers and admins don't need credit accounts or carts