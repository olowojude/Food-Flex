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
    Send a plain SMS via Kudisms API.

    Args:
        phone_number (str): Recipient phone number (e.g., '08012345678' or '+2348012345678')
        message (str): SMS message content (max 160 chars for single SMS)

    Returns:
        tuple: (success: bool, response: dict)
    """
    api_token = settings.KUDISMS_API_TOKEN
    sender_id = settings.KUDISMS_SENDER_ID
    api_url = settings.KUDISMS_API_URL

    if not api_token or not sender_id:
        logger.error("Kudisms credentials not configured in settings")
        return False, {'error': 'SMS service not configured'}

    formatted_phone = format_phone_number(phone_number)

    if not formatted_phone:
        logger.error(f"Invalid phone number format: {phone_number}")
        return False, {'error': 'Invalid phone number format'}

    url = f"{api_url}/sms"
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Content-Type': 'application/json',
    }

    payload = {
        'sender': sender_id,
        'recipients': [formatted_phone],
        'message': message,
    }

    try:
        logger.info(f"Sending SMS to {formatted_phone}")
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

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


def send_kudisms_otp(phone_number):
    """
    Send OTP via Kudisms OTP API.
    Kudisms generates and delivers the OTP themselves — you do NOT create the OTP.
    Store the returned verification_id and use it when calling verify_kudisms_otp().

    Required settings:
        KUDISMS_API_TOKEN
        KUDISMS_SENDER_ID
        KUDISMS_APP_NAME_CODE  (submit your app name at https://my.kudisms.net/user/ssoan)
        KUDISMS_TEMPLATE_CODE  (submit your OTP template at https://my.kudisms.net/user/csomt)

    Args:
        phone_number (str): Recipient in any Nigerian format (08xxx / +234xxx / 234xxx)

    Returns:
        tuple:
            success=True  → (True, "verification_id_string")
            success=False → (False, {"error": "reason"})
    """
    api_token = getattr(settings, 'KUDISMS_API_TOKEN', None)
    sender_id = getattr(settings, 'KUDISMS_SENDER_ID', None)
    app_name_code = getattr(settings, 'KUDISMS_APP_NAME_CODE', None)
    template_code = getattr(settings, 'KUDISMS_TEMPLATE_CODE', None)

    missing = [
        k for k, v in {
            'KUDISMS_API_TOKEN': api_token,
            'KUDISMS_SENDER_ID': sender_id,
            'KUDISMS_APP_NAME_CODE': app_name_code,
            'KUDISMS_TEMPLATE_CODE': template_code,
        }.items() if not v
    ]
    if missing:
        logger.error(f"Kudisms OTP config missing: {missing}")
        return False, {'error': f'SMS service misconfigured. Missing settings: {", ".join(missing)}'}

    formatted_phone = format_phone_number(phone_number)
    if not formatted_phone:
        return False, {'error': 'Invalid phone number format'}

    # Kudisms sendotp uses form-encoded POST (not JSON)
    payload = {
        'token': api_token,
        'senderID': sender_id,
        'recipients': formatted_phone,   # single number: 234xxxxxxxxxx
        'appnamecode': app_name_code,
        'templatecode': template_code,
        'otp_type': 'NUMERIC',
        'otp_length': '6',
        'otp_duration': '10',            # minutes valid
        'otp_attempts': '3',
        'channel': 'sms',
    }

    try:
        logger.info(f"Sending Kudisms OTP to {formatted_phone}")
        response = requests.post(
            'https://my.kudisms.net/api/sendotp',
            data=payload,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=15
        )
        response.raise_for_status()
        data = response.json()

        if data.get('status') == 'success' and data.get('verification_id'):
            verification_id = data['verification_id']
            logger.info(f"Kudisms OTP sent to {formatted_phone}, verification_id={verification_id}")
            return True, verification_id
        else:
            logger.warning(f"Kudisms OTP send failed: {data}")
            return False, {'error': data.get('msg', 'Failed to send OTP')}

    except requests.exceptions.RequestException as e:
        logger.error(f"Kudisms sendotp API error: {str(e)}")
        return False, {'error': str(e)}
    except Exception as e:
        logger.error(f"Unexpected Kudisms sendotp error: {str(e)}")
        return False, {'error': str(e)}


def verify_kudisms_otp(verification_id, otp):
    """
    Verify an OTP using the Kudisms verifyotp endpoint.
    Pass the verification_id stored from send_kudisms_otp() and the OTP the user entered.

    Args:
        verification_id (str): Returned by send_kudisms_otp()
        otp (str): The code the user typed in

    Returns:
        tuple:
            success=True  → (True, "OTP Verified Successfully.")
            success=False → (False, "reason string")
    """
    api_token = getattr(settings, 'KUDISMS_API_TOKEN', None)

    if not api_token:
        return False, 'SMS service not configured'

    payload = {
        'token': api_token,
        'verification_id': verification_id,
        'otp': otp,
    }

    try:
        logger.info(f"Verifying Kudisms OTP, verification_id={verification_id}")
        response = requests.post(
            'https://my.kudisms.net/api/verifyotp',
            data=payload,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=15
        )
        response.raise_for_status()
        data = response.json()

        # Kudisms returns error_code "000" for success
        if data.get('status') == 'success' and data.get('error_code') == '000':
            logger.info(f"Kudisms OTP verified, verification_id={verification_id}")
            return True, data.get('msg', 'OTP verified successfully')
        else:
            logger.warning(f"Kudisms OTP verification failed: {data}")
            return False, data.get('msg', 'Invalid or expired OTP')

    except requests.exceptions.RequestException as e:
        logger.error(f"Kudisms verifyotp API error: {str(e)}")
        return False, 'Verification service unavailable. Please try again.'
    except Exception as e:
        logger.error(f"Unexpected Kudisms verifyotp error: {str(e)}")
        return False, 'Verification failed. Please try again.'


def format_phone_number(phone):
    """
    Format phone number for Nigerian numbers.
    Converts: 08012345678   → 2348012345678
    Converts: +2348012345678 → 2348012345678
    Converts: 2348012345678  → 2348012345678
    """
    if not phone:
        return None

    phone = str(phone).strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

    if phone.startswith('+'):
        phone = phone[1:]

    if phone.startswith('0'):
        phone = '234' + phone[1:]

    if not phone.startswith('234'):
        phone = '234' + phone

    if len(phone) != 13:
        return None

    if not phone.isdigit():
        return None

    return phone


def send_order_confirmation_sms(order):
    """
    Send order confirmation SMS to buyer with full seller pickup details.
    Only sends if the buyer's phone is verified.
    """
    buyer = order.buyer

    if not getattr(buyer, 'phone_verified', False):
        logger.info(f"Order {order.order_number}: Skipping SMS - buyer phone not verified")
        return False, {'error': 'Buyer phone not verified'}

    phone_number = getattr(buyer, 'phone_number', None)
    if not phone_number:
        logger.warning(f"Order {order.order_number}: Buyer has no phone number")
        return False, {'error': 'No phone number'}

    # Resolve seller's primary StoreLocation
    seller = order.seller
    store_name = None
    pickup_address = None
    pickup_phone = None

    try:
        primary_location = seller.store_locations.filter(is_primary=True).first()
        if not primary_location:
            primary_location = seller.store_locations.first()

        if primary_location:
            store_name = primary_location.store_name or None
            address_parts = list(filter(None, [
                getattr(primary_location, 'address', None),
                getattr(primary_location, 'city', None),
                getattr(primary_location, 'state', None),
            ]))
            pickup_address = ', '.join(address_parts) or None
            pickup_phone = getattr(primary_location, 'phone_number', None)

    except Exception as e:
        logger.warning(f"Order {order.order_number}: Could not resolve StoreLocation - {str(e)}")

    # Graceful fallbacks
    if not store_name:
        store_name = f"{seller.first_name}'s Store" if seller.first_name else seller.email

    if not pickup_address:
        if hasattr(seller, 'seller_profile'):
            pickup_address = getattr(seller.seller_profile, 'business_address', None)

    if not pickup_address:
        pickup_address = 'Contact seller for address'

    if not pickup_phone:
        pickup_phone = getattr(seller, 'phone_number', 'N/A')

    item_count = order.items.count()
    items_label = f"{item_count} item{'s' if item_count != 1 else ''}"

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
    """Send payment reminder SMS for loans due soon."""
    buyer = order.buyer
    phone_number = getattr(buyer, 'phone_number', None)

    if not phone_number:
        return False, {'error': 'No phone number'}

    message = (
        f"FoodFlex Payment Reminder\n"
        f"Order: {order.order_number}\n"
        f"Amount Due: N{float(order.total_amount_due):,.0f}\n"
        f"Due in: {order.days_remaining} days\n"
        f"Pay now: {settings.FRONTEND_URL}/profile\n"
        f"Save on interest by paying early!"
    )
    return send_sms(phone_number, message)


def send_overdue_warning_sms(order):
    """Send overdue warning SMS."""
    buyer = order.buyer
    phone_number = getattr(buyer, 'phone_number', None)

    if not phone_number:
        return False, {'error': 'No phone number'}

    message = (
        f"FoodFlex Payment Overdue!\n"
        f"Order: {order.order_number}\n"
        f"Amount: N{float(order.total_amount_due):,.0f}\n"
        f"Status: OVERDUE\n"
        f"Pay immediately to avoid penalties.\n"
        f"Pay: {settings.FRONTEND_URL}/profile"
    )
    return send_sms(phone_number, message)


def send_bulk_sms(recipients, message):
    """Send plain SMS to multiple recipients."""
    results = {}
    for phone in recipients:
        success, response = send_sms(phone, message)
        results[phone] = {'success': success, 'response': response}
    return results