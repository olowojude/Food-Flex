

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from orders.models import Order


class Command(BaseCommand):
    help = 'Auto-cancel orders that are pending for more than 3 days'

    def handle(self, *args, **options):
        # Find pending orders older than 3 days
        three_days_ago = timezone.now() - timedelta(days=3)
        
        expired_orders = Order.objects.filter(
            status=Order.OrderStatus.PENDING,
            is_cancelled=False,
            created_at__lte=three_days_ago
        )

        total_cancelled = 0
        total_refunded = 0

        self.stdout.write(
            self.style.SUCCESS(
                f"\n{'='*60}\n"
                f"  Auto-Cancel Expired Orders - {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
                f"{'='*60}\n"
            )
        )

        self.stdout.write(f"Found {expired_orders.count()} expired pending orders\n")

        for order in expired_orders:
            try:
                # Calculate days pending
                days_pending = (timezone.now() - order.created_at).days
                
                # Auto-cancel
                success, message, refunds = order.cancel_order_by_buyer(
                    buyer=order.buyer,
                    reason=f"Auto-cancelled: Order not confirmed within 3 days (pending for {days_pending} days)"
                )

                if success:
                    total_cancelled += 1
                    if isinstance(refunds, dict):
                        total_refunded += refunds.get('credit_refund', 0)
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"\n✅ Order #{order.order_number}:\n"
                            f"   Buyer: {order.buyer.get_full_name()}\n"
                            f"   Days pending: {days_pending}\n"
                            f"   Total: ₦{float(order.total_amount):,.2f}\n"
                            f"   Credit refunded: ₦{refunds.get('credit_refund', 0):,.2f}\n"
                            f"   Upfront to refund: ₦{refunds.get('upfront_refund', 0):,.2f}\n"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f"❌ Failed to cancel order {order.order_number}: {message}"
                        )
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
                f"  - Orders cancelled: {total_cancelled}\n"
                f"  - Total credit refunded: ₦{total_refunded:,.2f}\n"
                f"{'='*60}\n"
            )
        )

        if total_cancelled == 0:
            self.stdout.write(
                self.style.WARNING("No expired orders found.")
            )