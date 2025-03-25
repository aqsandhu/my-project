import datetime
import logging
from typing import TYPE_CHECKING, Union, Callable
import json
import time
import re
from dataclasses import dataclass

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils.translation import get_language

from .jwt import JWT_REFRESH_TOKEN_COOKIE_NAME, jwt_decode_with_exception_handler
from .auth import get_token_from_request

if TYPE_CHECKING:
    from ..account.models import User
    from ..app.models import App

Requestor = Union["User", "App"]

logger = logging.getLogger(__name__)

# Setup security logger
security_logger = logging.getLogger("saleor.security")

# Rate limiting data
@dataclass
class RateLimitData:
    last_request_time: float
    request_count: int

# IP-based rate limiting storage
IP_RATE_LIMITS = {}
ENDPOINT_RATE_LIMITS = {}

# Sensitive URLs that require extra protection
SENSITIVE_URL_PATTERNS = [
    r'^/graphql/.*$',  # GraphQL API
    r'^/api/.*$',      # REST API
    r'^/dashboard/.*$', # Admin dashboard
    r'^/admin/.*$',    # Django admin
]

# List of high-risk operations that need special audit logging
HIGH_RISK_OPERATIONS = [
    'createToken',     # Login 
    'refreshToken',    # Token refresh
    'accountRegister', # Registration
    'passwordChange',  # Password changes
    'updatePermission', # Permission changes
    'deleteCustomer',  # Delete actions
    'deleteProduct',
    'deleteOrder',
]

def is_sensitive_url(path: str) -> bool:
    """Check if the URL is considered sensitive and needs extra protection."""
    return any(re.match(pattern, path) for pattern in SENSITIVE_URL_PATTERNS)

def is_high_risk_operation(request_body: dict) -> bool:
    """Check if the operation is considered high-risk."""
    if not request_body or not isinstance(request_body, dict):
        return False

    query = request_body.get('query', '')
    if not query:
        return False

    return any(op in query for op in HIGH_RISK_OPERATIONS)

def rate_limit_by_ip(request: HttpRequest, limit: int = 60, window: int = 60) -> bool:
    """Rate limit requests by IP address.

    Args:
        request: The HTTP request object
        limit: Maximum number of requests allowed per window
        window: Time window in seconds

    Returns:
        True if request is allowed, False if it should be blocked
    """
    ip = get_client_ip(request)
    current_time = time.time()

    if ip not in IP_RATE_LIMITS:
        IP_RATE_LIMITS[ip] = RateLimitData(current_time, 1)
        return True

    # Get data for this IP
    rate_data = IP_RATE_LIMITS[ip]

    # Reset counter if window has passed
    if current_time - rate_data.last_request_time > window:
        rate_data.request_count = 1
        rate_data.last_request_time = current_time
        return True

    # Increment counter
    rate_data.request_count += 1

    # Check if limit is exceeded
    if rate_data.request_count > limit:
        security_logger.warning(f"Rate limit exceeded for IP: {ip}")
        return False

    return True

