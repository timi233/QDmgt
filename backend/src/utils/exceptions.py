import logging
from typing import Any, Dict
from datetime import datetime
import traceback
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AppException(HTTPException):
    """Custom application exception"""
    def __init__(self, status_code: int, detail: str, error_code: str = None):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code


class ValidationError(AppException):
    """Validation error"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="VALIDATION_ERROR"
        )


class NotFoundError(AppException):
    """Not found error"""
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="NOT_FOUND_ERROR"
        )


class UnauthorizedError(AppException):
    """Unauthorized error"""
    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="UNAUTHORIZED_ERROR"
        )


class ConflictError(AppException):
    """Conflict error"""
    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="CONFLICT_ERROR"
        )


def handle_error(error: Exception, context: str = ""):
    """Generic error handler"""
    logger.error(f"Error in {context}: {str(error)}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    if isinstance(error, AppException):
        raise error
    elif isinstance(error, SQLAlchemyError):
        logger.error(f"Database error: {str(error)}")
        raise AppException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred",
            error_code="DATABASE_ERROR"
        )
    else:
        logger.error(f"Unexpected error: {str(error)}")
        raise AppException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
            error_code="UNEXPECTED_ERROR"
        )


def log_info(message: str):
    """Log info message"""
    logger.info(message)


def log_warning(message: str):
    """Log warning message"""
    logger.warning(message)


def log_error(message: str):
    """Log error message"""
    logger.error(message)