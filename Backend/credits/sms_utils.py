"""
SMS Utility Functions using Kudisms API
https://my.kudisms.net/docs
"""
# sms_utils.py

import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_sms(phone_number, message):
    """
    Send SMS via Kudisms API

    Args:
        phone_number (str): Recipient phone number (e.g., '08012345678' or '+2348012345678')
        message (str): SMS message content (max 160 chars for single SMS)

    Returns:
        tuple: (success: bool, response: dict)
    """

    # Get credentials from settings
    api_token = settings.KUDISMS_API_TOKEN
    sender_id = settings.KUDISMS_SENDER_ID
    api_url = settings.KUDISMS_API_URL

    if not api_token or not sender_id:
        logger.error("Kudisms credentials not configured in settings")
        return False, {'error': 'SMS service not configured'}

    # Format phone number (remove +234, add 234 if missing)
    formatted_phone = format_phone_number(phone_number)

    if not formatted_phone:
        logger.error(f"Invalid phone number format: {phone_number}")
        return False, {'error': 'Invalid phone number format'}

    # Prepare API request
    url = f"{api_url}/sms"
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Content-Type': 'application/json',
    }

    payload = {
        'sender': sender_id,
        'recipients': [formatted_phone],  # Kudisms expects array
        'message': message,
    }

    try:
        logger.info(f"Sending SMS to {formatted_phone}")

        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()

        data = response.json()

        # Check if SMS was successful
        if data.get('status') == 'success' or response.status_code == 200:
            logger.info(f"SMS sent successfully to {formatted_phone}")
            return True, data
        else:
            logger.warning(f"SMS failed: {data}")
            return False, data

    except requests.exceptions.RequestException as e:
        logger.error(f"SMS API error: {str(e)}")
        return False, {'error': str(e)}
    except Exception as e:
        logger.error(f"Unexpected SMS error: {str(e)}")
        return False, {'error': str(e)}


def format_phone_number(phone):
    """
    Format phone number for Nigerian numbers.
    Converts: 08012345678  → 2348012345678
    Converts: +2348012345678 → 2348012345678
    Converts: 2348012345678  → 2348012345678

    Args:
        phone (str): Phone number in any format

    Returns:
        str: Formatted phone number or None if invalid
    """
    if not phone:
        return None

    # Remove spaces, dashes, parentheses
    phone = str(phone).strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

    # Remove leading +
    if phone.startswith('+'):
        phone = phone[1:]

    # If starts with 0, replace with 234
    if phone.startswith('0'):
        phone = '234' + phone[1:]

    # If doesn't start with 234, add it
    if not phone.startswith('234'):
        phone = '234' + phone

    # Validate length (234 + 10 digits = 13 chars)
    if len(phone) != 13:
        return None

    # Validate all digits
    if not phone.isdigit():
        return None

    return phone


