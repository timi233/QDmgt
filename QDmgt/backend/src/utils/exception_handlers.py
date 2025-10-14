"""
Global Exception Handlers

This module provides global exception handlers for the FastAPI application.
These handlers ensure consistent error responses across all API endpoints.
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import traceback
from typing import Union

from .exceptions import (
    AppException,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ConflictError
)
from .logger import logger


def create_error_response(
    status_code: int,
    detail: str,
    error_code: str = None,
    errors: list = None
) -> JSONResponse:
    """
    Create a standardized error response.

    Args:
        status_code: HTTP status code
        detail: Error detail message
        error_code: Optional error code for client handling
        errors: Optional list of detailed error objects

    Returns:
        JSONResponse with standardized error format
    """
    content = {
        "error": {
            "code": error_code or f"HTTP_{status_code}",
            "message": detail,
            "status_code": status_code
        }
    }

    if errors:
        content["error"]["details"] = errors

    return JSONResponse(
        status_code=status_code,
        content=content
    )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """
    Handler for custom application exceptions.

    These are exceptions raised by our business logic that already have
    the correct HTTP status code and error message.
    """
    logger.warning(
        f"Application error: {exc.detail}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_code": exc.error_code,
            "status_code": exc.status_code
        }
    )

    return create_error_response(
        status_code=exc.status_code,
        detail=exc.detail,
        error_code=exc.error_code
    )


async def validation_error_handler(
    request: Request,
    exc: Union[ValidationError, RequestValidationError]
) -> JSONResponse:
    """
    Handler for validation errors.

    Handles both custom ValidationError and FastAPI's RequestValidationError
    (from Pydantic validation).
    """
    if isinstance(exc, RequestValidationError):
        # FastAPI/Pydantic validation error
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"]
            })

        logger.warning(
            f"Request validation failed: {len(errors)} error(s)",
            extra={
                "path": request.url.path,
                "method": request.method,
                "errors": errors
            }
        )

        return create_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Validation error",
            error_code="VALIDATION_ERROR",
            errors=errors
        )
    else:
        # Custom ValidationError
        logger.warning(
            f"Validation error: {exc.detail}",
            extra={
                "path": request.url.path,
                "method": request.method
            }
        )

        return create_error_response(
            status_code=exc.status_code,
            detail=exc.detail,
            error_code=exc.error_code
        )


async def not_found_error_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    """Handler for not found errors."""
    logger.info(
        f"Resource not found: {exc.detail}",
        extra={
            "path": request.url.path,
            "method": request.method
        }
    )

    return create_error_response(
        status_code=exc.status_code,
        detail=exc.detail,
        error_code=exc.error_code
    )


async def unauthorized_error_handler(request: Request, exc: UnauthorizedError) -> JSONResponse:
    """Handler for unauthorized errors."""
    logger.warning(
        f"Unauthorized access attempt: {exc.detail}",
        extra={
            "path": request.url.path,
            "method": request.method
        }
    )

    return create_error_response(
        status_code=exc.status_code,
        detail=exc.detail,
        error_code=exc.error_code
    )


async def conflict_error_handler(request: Request, exc: ConflictError) -> JSONResponse:
    """Handler for conflict errors."""
    logger.warning(
        f"Conflict error: {exc.detail}",
        extra={
            "path": request.url.path,
            "method": request.method
        }
    )

    return create_error_response(
        status_code=exc.status_code,
        detail=exc.detail,
        error_code=exc.error_code
    )


async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """
    Handler for SQLAlchemy database errors.

    Logs the detailed error but returns a generic message to the client
    to avoid exposing database internals.
    """
    logger.error(
        f"Database error: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "traceback": traceback.format_exc()
        }
    )

    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="A database error occurred",
        error_code="DATABASE_ERROR"
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler for all unexpected exceptions.

    This is the catch-all handler that logs detailed error information
    but returns a generic error message to the client.
    """
    logger.error(
        f"Unexpected error: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "exception_type": type(exc).__name__,
            "traceback": traceback.format_exc()
        }
    )

    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An unexpected error occurred",
        error_code="INTERNAL_ERROR"
    )


def register_exception_handlers(app) -> None:
    """
    Register all exception handlers with the FastAPI application.

    This should be called during application initialization.

    Args:
        app: FastAPI application instance
    """
    # Custom application exceptions
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(ValidationError, validation_error_handler)
    app.add_exception_handler(NotFoundError, not_found_error_handler)
    app.add_exception_handler(UnauthorizedError, unauthorized_error_handler)
    app.add_exception_handler(ConflictError, conflict_error_handler)

    # FastAPI/Pydantic validation errors
    app.add_exception_handler(RequestValidationError, validation_error_handler)

    # Database errors
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)

    # Generic catch-all for unexpected exceptions
    app.add_exception_handler(Exception, generic_exception_handler)

    logger.info("Exception handlers registered successfully")
