"""
Validation Utilities

This module provides common validation functions for data validation
across the application.
"""

import re
import uuid
from typing import Optional
from .exceptions import ValidationError


def validate_email(email: str) -> bool:
    """
    Validate email address format.

    Args:
        email: Email address to validate

    Returns:
        True if email is valid

    Raises:
        ValidationError: If email format is invalid
    """
    if not email:
        raise ValidationError("Email cannot be empty")

    # RFC 5322 compliant email validation
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if not re.match(email_pattern, email):
        raise ValidationError(f"Invalid email format: {email}")

    return True


def validate_phone(phone: str) -> bool:
    """
    Validate phone number format.

    Accepts formats:
    - E.164 format: +1234567890
    - With spaces: +1 234 567 890
    - With hyphens: +1-234-567-890
    - With parentheses: +1 (234) 567-890

    Args:
        phone: Phone number to validate

    Returns:
        True if phone is valid

    Raises:
        ValidationError: If phone format is invalid
    """
    if not phone:
        raise ValidationError("Phone number cannot be empty")

    # Remove spaces, hyphens, parentheses for validation
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)

    # Must start with + and have 10-15 digits
    phone_pattern = r'^\+\d{10,15}$'

    if not re.match(phone_pattern, cleaned):
        raise ValidationError(
            f"Invalid phone format: {phone}. Expected format: +1234567890"
        )

    return True


def validate_uuid(value: str) -> bool:
    """
    Validate UUID string format.

    Args:
        value: UUID string to validate

    Returns:
        True if UUID is valid

    Raises:
        ValidationError: If UUID format is invalid
    """
    if not value:
        raise ValidationError("UUID cannot be empty")

    try:
        uuid.UUID(value)
        return True
    except (ValueError, AttributeError, TypeError) as e:
        raise ValidationError(f"Invalid UUID format: {value}")


def validate_string_length(
    value: str,
    field_name: str,
    min_length: Optional[int] = None,
    max_length: Optional[int] = None
) -> bool:
    """
    Validate string length constraints.

    Args:
        value: String to validate
        field_name: Name of the field being validated (for error messages)
        min_length: Minimum allowed length (optional)
        max_length: Maximum allowed length (optional)

    Returns:
        True if length is valid

    Raises:
        ValidationError: If length constraints are violated
    """
    if value is None:
        raise ValidationError(f"{field_name} cannot be None")

    length = len(value)

    if min_length is not None and length < min_length:
        raise ValidationError(
            f"{field_name} must be at least {min_length} characters long "
            f"(got {length})"
        )

    if max_length is not None and length > max_length:
        raise ValidationError(
            f"{field_name} must be at most {max_length} characters long "
            f"(got {length})"
        )

    return True


def validate_quarter(quarter: int) -> bool:
    """
    Validate quarter number (must be 1-4).

    Args:
        quarter: Quarter number to validate

    Returns:
        True if quarter is valid

    Raises:
        ValidationError: If quarter is not between 1 and 4
    """
    if quarter < 1 or quarter > 4:
        raise ValidationError("Quarter must be between 1 and 4")

    return True


def validate_month(month: int) -> bool:
    """
    Validate month number (must be 1-12).

    Args:
        month: Month number to validate

    Returns:
        True if month is valid

    Raises:
        ValidationError: If month is not between 1 and 12
    """
    if month < 1 or month > 12:
        raise ValidationError("Month must be between 1 and 12")

    return True


def validate_plan_period(period: str, plan_type: str) -> bool:
    """
    Validate plan period format based on plan type.

    Args:
        period: Period string to validate
        plan_type: Type of plan ('monthly' or 'weekly')

    Returns:
        True if period format is valid

    Raises:
        ValidationError: If period format is invalid
    """
    if not period:
        raise ValidationError("Plan period cannot be empty")

    if plan_type == "monthly":
        # Monthly format: YYYY-MM
        if len(period) != 7 or period[4] != '-':
            raise ValidationError(
                f"Monthly plan period must be in YYYY-MM format (got '{period}')"
            )

        # Validate year and month are numeric
        try:
            year = int(period[:4])
            month = int(period[5:7])

            if year < 1900 or year > 2100:
                raise ValidationError(f"Invalid year in period: {year}")

            validate_month(month)

        except ValueError:
            raise ValidationError(
                f"Invalid numeric values in period: '{period}'"
            )

    elif plan_type == "weekly":
        # Weekly format: YYYY-Wnn
        if len(period) < 8 or period[4] != '-' or period[5] != 'W':
            raise ValidationError(
                f"Weekly plan period must be in YYYY-Wnn format (got '{period}')"
            )

        # Validate year and week are numeric
        try:
            year = int(period[:4])
            week = int(period[6:])

            if year < 1900 or year > 2100:
                raise ValidationError(f"Invalid year in period: {year}")

            if week < 1 or week > 53:
                raise ValidationError("Week number must be between 1 and 53")

        except ValueError:
            raise ValidationError(
                f"Invalid numeric values in period: '{period}'"
            )

    else:
        raise ValidationError(
            f"Invalid plan type: '{plan_type}'. Must be 'monthly' or 'weekly'"
        )

    return True


def validate_year(year: int) -> bool:
    """
    Validate year number (must be reasonable range).

    Args:
        year: Year to validate

    Returns:
        True if year is valid

    Raises:
        ValidationError: If year is out of reasonable range
    """
    if year < 1900 or year > 2100:
        raise ValidationError(f"Year must be between 1900 and 2100 (got {year})")

    return True