def get_client_ip(request: HttpRequest) -> str:
    """Get the client IP address from the request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def audit_log_request(request: HttpRequest, response: HttpResponse, execution_time: float):
    """Log important request information for security auditing."""
    # Only log if audit logging is enabled
    if not getattr(settings, 'ENABLE_AUDIT_LOGS', False):
        return

    # Get user information
    token = get_token_from_request(request)
    user_id = getattr(request, 'user', None)
    if hasattr(user_id, 'id'):
        user_id = user_id.id

    # Get request details
    method = request.method
    path = request.path
    ip = get_client_ip(request)
    status_code = response.status_code

    # Try to extract operation name from GraphQL
    operation = "unknown"
    if path == '/graphql/' and request.method == 'POST':
        try:
            body = json.loads(request.body)
            query = body.get('query', '')
            if query:
                # Simple regex to extract operation name
                matches = re.search(r'(query|mutation)\s+(\w+)', query)
                if matches and len(matches.groups()) > 1:
                    operation = matches.group(2)
        except:
            pass

    # Prepare log data
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'user_id': user_id,
        'operation': operation,
        'method': method,
        'path': path,
        'ip_address': ip,
        'status_code': status_code,
        'execution_time': execution_time,
        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
    }

    # Log as JSON for easier parsing
    security_logger.info(json.dumps(log_data))

    # Special handling for high-risk operations
    if request.method == 'POST' and (is_sensitive_url(path) or status_code == 401):
        try:
            body = json.loads(request.body)
            if is_high_risk_operation(body):
                security_logger.warning(
                    f"High-risk operation detected: {operation} by user {user_id} from {ip}"
                )
        except:
            pass

def check_permissions(request: HttpRequest) -> bool:
    """Check if user has required permissions for the request."""
    # Skip permission check for non-authenticated requests
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        return True

    # Skip permission check for staff users with necessary permissions
    if request.user.is_staff:
        return True

    # Get permissions for the user
    user_permissions = set()
    if hasattr(request.user, 'effective_permissions'):
        for perm in request.user.effective_permissions.all():
            codename = perm.codename
            user_permissions.add(codename)

    # Check if the path is protected
    path = request.path
    method = request.method

    # Example permission mappings - should be expanded based on your specific API
    if path.startswith('/api/orders/') and method in ['PUT', 'DELETE']:
        required_permission = 'manage_orders'
    elif path.startswith('/api/products/') and method in ['POST', 'PUT', 'DELETE']:
        required_permission = 'manage_products'
    elif path.startswith('/dashboard/'):
        required_permission = 'access_dashboard'
    else:
        # Default allow if no specific permission is needed
        return True

    # Check if user has the required permission
    has_permission = required_permission in user_permissions

    # Log permission denial
    if not has_permission:
        security_logger.warning(
            f"Permission denied: User {request.user.id} attempted to access {path} "
            f"which requires '{required_permission}'"
        )

    return has_permission

class SecurityMiddleware:
    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Rate limiting for all requests
        if not rate_limit_by_ip(request):
            return JsonResponse(
                {"error": "Too many requests. Please try again later."}, 
                status=429
            )

        # Stricter rate limiting for sensitive endpoints
        if is_sensitive_url(request.path):
            if not rate_limit_by_ip(request, limit=30, window=60):
                security_logger.warning(
                    f"Strict rate limit exceeded for sensitive URL: {request.path} "
                    f"from IP: {get_client_ip(request)}"
                )
                return JsonResponse(
                    {"error": "Too many requests to sensitive endpoint."}, 
                    status=429
                )

        # Permission check
        if not check_permissions(request):
            return JsonResponse(
                {"error": "You don't have permission to perform this action."}, 
                status=403
            )

        # Measure execution time for audit logging
        start_time = time.time()
        response = self.get_response(request)
        execution_time = time.time() - start_time

        # Audit logging
        audit_log_request(request, response, execution_time)

        return response

def set_language_middleware(get_response: Callable) -> Callable:
    """Middleware that set's language based on HTTP_ACCEPT_LANGUAGE or default."""
    # One-time configuration and initialization.
    def middleware(request: HttpRequest) -> HttpResponse:
        language = get_language()
        response = get_response(request)
        response.headers.setdefault("Content-Language", language)
        return response

    return middleware

def jwt_refresh_token_middleware(get_response):
    def middleware(request):
        """Append generated refresh_token to response object."""
        response = get_response(request)
        jwt_refresh_token = getattr(request, "refresh_token", None)
        if jwt_refresh_token:
            expires = None
            secure = not settings.DEBUG
            if settings.JWT_EXPIRE:
                refresh_token_payload = jwt_decode_with_exception_handler(
                    jwt_refresh_token
                )
                if refresh_token_payload and refresh_token_payload.get("exp"):
                    expires = datetime.datetime.fromtimestamp(
                        refresh_token_payload["exp"], tz=datetime.UTC
                    )
            response.set_cookie(
                JWT_REFRESH_TOKEN_COOKIE_NAME,
                jwt_refresh_token,
                expires=expires,
                httponly=True,  # protects token from leaking
                secure=secure,
                samesite="None" if secure else "Lax",
            )
        return response

    return middleware
