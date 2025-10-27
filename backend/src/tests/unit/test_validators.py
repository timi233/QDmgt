"""
Unit Tests for Validation Utilities

This module tests all validation functions in the validators module.
"""

import pytest
from backend.src.utils.validators import (
    validate_email,
    validate_phone,
    validate_uuid,
    validate_string_length,
    validate_quarter,
    validate_month,
    validate_plan_period,
    validate_year
)
from backend.src.utils.exceptions import ValidationError


# =============================================================================
# Email Validation Tests
# =============================================================================

@pytest.mark.unit
class TestEmailValidation:
    """Test email validation"""

    def test_valid_emails(self):
        """Test valid email formats"""
        valid_emails = [
            "test@example.com",
            "user.name@example.com",
            "user+tag@example.co.uk",
            "test_123@test-domain.com",
            "a@b.co"
        ]

        for email in valid_emails:
            assert validate_email(email) is True

    def test_invalid_emails(self):
        """Test invalid email formats"""
        invalid_emails = [
            "not-an-email",
            "@example.com",
            "test@",
            "test@@example.com",
            "test@.com",
            "test@domain",
            ""
        ]

        for email in invalid_emails:
            with pytest.raises(ValidationError):
                validate_email(email)

    def test_email_none_or_empty(self):
        """Test email validation with None or empty string"""
        with pytest.raises(ValidationError, match="Email cannot be empty"):
            validate_email("")


# =============================================================================
# Phone Validation Tests
# =============================================================================

@pytest.mark.unit
class TestPhoneValidation:
    """Test phone number validation"""

    def test_valid_phone_numbers(self):
        """Test valid phone formats"""
        valid_phones = [
            "+1234567890",
            "+12345678901",
            "+123456789012345",  # Max length
            "+1 234 567 890",
            "+1-234-567-890",
            "+1 (234) 567-890"
        ]

        for phone in valid_phones:
            assert validate_phone(phone) is True

    def test_invalid_phone_numbers(self):
        """Test invalid phone formats"""
        invalid_phones = [
            "1234567890",  # Missing +
            "+123",  # Too short
            "+1234567890123456",  # Too long
            "+abcdefghij",  # Non-numeric
            "",
            "123-456-7890"  # Missing +
        ]

        for phone in invalid_phones:
            with pytest.raises(ValidationError):
                validate_phone(phone)

    def test_phone_none_or_empty(self):
        """Test phone validation with None or empty string"""
        with pytest.raises(ValidationError, match="Phone number cannot be empty"):
            validate_phone("")


# =============================================================================
# UUID Validation Tests
# =============================================================================

@pytest.mark.unit
class TestUUIDValidation:
    """Test UUID validation"""

    def test_valid_uuids(self):
        """Test valid UUID formats"""
        valid_uuids = [
            "123e4567-e89b-12d3-a456-426614174000",
            "a0b1c2d3-e4f5-6789-abcd-ef0123456789",
            "00000000-0000-0000-0000-000000000000"
        ]

        for uuid_str in valid_uuids:
            assert validate_uuid(uuid_str) is True

    def test_invalid_uuids(self):
        """Test invalid UUID formats"""
        invalid_uuids = [
            "not-a-uuid",
            "123e4567-e89b-12d3-a456",  # Too short
            "123e4567-e89b-12d3-a456-426614174000-extra",  # Too long
            "gggggggg-gggg-gggg-gggg-gggggggggggg",  # Invalid hex
            ""
        ]

        for uuid_str in invalid_uuids:
            with pytest.raises(ValidationError):
                validate_uuid(uuid_str)

    def test_uuid_none_or_empty(self):
        """Test UUID validation with None or empty string"""
        with pytest.raises(ValidationError, match="UUID cannot be empty"):
            validate_uuid("")


# =============================================================================
# String Length Validation Tests
# =============================================================================

@pytest.mark.unit
class TestStringLengthValidation:
    """Test string length validation"""

    def test_valid_string_lengths(self):
        """Test strings within valid length constraints"""
        assert validate_string_length("test", "field", min_length=1, max_length=10) is True
        assert validate_string_length("a", "field", min_length=1) is True
        assert validate_string_length("test" * 100, "field", max_length=500) is True

    def test_string_too_short(self):
        """Test string shorter than minimum length"""
        with pytest.raises(ValidationError, match="must be at least"):
            validate_string_length("ab", "field", min_length=5)

    def test_string_too_long(self):
        """Test string longer than maximum length"""
        with pytest.raises(ValidationError, match="must be at most"):
            validate_string_length("test" * 100, "field", max_length=10)

    def test_string_none(self):
        """Test string length validation with None"""
        with pytest.raises(ValidationError, match="cannot be None"):
            validate_string_length(None, "field")

    def test_string_no_constraints(self):
        """Test string length validation without constraints"""
        assert validate_string_length("any length string", "field") is True


