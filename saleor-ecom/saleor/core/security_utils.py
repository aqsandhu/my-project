import logging
import os
import re
import secrets
from datetime import datetime

from django.conf import settings
from django.http import HttpRequest
from django.utils import timezone

# Security logger
logger = logging.getLogger("security")

# Define security event types
SECURITY_EVENTS = {
    'login_success': {
        'name': 'Login Success',
        'severity': 'info',
        'description': 'User successfully logged in'
    },
    'login_failed': {
        'name': 'Login Failed',
        'severity': 'warning',
        'description': 'Failed login attempt'
    },
    'login_lockout': {
        'name': 'Account Lockout',
        'severity': 'warning',
        'description': 'Account locked after multiple failed login attempts'
    },
    'password_reset_request': {
        'name': 'Password Reset Request',
        'severity': 'info',
        'description': 'User requested a password reset'
    },
    'password_changed': {
        'name': 'Password Changed',
        'severity': 'info',
        'description': 'User changed their password'
    },
    'user_created': {
        'name': 'User Created',
        'severity': 'info',
        'description': 'New user account created'
    },
    'user_deleted': {
        'name': 'User Deleted',
        'severity': 'info',
        'description': 'User account was deleted'
    },
    'admin_login': {
        'name': 'Admin Login',
        'severity': 'info',
        'description': 'Administrator logged in'
    },
    'admin_action': {
        'name': 'Admin Action',
        'severity': 'info',
        'description': 'Administrator performed an action'
    },
    'permission_change': {
        'name': 'Permission Change',
        'severity': 'info',
        'description': 'User permissions were modified'
    },
    'api_key_created': {
        'name': 'API Key Created',
        'severity': 'info',
        'description': 'New API key was generated'
    },
    'api_key_revoked': {
        'name': 'API Key Revoked',
        'severity': 'info',
        'description': 'API key was revoked'
    },
    'rate_limit_exceeded': {
        'name': 'Rate Limit Exceeded',
        'severity': 'warning',
        'description': 'User exceeded rate limits'
    },
    'suspicious_activity': {
        'name': 'Suspicious Activity',
        'severity': 'warning',
        'description': 'Suspicious activity detected'
    },
    'brute_force_attempt': {
        'name': 'Brute Force Attempt',
        'severity': 'error',
        'description': 'Potential brute force attack detected'
    },
    'csrf_failure': {
        'name': 'CSRF Failure',
        'severity': 'error',
        'description': 'Cross-Site Request Forgery validation failed'
    },
    'xss_attempt': {
        'name': 'XSS Attempt',
        'severity': 'error',
        'description': 'Cross-Site Scripting attack attempt detected'
    },
    'sql_injection_attempt': {
        'name': 'SQL Injection Attempt',
        'severity': 'critical',
        'description': 'SQL Injection attack attempt detected'
    },
    'unauthorized_access': {
        'name': 'Unauthorized Access',
        'severity': 'error',
        'description': 'Attempt to access unauthorized resource'
    },
    'data_export': {
        'name': 'Data Export',
        'severity': 'info',
        'description': 'User data was exported'
    },
    'config_change': {
        'name': 'Configuration Change',
        'severity': 'info',
        'description': 'System configuration was changed'
    },
    'payment_error': {
        'name': 'Payment Error',
        'severity': 'warning',
        'description': 'Error processing payment'
    },
}


def log_security_event(event_type, user_id=None, ip_address=None, details=None, request=None):
    """
    Log a security event to the security log.

    Args:
        event_type: The type of security event (must be in SECURITY_EVENTS)
        user_id: The ID of the user associated with the event (optional)
        ip_address: The IP address associated with the event (optional)
        details: Additional details about the event (optional)
        request: The HTTP request object (optional, used to extract IP if not provided)
    """
    if event_type not in SECURITY_EVENTS:
        logger.error(f"Unknown security event type: {event_type}")
        return

    event_info = SECURITY_EVENTS[event_type]

    # Extract IP address from request if not provided
    if ip_address is None and request is not None:
        ip_address = get_client_ip(request)

    # Create log entry
    log_entry = {
        'timestamp': timezone.now().isoformat(),
        'event_type': event_type,
        'event_name': event_info['name'],
        'severity': event_info['severity'],
        'user_id': user_id,
        'ip_address': ip_address,
        'details': details or {}
    }

    # Log based on severity
    severity = event_info['severity']
    if severity == 'critical':
        logger.critical(f"SECURITY: {event_info['name']}", extra=log_entry)
    elif severity == 'error':
        logger.error(f"SECURITY: {event_info['name']}", extra=log_entry)
    elif severity == 'warning':
        logger.warning(f"SECURITY: {event_info['name']}", extra=log_entry)
    else:
        logger.info(f"SECURITY: {event_info['name']}", extra=log_entry)

    # For critical and error events, we might want to trigger additional actions
    if severity in ['critical', 'error']:
        # Here we could add code to send notifications or trigger alerts
        pass

    return log_entry


def get_client_ip(request):
    """
    Extract the client IP address from a request safely.

    Args:
        request: The HTTP request object

    Returns:
        The client IP address as a string
    """
    if not isinstance(request, HttpRequest):
        return None

    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # Get the first IP in the list (client IP)
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')

    return ip


def generate_secure_token(length=64):
    """
    Generate a cryptographically secure random token.

    Args:
        length: The length of the token in bytes (default: 64)

    Returns:
        A secure random token as a hex string
    """
    return secrets.token_hex(length)


def sanitize_input(input_string, allow_html=False):
    """
    Sanitize user input to prevent XSS attacks.

    Args:
        input_string: The input string to sanitize
        allow_html: Whether to allow some HTML tags (default: False)

    Returns:
        Sanitized input string
    """
    if input_string is None:
        return ""

    # Convert to string if it's not already
    if not isinstance(input_string, str):
        input_string = str(input_string)

    if not allow_html:
        # Remove all HTML tags and entities
        input_string = re.sub(r'<[^>]*>', '', input_string)
        input_string = re.sub(r'&[^;]+;', '', input_string)
    else:
        # This is a simplified version - in production, use a proper HTML sanitizer
        # like bleach or html-sanitizer
        allowed_tags = ['b', 'i', 'u', 'p', 'br', 'span', 'div', 'ul', 'ol', 'li']
        # Remove script tags and on* attributes
        input_string = re.sub(r'<script[^>]*>.*?</script>', '', input_string, flags=re.DOTALL)
        input_string = re.sub(r'\bon\w+\s*=\s*["\'][^"\']*["\']', '', input_string)

    return input_string


def is_password_compromised(password):
    """
    Check if a password has been compromised by checking against the
    "Have I Been Pwned" API or similar service.

    In a production app, you would implement this to check against a service
    like the HIBP API using k-anonymity.

    Args:
        password: The password to check

    Returns:
        Boolean indicating if the password has been compromised
    """
    # This is a placeholder. In a real implementation, this would check against
    # a password breach database like the HIBP API.
    # Here we're just checking for basic weak passwords as a demonstration
    weak_passwords = [
        'password', '123456', 'qwerty', 'admin', 'welcome',
        'password123', 'admin123', '12345678', 'abc123'
    ]

    return password.lower() in weak_passwords 