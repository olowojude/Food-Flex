from django.core.management.base import BaseCommand
from django.utils import timezone
from orders.models import Order
from decimal import Decimal


class Command(BaseCommand):
    help = 'Accrue daily interest on all active BNPL loans'

    def handle(self, *args, **options):
        # Find all active loans (upfront paid, not fully repaid)
        active_loans = Order.objects.filter(
            upfront_payment_status='PAID',
            is_fully_paid=False,
            loan_start_date__isnull=False
        )

        total_updated = 0
        total_interest_accrued = Decimal('0.00')

        self.stdout.write(
            self.style.SUCCESS(
                f"\n{'='*60}\n"
                f"  Daily Interest Accrual - {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
                f"{'='*60}\n"
            )
        )

        for order in active_loans:
            try:
                # Update accrued interest
                old_interest = order.accrued_interest
                order.update_accrued_interest()
                
                new_interest = order.accrued_interest
                interest_today = new_interest - old_interest

                total_updated += 1
                total_interest_accrued += interest_today

                # Status indicator
                if order.is_overdue:
                    status_icon = '🔴'
                    status = 'OVERDUE'
                elif order.is_in_grace_period:
                    status_icon = '🟠'
                    status = 'GRACE'
                else:
                    status_icon = '🟢'
                    status = 'ACTIVE'

                self.stdout.write(
                    f"\n{status_icon} Order #{order.order_number}:\n"
                    f"   Buyer: {order.buyer.get_full_name()}\n"
                    f"   Status: {status}\n"
                    f"   Day {order.days_elapsed}/{30}\n"
                    f"   Interest today: ₦{float(interest_today):,.2f}\n"
                    f"   Total accrued: ₦{float(new_interest):,.2f}\n"
                    f"   Remaining principal: ₦{float(order.remaining_principal):,.2f}\n"
                    f"   Total due: ₦{float(order.total_amount_due):,.2f}\n"
                )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"❌ Error processing order {order.order_number}: {str(e)}"
                    )
                )

        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f"\n{'='*60}\n"
                f"  Summary:\n"
                f"  - Orders updated: {total_updated}\n"
                f"  - Total interest accrued today: ₦{float(total_interest_accrued):,.2f}\n"
                f"{'='*60}\n"
            )
        )

        if total_updated == 0:
            self.stdout.write(
                self.style.WARNING("No active loans found.")
            )