# =============================================================================
# Quarter Validation Tests
# =============================================================================

@pytest.mark.unit
class TestQuarterValidation:
    """Test quarter validation"""

    def test_valid_quarters(self):
        """Test valid quarter numbers"""
        for quarter in [1, 2, 3, 4]:
            assert validate_quarter(quarter) is True

    def test_invalid_quarters(self):
        """Test invalid quarter numbers"""
        invalid_quarters = [0, 5, 10, -1, 100]

        for quarter in invalid_quarters:
            with pytest.raises(ValidationError, match="Quarter must be between 1 and 4"):
                validate_quarter(quarter)


# =============================================================================
# Month Validation Tests
# =============================================================================

@pytest.mark.unit
class TestMonthValidation:
    """Test month validation"""

    def test_valid_months(self):
        """Test valid month numbers"""
        for month in range(1, 13):
            assert validate_month(month) is True

    def test_invalid_months(self):
        """Test invalid month numbers"""
        invalid_months = [0, 13, 14, -1, 100]

        for month in invalid_months:
            with pytest.raises(ValidationError, match="Month must be between 1 and 12"):
                validate_month(month)


# =============================================================================
# Plan Period Validation Tests
# =============================================================================

@pytest.mark.unit
class TestPlanPeriodValidation:
    """Test plan period validation"""

    def test_valid_monthly_periods(self):
        """Test valid monthly period formats"""
        valid_periods = [
            "2024-01",
            "2024-12",
            "2025-06",
            "2023-11"
        ]

        for period in valid_periods:
            assert validate_plan_period(period, "monthly") is True

    def test_valid_weekly_periods(self):
        """Test valid weekly period formats"""
        valid_periods = [
            "2024-W01",
            "2024-W52",
            "2025-W26",
            "2023-W53"
        ]

        for period in valid_periods:
            assert validate_plan_period(period, "weekly") is True

    def test_invalid_monthly_periods(self):
        """Test invalid monthly period formats"""
        invalid_periods = [
            "2024-1",  # Wrong format
            "24-01",  # Wrong year format
            "2024/01",  # Wrong separator
            "2024-13",  # Invalid month
            "2024-00",  # Invalid month
            ""
        ]

        for period in invalid_periods:
            with pytest.raises(ValidationError):
                validate_plan_period(period, "monthly")

    def test_invalid_weekly_periods(self):
        """Test invalid weekly period formats"""
        invalid_periods = [
            "2024-W",  # Missing week number
            "2024-1",  # Missing W
            "24-W01",  # Wrong year format
            "2024/W01",  # Wrong separator
            "2024-W54",  # Invalid week number
            "2024-W00",  # Invalid week number
            ""
        ]

        for period in invalid_periods:
            with pytest.raises(ValidationError):
                validate_plan_period(period, "weekly")

    def test_invalid_plan_type(self):
        """Test invalid plan type"""
        with pytest.raises(ValidationError, match="Invalid plan type"):
            validate_plan_period("2024-01", "invalid")

    def test_plan_period_empty(self):
        """Test plan period validation with empty string"""
        with pytest.raises(ValidationError, match="Plan period cannot be empty"):
            validate_plan_period("", "monthly")


# =============================================================================
# Year Validation Tests
# =============================================================================

@pytest.mark.unit
class TestYearValidation:
    """Test year validation"""

    def test_valid_years(self):
        """Test valid year numbers"""
        valid_years = [1900, 2000, 2024, 2100]

        for year in valid_years:
            assert validate_year(year) is True

    def test_invalid_years(self):
        """Test invalid year numbers"""
        invalid_years = [1899, 2101, 1000, 3000]

        for year in invalid_years:
            with pytest.raises(ValidationError, match="Year must be between 1900 and 2100"):
                validate_year(year)


# =============================================================================
# Integration Tests
# =============================================================================

@pytest.mark.unit
class TestValidatorsIntegration:
    """Integration tests for validators"""

    def test_all_validators_raise_validation_error(self):
        """Test that all validators raise ValidationError on invalid input"""
        # This ensures consistent error handling across all validators

        with pytest.raises(ValidationError):
            validate_email("invalid")

        with pytest.raises(ValidationError):
            validate_phone("invalid")

        with pytest.raises(ValidationError):
            validate_uuid("invalid")

        with pytest.raises(ValidationError):
            validate_string_length("x", "field", min_length=10)

        with pytest.raises(ValidationError):
            validate_quarter(5)

        with pytest.raises(ValidationError):
            validate_month(13)

        with pytest.raises(ValidationError):
            validate_plan_period("invalid", "monthly")

        with pytest.raises(ValidationError):
            validate_year(1800)
