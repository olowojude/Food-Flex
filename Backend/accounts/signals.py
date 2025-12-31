from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import User, SellerProfile
from credits.models import CreditAccount
from orders.models import Cart


@receiver(post_save, sender=User)
def create_user_dependencies(sender, instance, created, **kwargs):
    if created:
        if instance.role == User.UserRole.BUYER:
            CreditAccount.objects.get_or_create(user=instance)
            
            Cart.objects.get_or_create(user=instance)
        
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
    if instance.pk:
        try:
            old_user = User.objects.get(pk=instance.pk)
            old_role = old_user.role
            new_role = instance.role
            
            if old_role == User.UserRole.BUYER and new_role == User.UserRole.SELLER:
                instance._create_seller_profile = True
                
                if hasattr(instance, 'credit_account'):
                    instance.credit_account.loan_status = 'SUSPENDED'
                    instance.credit_account.save()
            
            elif old_role == User.UserRole.SELLER and new_role == User.UserRole.BUYER:
                instance._delete_seller_profile = True
        
        except User.DoesNotExist:
            pass


@receiver(post_save, sender=User)
def complete_role_change(sender, instance, created, **kwargs):
    if created:
        return
    
    if hasattr(instance, '_create_seller_profile') and instance._create_seller_profile:
        if not hasattr(instance, 'seller_profile'):
            SellerProfile.objects.create(
                user=instance,
                business_name=f"{instance.first_name or instance.username}'s Store",
                business_address=instance.address or "",
                store_name=f"{instance.first_name or instance.username}'s Store"
            )
            print(f"✅ Seller profile created for {instance.email}")
        
        delattr(instance, '_create_seller_profile')
    
    if hasattr(instance, '_delete_seller_profile') and instance._delete_seller_profile:
        if hasattr(instance, 'seller_profile'):
            instance.seller_profile.delete()
            print(f"✅ Seller profile deleted for {instance.email}")
        
        # Reactivate credit account
        if hasattr(instance, 'credit_account'):
            instance.credit_account.loan_status = 'ACTIVE'
            instance.credit_account.save()
        else:
            CreditAccount.objects.create(user=instance)
        
        if not hasattr(instance, 'cart'):
            Cart.objects.create(user=instance)
        
        delattr(instance, '_delete_seller_profile')