import json
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger("security")

# Constants
SECURITY_LOG_DIR = getattr(settings, "SECURITY_LOG_DIR", "security_logs")
SECURITY_LOG_FORMAT = getattr(
    settings, 
    "SECURITY_LOG_FORMAT", 
    "%(asctime)s [%(levelname)s] %(message)s - %(event_type)s (User: %(user_id)s, IP: %(ip_address)s)"
)

# Ensure security log directory exists
def ensure_log_dir():
    """
    Ensure the security log directory exists.
    Creates it if it doesn't exist.
    """
    log_dir = Path(SECURITY_LOG_DIR)
    if not log_dir.is_absolute():
        # If relative path, make it relative to settings.BASE_DIR
        log_dir = Path(settings.BASE_DIR) / SECURITY_LOG_DIR
    
    if not log_dir.exists():
        try:
            log_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created security log directory: {log_dir}")
        except Exception as e:
            logger.error(f"Failed to create security log directory: {e}")
    
    return log_dir


def setup_security_logging():
    """
    Set up security logging handlers.
    Call this function during Django application initialization.
    """
    log_dir = ensure_log_dir()
    
    # File handler for security logs
    security_file_handler = logging.FileHandler(
        log_dir / "security.log",
        encoding="utf-8"
    )
    security_file_handler.setLevel(logging.INFO)
    
    # JSON handler for structured logs
    json_file_handler = logging.FileHandler(
        log_dir / "security.json",
        encoding="utf-8"
    )
    json_file_handler.setLevel(logging.INFO)
    
    # Format the regular log file
    formatter = logging.Formatter(SECURITY_LOG_FORMAT)
    security_file_handler.setFormatter(formatter)
    
    # Custom JSON formatter
    class JsonFormatter(logging.Formatter):
        def format(self, record):
            log_record = {
                "timestamp": self.formatTime(record, "%Y-%m-%d %H:%M:%S"),
                "level": record.levelname,
                "message": record.getMessage()
            }
            
            # Add extra fields if available
            if hasattr(record, "event_type"):
                log_record["event_type"] = record.event_type
            if hasattr(record, "user_id"):
                log_record["user_id"] = record.user_id
            if hasattr(record, "ip_address"):
                log_record["ip_address"] = record.ip_address
            if hasattr(record, "details"):
                log_record["details"] = record.details
            
            return json.dumps(log_record)
    
    json_formatter = JsonFormatter()
    json_file_handler.setFormatter(json_formatter)
    
    # Add handlers to logger
    security_logger = logging.getLogger("security")
    security_logger.addHandler(security_file_handler)
    security_logger.addHandler(json_file_handler)
    
    # Make sure the security logger propagates to the root logger
    security_logger.propagate = True
    
    return security_logger


def get_security_logs(start_date=None, end_date=None, limit=None, offset=0):
    """
    Retrieve security logs from the JSON log file.
    
    Args:
        start_date: Start date for log retrieval (optional)
        end_date: End date for log retrieval (optional)
        limit: Maximum number of logs to retrieve (optional)
        offset: Number of logs to skip from the beginning (optional)
        
    Returns:
        List of security log entries
    """
    log_dir = ensure_log_dir()
    json_log_path = log_dir / "security.json"
    
    # If the log file doesn't exist, return an empty list
    if not json_log_path.exists():
        return []
    
    # Parse the JSON log file
    logs = []
    with open(json_log_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                log_entry = json.loads(line.strip())
                logs.append(log_entry)
            except json.JSONDecodeError:
                # Skip invalid JSON lines
                continue
    
    # Filter logs by date if specified
    if start_date or end_date:
        filtered_logs = []
        for log in logs:
            log_time = None
            if "timestamp" in log:
                try:
                    log_time = datetime.strptime(log["timestamp"], "%Y-%m-%d %H:%M:%S")
                    # Add UTC timezone if naive
                    if log_time.tzinfo is None:
                        log_time = log_time.replace(tzinfo=timezone.utc)
                except ValueError:
                    # Skip logs with invalid timestamps
                    continue
            
            if log_time:
                if start_date and log_time < start_date:
                    continue
                if end_date and log_time > end_date:
                    continue
            
            filtered_logs.append(log)
        
        logs = filtered_logs
    
    # Sort logs by timestamp (newest first)
    logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    # Apply pagination if specified
    if offset:
        logs = logs[offset:]
    if limit is not None:
        logs = logs[:limit]
    
    return logs


def rotate_security_logs(max_age_days=30):
    """
    Rotate security logs, archiving old logs.
    
    Args:
        max_age_days: Maximum age of logs in days before they are archived
    """
    log_dir = ensure_log_dir()
    archive_dir = log_dir / "archive"
    
    # Create archive directory if it doesn't exist
    if not archive_dir.exists():
        archive_dir.mkdir(parents=True, exist_ok=True)
    
    # Get current time
    now = timezone.now()
    max_age = timedelta(days=max_age_days)
    
    # Get log files
    log_files = [f for f in log_dir.glob("security*.log")]
    log_files.extend([f for f in log_dir.glob("security*.json")])
    
    for log_file in log_files:
        # Skip files in the archive directory
        if "archive" in str(log_file):
            continue
        
        # Get file modification time
        mtime = datetime.fromtimestamp(os.path.getmtime(log_file))
        mtime = mtime.replace(tzinfo=timezone.utc)
        
        # If the file is older than max_age, archive it
        if now - mtime > max_age:
            # Create archive filename with timestamp
            timestamp = mtime.strftime("%Y%m%d")
            archive_name = f"{log_file.stem}_{timestamp}{log_file.suffix}"
            archive_path = archive_dir / archive_name
            
            # Move the file to the archive directory
            try:
                log_file.rename(archive_path)
                logger.info(f"Archived security log: {log_file.name} -> {archive_name}")
            except Exception as e:
                logger.error(f"Failed to archive log file {log_file.name}: {e}")
    
    return True 