def send_order_confirmation_sms(order):
    """
    Send order confirmation SMS to buyer with full seller pickup details.
    Only sends if the buyer's phone is verified.

    Resolves seller's primary StoreLocation for store name, address, city,
    state, and contact phone. Falls back gracefully if no location is set.

    Args:
        order (Order): Order instance

    Returns:
        tuple: (success: bool, response: dict)
    """
    buyer = order.buyer

    # Only send SMS to verified phone numbers
    if not getattr(buyer, 'phone_verified', False):
        logger.info(
            f"Order {order.order_number}: Skipping SMS - buyer phone not verified"
        )
        return False, {'error': 'Buyer phone not verified'}

    phone_number = getattr(buyer, 'phone_number', None)

    if not phone_number:
        logger.warning(f"Order {order.order_number}: Buyer has no phone number")
        return False, {'error': 'No phone number'}

    # ── Resolve seller's primary StoreLocation ──────────────────────
    seller = order.seller
    store_name = None
    pickup_address = None
    pickup_phone = None

    try:
        # Try primary StoreLocation first (set via set-primary endpoint)
        primary_location = seller.store_locations.filter(is_primary=True).first()

        if not primary_location:
            # Fall back to any store location
            primary_location = seller.store_locations.first()

        if primary_location:
            store_name = primary_location.store_name or None
            # Build full address: street + city + state
            address_parts = filter(None, [
                getattr(primary_location, 'address', None),
                getattr(primary_location, 'city', None),
                getattr(primary_location, 'state', None),
            ])
            pickup_address = ', '.join(address_parts) or None
            pickup_phone = getattr(primary_location, 'phone', None)

    except Exception as e:
        logger.warning(
            f"Order {order.order_number}: Could not resolve StoreLocation - {str(e)}"
        )

    # ── Graceful fallbacks ──────────────────────────────────────────
    if not store_name:
        store_name = (
            f"{seller.first_name}'s Store"
            if seller.first_name
            else seller.email
        )

    if not pickup_address:
        # Try legacy seller_profile.business_address
        if hasattr(seller, 'seller_profile'):
            profile = seller.seller_profile
            pickup_address = getattr(profile, 'business_address', None)

    if not pickup_address:
        pickup_address = 'Contact seller for address'

    if not pickup_phone:
        pickup_phone = getattr(seller, 'phone_number', 'N/A')

    # ── Count items ─────────────────────────────────────────────────
    item_count = order.items.count()
    items_label = f"{item_count} item{'s' if item_count != 1 else ''}"

    # ── Build SMS message ───────────────────────────────────────────
    # Kept tight to stay within 160-char single SMS limit where possible
    message = (
        f"FoodFlex Order Confirmed!\n"
        f"Order: {order.order_number}\n"
        f"Items: {items_label}\n"
        f"Store: {store_name}\n"
        f"Pickup: {pickup_address}\n"
        f"Tel: {pickup_phone}\n"
        f"Total Due: N{float(order.total_amount_due):,.0f}\n"
        f"Show QR code at pickup."
    )

    logger.info(
        f"Order {order.order_number}: Sending confirmation SMS to buyer "
        f"({buyer.email}) at {phone_number}"
    )

    return send_sms(phone_number, message)


def send_payment_reminder_sms(order):
    """
    Send payment reminder SMS for loans due soon.

    Args:
        order (Order): Order instance with active loan

    Returns:
        tuple: (success: bool, response: dict)
    """
    buyer = order.buyer
    phone_number = getattr(buyer, 'phone_number', None)

    if not phone_number:
        return False, {'error': 'No phone number'}

    days_remaining = order.days_remaining
    amount_due = float(order.total_amount_due)

    message = (
        f"FoodFlex Payment Reminder\n"
        f"Order: {order.order_number}\n"
        f"Amount Due: N{amount_due:,.0f}\n"
        f"Due in: {days_remaining} days\n"
        f"Pay now: {settings.FRONTEND_URL}/profile\n"
        f"Save on interest by paying early!"
    )

    return send_sms(phone_number, message)


def send_overdue_warning_sms(order):
    """
    Send overdue warning SMS.

    Args:
        order (Order): Overdue order

    Returns:
        tuple: (success: bool, response: dict)
    """
    buyer = order.buyer
    phone_number = getattr(buyer, 'phone_number', None)

    if not phone_number:
        return False, {'error': 'No phone number'}

    amount_due = float(order.total_amount_due)

    message = (
        f"FoodFlex Payment Overdue!\n"
        f"Order: {order.order_number}\n"
        f"Amount: N{amount_due:,.0f}\n"
        f"Status: OVERDUE\n"
        f"Pay immediately to avoid penalties.\n"
        f"Pay: {settings.FRONTEND_URL}/profile"
    )

    return send_sms(phone_number, message)


def send_bulk_sms(recipients, message):
    """
    Send SMS to multiple recipients.

    Args:
        recipients (list): List of phone numbers
        message (str): SMS message

    Returns:
        dict: Results for each recipient
    """
    results = {}

    for phone in recipients:
        success, response = send_sms(phone, response)
        results[phone] = {
            'success': success,
            'response': response
        }

    return results