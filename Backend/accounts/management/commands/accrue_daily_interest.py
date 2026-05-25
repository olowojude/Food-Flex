from django.core.management.base import BaseCommand
from django.utils import timezone
from orders.models import Order
from decimal import Decimal


class Command(BaseCommand):
    help = 'Accrue daily interest on all active BNPL loans (calendar-day based)'

    def handle(self, *args, **options):
        today = timezone.now().date()

        # Find all active loans
        active_loans = Order.objects.filter(
            upfront_payment_status='PAID',
            is_fully_paid=False,
            is_cancelled=False,
            loan_start_date__isnull=False,
            status__in=['CONFIRMED', 'COMPLETED'],
        )

        total_updated = 0
        total_interest_accrued = Decimal('0.00')

        self.stdout.write(
            self.style.SUCCESS(
                f"\n{'='*60}\n"
                f"  Daily Interest Accrual — {today}\n"
                f"  Run at: {timezone.now().strftime('%H:%M:%S %Z')}\n"
                f"{'='*60}\n"
            )
        )

        for order in active_loans:
            try:
                old_interest = order.accrued_interest

                # ── This now uses calendar days after the fix ──
                order.update_accrued_interest()

                new_interest = order.accrued_interest
                interest_added_today = new_interest - old_interest

                # Skip orders where nothing changed
                # (e.g. command accidentally run twice in same day)
                if interest_added_today <= 0:
                    self.stdout.write(
                        f"⏭  Order #{order.order_number}: already accrued today, skipped.\n"
                    )
                    continue

                total_updated += 1
                total_interest_accrued += interest_added_today

                # Status indicator
                if order.is_overdue:
                    status_icon = '🔴'
                    status_label = 'OVERDUE'
                elif order.is_in_grace_period:
                    status_icon = '🟠'
                    status_label = 'GRACE PERIOD'
                else:
                    status_icon = '🟢'
                    status_label = 'ACTIVE'

                self.stdout.write(
                    f"\n{status_icon} Order #{order.order_number}:\n"
                    f"   Buyer:             {order.buyer.get_full_name()}\n"
                    f"   Status:            {status_label}\n"
                    f"   Loan started:      {order.loan_start_date.date()}\n"
                    f"   Calendar day:      {order.days_elapsed} / 30\n"
                    f"   Interest today:    ₦{float(interest_added_today):,.2f}\n"
                    f"   Total accrued:     ₦{float(new_interest):,.2f}\n"
                    f"   Remaining princ.:  ₦{float(order.remaining_principal):,.2f}\n"
                    f"   Total due:         ₦{float(order.total_amount_due):,.2f}\n"
                    f"   Due date:          {order.loan_due_date.date() if order.loan_due_date else 'N/A'}\n"
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
                f"  Orders updated today:       {total_updated}\n"
                f"  Total interest accrued:     ₦{float(total_interest_accrued):,.2f}\n"
                f"  Run completed at:           {timezone.now().strftime('%H:%M:%S')}\n"
                f"{'='*60}\n"
            )
        )

        if total_updated == 0:
            self.stdout.write(self.style.WARNING("No active loans updated."))