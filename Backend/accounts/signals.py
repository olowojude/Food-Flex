from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import User, SellerProfile
from credits.models import CreditAccount
from orders.models import Cart


@receiver(post_save, sender=User)
def create_user_dependencies(sender, instance, created, **kwargs):
    """
    Automatically create credit account and cart when a new buyer is created.
    Or create seller profile when a new seller is created.
    """
    if created:
        # Create credit account for only BUYERS
        if instance.role == User.UserRole.BUYER:
            # Create credit account
            CreditAccount.objects.get_or_create(user=instance)
            
            # Create shopping cart for buyers
            Cart.objects.get_or_create(user=instance)
        
        # Create seller profile for new SELLERS
        elif instance.role == User.UserRole.SELLER:
            if not hasattr(instance, 'seller_profile'):
                SellerProfile.objects.create(
                    user=instance,
                    business_name=f"{instance.first_name or instance.username}'s Store",
                    business_address=instance.address or "",
                    store_name=f"{instance.first_name or instance.username}'s Store"
                )


@receiver(pre_save, sender=User)
def handle_role_change_to_seller(sender, instance, **kwargs):
    """
    When admin changes a user's role to SELLER, prepare for seller profile creation.
    """
    # Only for existing users (not new ones)
    if instance.pk:
        try:
            old_user = User.objects.get(pk=instance.pk)
            old_role = old_user.role
            new_role = instance.role
            
            # Check if role changed from BUYER to SELLER
            if old_role == User.UserRole.BUYER and new_role == User.UserRole.SELLER:
                # Mark that we need to create seller profile after save
                instance._create_seller_profile = True
                
                # Suspend credit account
                if hasattr(instance, 'credit_account'):
                    instance.credit_account.loan_status = 'SUSPENDED'
                    instance.credit_account.save()
            
            # Check if role changed from SELLER to BUYER
            elif old_role == User.UserRole.SELLER and new_role == User.UserRole.BUYER:
                # Mark that we need to delete seller profile
                instance._delete_seller_profile = True
        
        except User.DoesNotExist:
            pass


@receiver(post_save, sender=User)
def complete_role_change(sender, instance, created, **kwargs):
    """
    Complete role change operations after user is saved.
    """
    # Don't run for newly created users (already handled above)
    if created:
        return
    
    # Create seller profile if marked
    if hasattr(instance, '_create_seller_profile') and instance._create_seller_profile:
        if not hasattr(instance, 'seller_profile'):
            SellerProfile.objects.create(
                user=instance,
                business_name=f"{instance.first_name or instance.username}'s Store",
                business_address=instance.address or "",
                store_name=f"{instance.first_name or instance.username}'s Store"
            )
            print(f"✅ Seller profile created for {instance.email}")
        
        # Clean up the marker
        delattr(instance, '_create_seller_profile')
    
    # Delete seller profile if marked
    if hasattr(instance, '_delete_seller_profile') and instance._delete_seller_profile:
        if hasattr(instance, 'seller_profile'):
            instance.seller_profile.delete()
            print(f"✅ Seller profile deleted for {instance.email}")
        
        # Reactivate credit account
        if hasattr(instance, 'credit_account'):
            instance.credit_account.loan_status = 'ACTIVE'
            instance.credit_account.save()
        else:
            # Create credit account if it doesn't exist
            CreditAccount.objects.create(user=instance)
        
        # Create cart if doesn't exist
        if not hasattr(instance, 'cart'):
            Cart.objects.create(user=instance)
        
        # Clean up the marker
        delattr(instance, '_delete_seller_profile')