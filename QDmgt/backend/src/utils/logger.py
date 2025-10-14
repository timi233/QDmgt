import logging
import sys
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any


class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class Logger:
    def __init__(self, name: str = "ChannelManagement", level: LogLevel = LogLevel.INFO):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, level.value))
        
        # Avoid adding multiple handlers if logger already exists
        if not self.logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def _log(self, level: LogLevel, message: str, extra: Optional[Dict[str, Any]] = None):
        log_method = getattr(self.logger, level.value.lower())
        if extra:
            # Add extra context to the log
            extra_str = " | ".join([f"{k}={v}" for k, v in extra.items()])
            log_method(f"{message} | {extra_str}")
        else:
            log_method(message)
    
    def debug(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self._log(LogLevel.DEBUG, message, extra)
    
    def info(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self._log(LogLevel.INFO, message, extra)
    
    def warning(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self._log(LogLevel.WARNING, message, extra)
    
    def error(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self._log(LogLevel.ERROR, message, extra)
    
    def critical(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self._log(LogLevel.CRITICAL, message, extra)


# Create a default logger instance
logger = Logger()


# Function to create a module-specific logger
def create_logger(name: str, level: LogLevel = LogLevel.INFO) -> Logger:
    return Logger(name, level)


# Create loggers for different modules
channel_logger = create_logger("ChannelModule", LogLevel.INFO)
target_logger = create_logger("TargetModule", LogLevel.INFO)
assignment_logger = create_logger("AssignmentModule", LogLevel.INFO)
execution_logger = create_logger("ExecutionModule", LogLevel.INFO)
auth_logger = create_logger("AuthModule", LogLevel.INFO)


# Log API request information
def log_api_request(method: str, endpoint: str, user_id: Optional[str] = None, 
                   ip_address: Optional[str] = None, success: bool = True, 
                   response_time: Optional[float] = None):
    extra = {
        "method": method,
        "endpoint": endpoint,
        "user_id": user_id,
        "ip": ip_address,
        "success": success
    }
    
    if response_time is not None:
        extra["response_time_ms"] = f"{response_time:.2f}"
    
    if success:
        logger.info("API Request", extra=extra)
    else:
        logger.warning("API Request Failed", extra=extra)


# Log database operations
def log_db_operation(operation: str, table: str, record_id: Optional[str] = None, 
                     success: bool = True, duration: Optional[float] = None):
    extra = {
        "operation": operation,
        "table": table,
        "record_id": record_id,
        "success": success
    }
    
    if duration is not None:
        extra["duration_ms"] = f"{duration:.2f}"
    
    if success:
        logger.info("Database Operation", extra=extra)
    else:
        logger.warning("Database Operation Failed", extra=extra)


# Log authentication events
def log_auth_event(event: str, user_id: Optional[str] = None, 
                  ip_address: Optional[str] = None, success: bool = True):
    extra = {
        "event": event,
        "user_id": user_id,
        "ip": ip_address,
        "success": success
    }
    
    if success:
        logger.info("Auth Event", extra=extra)
    else:
        logger.warning("Auth Event Failed", extra=extra)