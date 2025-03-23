import csv
import json
import logging
from datetime import datetime, timedelta

from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.utils.translation import ugettext_lazy as _

from ...core.security_logging import get_security_logs
from ...core.security_utils import SECURITY_EVENTS

logger = logging.getLogger("security")


@staff_member_required
def security_dashboard(request):
    """Render the security dashboard view."""
    return render(request, 'dashboard/security/dashboard.html')


@staff_member_required
def security_dashboard_data(request):
    """Return JSON data for the security dashboard."""
    # Get events from the last 24 hours
    now = timezone.now()
    yesterday = now - timedelta(days=1)
    
    # Get security logs for the last 24 hours
    logs = get_security_logs(start_date=yesterday, end_date=now)
    
    # Count critical events
    critical_events = [log for log in logs if log.get('severity') in ['critical', 'error']]
    
    return JsonResponse({
        'total_events_24h': len(logs),
        'critical_events_count': len(critical_events),
        'has_critical_events': len(critical_events) > 0
    })


@staff_member_required
def security_events_list(request):
    """Return JSON list of security events."""
    limit = int(request.GET.get('limit', 50))
    offset = int(request.GET.get('offset', 0))
    
    # Get all security logs with pagination
    logs = get_security_logs(limit=limit, offset=offset)
    
    return JsonResponse({
        'events': logs,
        'total': len(logs),
        'limit': limit,
        'offset': offset
    })


@staff_member_required
def export_security_logs(request):
    """Export security logs as CSV file."""
    # Get parameters
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date')
    
    # Parse dates if provided, otherwise use last 30 days
    now = timezone.now()
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        except ValueError:
            start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=30)
        
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        except ValueError:
            end_date = now
    else:
        end_date = now
    
    # Get logs for the specified period
    logs = get_security_logs(start_date=start_date, end_date=end_date)
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="security_logs_{start_date.strftime("%Y%m%d")}-{end_date.strftime("%Y%m%d")}.csv"'
    
    # Create CSV writer
    writer = csv.writer(response)
    
    # Write headers
    writer.writerow(['Timestamp', 'Event Type', 'User ID', 'IP Address', 'Severity', 'Details'])
    
    # Write log entries
    for log in logs:
        writer.writerow([
            log.get('timestamp', ''),
            log.get('event_type', ''),
            log.get('user_id', ''),
            log.get('ip_address', ''),
            log.get('severity', ''),
            json.dumps(log.get('details', {}))
        ])
    
    return response


@staff_member_required
def security_monitoring(request):
    """Returns security monitoring overview."""
    # Get current state of security monitoring
    # This could include system status, configuration status, etc.
    
    security_status = {
        'firewall_enabled': True,  # This would be fetched from actual system config
        'csrf_protection': True,
        'rate_limiting_enabled': True,
        'user_lockout_policy': 'After 5 failed attempts',
        'password_policy': 'Strong',
        'encryption_status': 'Active',
        'security_headers': 'Implemented',
        'audit_logging_active': True,
    }
    
    return JsonResponse({
        'status': security_status,
        'event_types': SECURITY_EVENTS,
        'last_updated': timezone.now().isoformat(),
    }) 