import json
import logging
import datetime
from typing import Dict, List, Optional, Any

from django.conf import settings
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import user_passes_test
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render
from django.utils import timezone

from .security_logging import get_security_logs
from .security_utils import SECURITY_EVENTS, log_security_event, get_client_ip, sanitize_input

# Setup security logger
security_logger = logging.getLogger("saleor.security")

# Security events cache for quick in-memory access
# In production, this should be replaced with Redis or another distributed cache
security_events_cache = []
MAX_CACHE_SIZE = 1000  # Maximum number of events to keep in memory


class SecurityMonitor:
    """
    Monitor and log security-related events.

    This class provides methods to:
    1. Log security events
    2. Search through security logs
    3. Create security alerts
    4. Monitor for suspicious activities
    """

    @staticmethod
    def log_security_event(
        event_type: str,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: str = "info",
    ) -> None:
        """
        Log a security event for auditing and monitoring.

        Args:
            event_type: Type of security event (login_failed, permission_denied, etc.)
            user_id: ID of the user associated with the event (if any)
            ip_address: IP address where the event originated
            details: Additional details about the event
            severity: Severity level (info, warning, error, critical)
        """
        event = {
            "timestamp": datetime.datetime.now().isoformat(),
            "event_type": event_type,
            "user_id": user_id,
            "ip_address": ip_address,
            "details": details or {},
            "severity": severity,
        }

        # Log to file using the security logger
        if severity == "info":
            security_logger.info(json.dumps(event))
        elif severity == "warning":
            security_logger.warning(json.dumps(event))
        elif severity == "error":
            security_logger.error(json.dumps(event))
        elif severity == "critical":
            security_logger.critical(json.dumps(event))

        # Add to in-memory cache (with size limit)
        security_events_cache.append(event)
        if len(security_events_cache) > MAX_CACHE_SIZE:
            security_events_cache.pop(0)  # Remove oldest event

    @staticmethod
    def get_recent_events(
        limit: int = 100,
        event_type: Optional[str] = None,
        user_id: Optional[int] = None,
        min_severity: str = "info",
    ) -> List[Dict[str, Any]]:
        """
        Get recent security events, with optional filtering.

        Args:
            limit: Maximum number of events to return
            event_type: Filter by event type
            user_id: Filter by user ID
            min_severity: Minimum severity level

        Returns:
            List of security events
        """
        # Define severity levels for comparison
        severity_levels = {
            "info": 0,
            "warning": 1,
            "error": 2,
            "critical": 3,
        }
        min_severity_level = severity_levels.get(min_severity, 0)

        # Filter events
        filtered_events = []
        for event in reversed(security_events_cache):  # Start with most recent
            if len(filtered_events) >= limit:
                break

            # Apply filters
            if event_type and event["event_type"] != event_type:
                continue

            if user_id and event["user_id"] != user_id:
                continue

            event_severity_level = severity_levels.get(event["severity"], 0)
            if event_severity_level < min_severity_level:
                continue

            filtered_events.append(event)

        return filtered_events

    @staticmethod
    def has_critical_events(
        timeframe_minutes: int = 60,
        user_id: Optional[int] = None,
    ) -> bool:
        """
        Check if there are any critical security events in the given timeframe.

        Args:
            timeframe_minutes: Timeframe to check in minutes
            user_id: Filter by user ID

        Returns:
            True if critical events exist, False otherwise
        """
        now = datetime.datetime.now()
        timeframe = datetime.timedelta(minutes=timeframe_minutes)

        for event in security_events_cache:
            if event["severity"] != "critical":
                continue

            if user_id and event["user_id"] != user_id:
                continue

            try:
                event_time = datetime.datetime.fromisoformat(event["timestamp"])
                if now - event_time <= timeframe:
                    return True
            except (ValueError, TypeError):
                continue

        return False


# Security monitoring API views
def is_security_admin(user):
    """Check if user has security admin privileges."""
    return user.is_authenticated and user.is_staff and user.has_perm("security.view_logs")


@csrf_exempt
@require_http_methods(["POST"])
def log_security_event_api(request: HttpRequest) -> JsonResponse:
    """
    API endpoint to log a security event.

    This endpoint is for internal use by the application to log security events.
    It should not be exposed publicly.

    Example POST data:
    {
        "event_type": "login_failed",
        "user_id": "123",
        "details": {
            "reason": "Invalid password",
            "username": "user@example.com"
        }
    }
    """
    # Check for API key authentication
    api_key = request.headers.get('X-API-Key')

    # In production, validate against a real API key
    if api_key != getattr(settings, "SECURITY_API_KEY", None):
        return JsonResponse(
            {"error": "Unauthorized"}, 
            status=401
        )

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid JSON"}, 
            status=400
        )

    event_type = data.get('event_type')
    if not event_type or event_type not in SECURITY_EVENTS:
        return JsonResponse(
            {"error": "Invalid event type"}, 
            status=400
        )

    # Extract and sanitize fields
    user_id = sanitize_input(data.get('user_id'))
    ip_address = get_client_ip(request) if not data.get('ip_address') else sanitize_input(data.get('ip_address'))
    details = data.get('details', {})

    # Log the security event
    log_entry = log_security_event(
        event_type=event_type,
        user_id=user_id,
        ip_address=ip_address,
        details=details,
        request=request
    )

    return JsonResponse({
        "status": "success",
        "message": "Security event logged successfully",
        "event_id": log_entry.get('timestamp')
    })


