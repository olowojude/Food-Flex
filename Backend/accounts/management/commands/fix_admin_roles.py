from django.core.management.base import BaseCommand
from accounts.models import User

class Command(BaseCommand):
    help = 'Ensures all superusers have ADMIN role'

    def handle(self, *args, **kwargs):
        superusers = User.objects.filter(is_superuser=True)
        count = 0
        
        for user in superusers:
            if user.role != 'ADMIN':
                user.role = 'ADMIN'
                user.save()
                count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Set {user.email} to ADMIN role')
                )
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('All superusers already have ADMIN role')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Updated {count} superuser(s) to ADMIN role')
            )