@require_http_methods(["GET"])
@user_passes_test(is_security_admin)
def get_security_events_api(request: HttpRequest) -> JsonResponse:
    """
    API endpoint to get security events.

    This endpoint is for admin use only.

    Query parameters:
    - start_date: Start date for logs (YYYY-MM-DD)
    - end_date: End date for logs (YYYY-MM-DD)
    - limit: Maximum number of logs to return
    - offset: Number of logs to skip
    - event_type: Filter by event type
    - severity: Filter by severity level
    """
    # Parse query parameters
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date')
    limit = request.GET.get('limit')
    offset = request.GET.get('offset', 0)
    event_type = request.GET.get('event_type')
    severity = request.GET.get('severity')

    # Parse dates if provided
    start_date = None
    end_date = None

    if start_date_str:
        try:
            start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        except ValueError:
            return JsonResponse({"error": "Invalid start_date format"}, status=400)

    if end_date_str:
        try:
            # Set the end date to the end of the day
            end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d')
            end_date = end_date.replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        except ValueError:
            return JsonResponse({"error": "Invalid end_date format"}, status=400)

    # Parse limit and offset
    try:
        if limit:
            limit = int(limit)
        if offset:
            offset = int(offset)
    except ValueError:
        return JsonResponse({"error": "Invalid limit or offset"}, status=400)

    # Get logs with filters
    logs = get_security_logs(
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )

    # Filter by event type if provided
    if event_type:
        logs = [log for log in logs if log.get('event_type') == event_type]

    # Filter by severity if provided
    if severity:
        logs = [log for log in logs if log.get('severity') == severity]

    return JsonResponse({
        "events": logs,
        "total": len(logs),
        "limit": limit,
        "offset": offset
    })


@staff_member_required
def security_dashboard(request):
    """Redirect to the security dashboard in the admin interface."""
    # This is a simple redirector to the dashboard app
    return render(request, 'dashboard/security/dashboard.html')


@staff_member_required
def security_audit(request):
    """
    Perform a security audit and return the results.

    This checks various security settings and configurations and returns
    a report of potential issues.
    """

    # Check security settings
    audit_results = []

    # Check if DEBUG is enabled
    if getattr(settings, 'DEBUG', False):
        audit_results.append({
            'check': 'DEBUG Mode',
            'status': 'warning',
            'message': 'DEBUG mode is enabled. This should be disabled in production.'
        })
    else:
        audit_results.append({
            'check': 'DEBUG Mode',
            'status': 'success',
            'message': 'DEBUG mode is disabled.'
        })

    # Check if HTTPS is enforced
    if getattr(settings, 'SECURE_SSL_REDIRECT', False):
        audit_results.append({
            'check': 'HTTPS Enforcement',
            'status': 'success',
            'message': 'HTTPS is enforced via SECURE_SSL_REDIRECT.'
        })
    else:
        audit_results.append({
            'check': 'HTTPS Enforcement',
            'status': 'warning',
            'message': 'HTTPS enforcement (SECURE_SSL_REDIRECT) is not enabled.'
        })

    # Check CSRF protection
    if getattr(settings, 'CSRF_COOKIE_SECURE', False):
        audit_results.append({
            'check': 'CSRF Protection',
            'status': 'success',
            'message': 'CSRF cookies are set to secure.'
        })
    else:
        audit_results.append({
            'check': 'CSRF Protection',
            'status': 'warning',
            'message': 'CSRF_COOKIE_SECURE is not enabled.'
        })

    # Check session cookie security
    if getattr(settings, 'SESSION_COOKIE_SECURE', False):
        audit_results.append({
            'check': 'Session Cookie Security',
            'status': 'success',
            'message': 'Session cookies are set to secure.'
        })
    else:
        audit_results.append({
            'check': 'Session Cookie Security',
            'status': 'warning',
            'message': 'SESSION_COOKIE_SECURE is not enabled.'
        })

    # Check HSTS
    if getattr(settings, 'SECURE_HSTS_SECONDS', 0) > 0:
        audit_results.append({
            'check': 'HTTP Strict Transport Security',
            'status': 'success',
            'message': f'HSTS is enabled with {settings.SECURE_HSTS_SECONDS} seconds.'
        })
    else:
        audit_results.append({
            'check': 'HTTP Strict Transport Security',
            'status': 'warning',
            'message': 'HSTS is not enabled.'
        })

    # Check Content Security Policy
    if hasattr(settings, 'CSP_DEFAULT_SRC'):
        audit_results.append({
            'check': 'Content Security Policy',
            'status': 'success',
            'message': 'Content Security Policy is configured.'
        })
    else:
        audit_results.append({
            'check': 'Content Security Policy',
            'status': 'warning',
            'message': 'Content Security Policy is not configured.'
        })

    # Check for allowed hosts
    if hasattr(settings, 'ALLOWED_HOSTS') and settings.ALLOWED_HOSTS and '*' not in settings.ALLOWED_HOSTS:
        audit_results.append({
            'check': 'Allowed Hosts',
            'status': 'success',
            'message': 'ALLOWED_HOSTS is properly configured.'
        })
    else:
        audit_results.append({
            'check': 'Allowed Hosts',
            'status': 'warning',
            'message': 'ALLOWED_HOSTS is not properly configured or contains wildcard.'
        })

    return JsonResponse({
        'audit_results': audit_results,
        'timestamp': timezone.now().isoformat()
    }) 