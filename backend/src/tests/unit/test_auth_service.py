"""
Unit Tests for AuthService, AuthManager, and AuthorizationService

This module tests the authentication and authorization business logic layer.
"""

import pytest
from sqlalchemy.orm import Session
from fastapi import HTTPException
import uuid
import jwt
from datetime import datetime, timedelta

from backend.src.auth.auth_service import (
    AuthManager,
    AuthService,
    AuthorizationService,
    UserRole,
    PermissionLevel
)
from backend.src.models.user import User, UserRole as ModelUserRole
from backend.src.config.security import SecurityConfig


# =============================================================================
# AuthManager Tests
# =============================================================================

@pytest.mark.unit
class TestAuthManager:
    """Test AuthManager class"""

    def test_create_access_token(self, auth_manager: AuthManager):
        """Test creating access token"""
        data = {"sub": "test_user", "role": "user"}
        token = auth_manager.create_access_token(data)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

        # Verify token can be decoded
        payload = auth_manager.verify_token(token)
        assert payload is not None
        assert payload["sub"] == "test_user"
        assert payload["role"] == "user"
        assert "exp" in payload

    def test_create_refresh_token(self, auth_manager: AuthManager):
        """Test creating refresh token"""
        data = {"sub": "test_user"}
        token = auth_manager.create_refresh_token(data)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

        # Verify token can be decoded
        payload = auth_manager.verify_token(token)
        assert payload is not None
        assert payload["sub"] == "test_user"

    def test_verify_valid_token(self, auth_manager: AuthManager):
        """Test verifying valid token"""
        data = {"sub": "test_user", "role": "admin"}
        token = auth_manager.create_access_token(data)

        payload = auth_manager.verify_token(token)

        assert payload is not None
        assert payload["sub"] == "test_user"
        assert payload["role"] == "admin"

    def test_verify_expired_token(self, auth_manager: AuthManager):
        """Test verifying expired token"""
        # Create token that expires immediately
        config = SecurityConfig()
        data = {"sub": "test_user"}
        expire = datetime.utcnow() - timedelta(minutes=1)  # Expired 1 minute ago
        data["exp"] = expire

        token = jwt.encode(data, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)

        payload = auth_manager.verify_token(token)

        assert payload is None

    def test_verify_invalid_token(self, auth_manager: AuthManager):
        """Test verifying invalid token"""
        invalid_token = "invalid.token.here"

        payload = auth_manager.verify_token(invalid_token)

        assert payload is None

    def test_hash_password(self, auth_manager: AuthManager):
        """Test password hashing"""
        password = "MySecurePassword123!"
        hashed = auth_manager.hash_password(password)

        assert hashed is not None
        assert isinstance(hashed, str)
        assert "$" in hashed  # Should contain salt separator
        assert hashed != password  # Should be different from original

    def test_verify_password_success(self, auth_manager: AuthManager):
        """Test password verification with correct password"""
        password = "MySecurePassword123!"
        hashed = auth_manager.hash_password(password)

        result = auth_manager.verify_password(password, hashed)

        assert result is True

    def test_verify_password_failure(self, auth_manager: AuthManager):
        """Test password verification with wrong password"""
        password = "MySecurePassword123!"
        wrong_password = "WrongPassword456!"
        hashed = auth_manager.hash_password(password)

        result = auth_manager.verify_password(wrong_password, hashed)

        assert result is False

    def test_verify_password_malformed_hash(self, auth_manager: AuthManager):
        """Test password verification with malformed hash"""
        password = "MySecurePassword123!"
        malformed_hash = "malformed_hash_without_separator"

        result = auth_manager.verify_password(password, malformed_hash)

        assert result is False

    def test_validate_password_strength_valid(self, auth_manager: AuthManager):
        """Test password validation with strong password"""
        password = "MySecurePass123!"

        is_valid, errors = auth_manager.validate_password_strength(password)

        assert is_valid is True
        assert len(errors) == 0

    def test_validate_password_strength_too_short(self, auth_manager: AuthManager):
        """Test password validation with short password"""
        password = "Short1!"

        is_valid, errors = auth_manager.validate_password_strength(password)

        assert is_valid is False
        assert any("at least" in error for error in errors)

    def test_validate_password_strength_no_uppercase(self, auth_manager: AuthManager):
        """Test password validation without uppercase letter"""
        password = "nocapitalletters123!"

        is_valid, errors = auth_manager.validate_password_strength(password)

        assert is_valid is False
        assert any("uppercase" in error for error in errors)

    def test_validate_password_strength_no_lowercase(self, auth_manager: AuthManager):
        """Test password validation without lowercase letter"""
        password = "NOLOWERCASELETTERS123!"

        is_valid, errors = auth_manager.validate_password_strength(password)

        assert is_valid is False
        assert any("lowercase" in error for error in errors)

    def test_validate_password_strength_no_digits(self, auth_manager: AuthManager):
        """Test password validation without digits"""
        password = "NoDigitsHere!"

        is_valid, errors = auth_manager.validate_password_strength(password)

        assert is_valid is False
        assert any("digit" in error for error in errors)

    def test_validate_password_strength_no_special_chars(self, auth_manager: AuthManager):
        """Test password validation without special characters"""
        password = "NoSpecialChars123"

        is_valid, errors = auth_manager.validate_password_strength(password)

        assert is_valid is False
        assert any("special character" in error for error in errors)

    def test_validate_password_strength_common_pattern(self, auth_manager: AuthManager):
        """Test password validation with common pattern"""
        password = "Password123!"

        is_valid, errors = auth_manager.validate_password_strength(password)

        assert is_valid is False
        assert any("common weak pattern" in error for error in errors)

    def test_validate_password_strength_repeated_chars(self, auth_manager: AuthManager):
        """Test password validation with repeated characters"""
        password = "Aaa111!!!"

        is_valid, errors = auth_manager.validate_password_strength(password)

        assert is_valid is False
        assert any("repeated characters" in error for error in errors)


# =============================================================================
# AuthService Tests
# =============================================================================

@pytest.mark.unit
class TestAuthService:
    """Test AuthService class"""

    def test_authenticate_user_success(self, db_session: Session, test_user: User, test_user_data: dict):
        """Test successful user authentication"""
        auth_service = AuthService()

        user = auth_service.authenticate_user(
            db=db_session,
            username=test_user_data["username"],
            password=test_user_data["password"]
        )

        assert user is not None
        assert user.username == test_user_data["username"]
        assert user.email == test_user_data["email"]

    def test_authenticate_user_wrong_password(self, db_session: Session, test_user: User, test_user_data: dict):
        """Test user authentication with wrong password"""
        auth_service = AuthService()

        user = auth_service.authenticate_user(
            db=db_session,
            username=test_user_data["username"],
            password="WrongPassword123!"
        )

        assert user is None

    def test_authenticate_user_nonexistent(self, db_session: Session):
        """Test authentication with non-existent user"""
        auth_service = AuthService()

        user = auth_service.authenticate_user(
            db=db_session,
            username="nonexistent_user",
            password="SomePassword123!"
        )

        assert user is None

    def test_create_user_success(self, db_session: Session):
        """Test successful user creation"""
        auth_service = AuthService()

        user = auth_service.create_user(
            db=db_session,
            username="newuser",
            email="newuser@example.com",
            password="MyStrongP@ss123",  # Changed to avoid "password" pattern
            role="user"
        )

        assert user is not None
        assert user.username == "newuser"
        assert user.email == "newuser@example.com"
        assert user.hashed_password != "MyStrongP@ss123"
        assert user.role == ModelUserRole.user

    def test_create_user_duplicate_username(self, db_session: Session, test_user: User):
        """Test creating user with duplicate username"""
        auth_service = AuthService()

        with pytest.raises(HTTPException) as exc_info:
            auth_service.create_user(
                db=db_session,
                username=test_user.username,  # Duplicate
                email="different@example.com",
                password="MyStrongP@ss123",
                role="user"
            )

        assert exc_info.value.status_code == 409
        assert "already exists" in str(exc_info.value.detail)

    def test_create_user_duplicate_email(self, db_session: Session, test_user: User):
        """Test creating user with duplicate email"""
        auth_service = AuthService()

        with pytest.raises(HTTPException) as exc_info:
            auth_service.create_user(
                db=db_session,
                username="differentuser",
                email=test_user.email,  # Duplicate
                password="MyStrongP@ss123",
                role="user"
            )

        assert exc_info.value.status_code == 409
        assert "already exists" in str(exc_info.value.detail)

    def test_create_user_weak_password(self, db_session: Session):
        """Test creating user with weak password"""
        auth_service = AuthService()

        with pytest.raises(HTTPException) as exc_info:
            auth_service.create_user(
                db=db_session,
                username="newuser",
                email="newuser@example.com",
                password="weak",  # Too weak
                role="user"
            )

        assert exc_info.value.status_code == 422

    def test_login_user_success(self, db_session: Session, test_user: User, test_user_data: dict):
        """Test successful user login"""
        auth_service = AuthService()

        result = auth_service.login_user(
            db=db_session,
            username=test_user_data["username"],
            password=test_user_data["password"]
        )

        assert "access_token" in result
        assert "refresh_token" in result
        assert "token_type" in result
        assert result["token_type"] == "bearer"
        assert isinstance(result["access_token"], str)
        assert isinstance(result["refresh_token"], str)

    def test_login_user_wrong_password(self, db_session: Session, test_user: User, test_user_data: dict):
        """Test user login with wrong password"""
        auth_service = AuthService()

        with pytest.raises(HTTPException) as exc_info:
            auth_service.login_user(
                db=db_session,
                username=test_user_data["username"],
                password="WrongPassword123!"
            )

        assert exc_info.value.status_code == 401
        assert "Invalid" in str(exc_info.value.detail)

    def test_login_user_nonexistent(self, db_session: Session):
        """Test login with non-existent user"""
        auth_service = AuthService()

        with pytest.raises(HTTPException) as exc_info:
            auth_service.login_user(
                db=db_session,
                username="nonexistent",
                password="SomePassword123!"
            )

        assert exc_info.value.status_code == 401

    def test_refresh_access_token_success(self, db_session: Session, test_user: User):
        """Test successful token refresh"""
        auth_service = AuthService()

        # Create a refresh token with real user ID
        refresh_token_data = {"sub": str(test_user.id), "username": test_user.username}
        refresh_token = auth_service.auth_manager.create_refresh_token(refresh_token_data)

        result = auth_service.refresh_access_token(refresh_token, db=db_session)

        assert "access_token" in result
        assert "token_type" in result
        assert result["token_type"] == "bearer"
        assert isinstance(result["access_token"], str)

    def test_refresh_access_token_invalid(self, db_session: Session):
        """Test token refresh with invalid token"""
        auth_service = AuthService()

        with pytest.raises(HTTPException) as exc_info:
            auth_service.refresh_access_token("invalid.token.here", db=db_session)

        assert exc_info.value.status_code == 401
        assert "Invalid" in str(exc_info.value.detail)

    def test_refresh_access_token_expired(self, db_session: Session):
        """Test token refresh with expired token"""
        auth_service = AuthService()
        config = SecurityConfig()

        # Create expired token
        data = {"sub": "test_user_id", "username": "testuser"}
        expire = datetime.utcnow() - timedelta(days=1)  # Expired
        data["exp"] = expire
        expired_token = jwt.encode(data, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)

        with pytest.raises(HTTPException) as exc_info:
            auth_service.refresh_access_token(expired_token, db=db_session)

        assert exc_info.value.status_code == 401


# =============================================================================
# AuthorizationService Tests
# =============================================================================

@pytest.mark.unit
class TestAuthorizationService:
    """Test AuthorizationService class"""

    def test_has_permission_admin_read(self):
        """Test admin has read permission"""
        auth_z = AuthorizationService()

        result = auth_z.has_permission(UserRole.ADMIN.value, PermissionLevel.READ)

        assert result is True

    def test_has_permission_admin_write(self):
        """Test admin has write permission"""
        auth_z = AuthorizationService()

        result = auth_z.has_permission(UserRole.ADMIN.value, PermissionLevel.WRITE)

        assert result is True

    def test_has_permission_admin_admin(self):
        """Test admin has admin permission"""
        auth_z = AuthorizationService()

        result = auth_z.has_permission(UserRole.ADMIN.value, PermissionLevel.ADMIN)

        assert result is True

    def test_has_permission_manager_read(self):
        """Test manager has read permission"""
        auth_z = AuthorizationService()

        result = auth_z.has_permission(UserRole.MANAGER.value, PermissionLevel.READ)

        assert result is True

    def test_has_permission_manager_write(self):
        """Test manager has write permission"""
        auth_z = AuthorizationService()

        result = auth_z.has_permission(UserRole.MANAGER.value, PermissionLevel.WRITE)

        assert result is True

    def test_has_permission_manager_no_admin(self):
        """Test manager does not have admin permission"""
        auth_z = AuthorizationService()

        result = auth_z.has_permission(UserRole.MANAGER.value, PermissionLevel.ADMIN)

        assert result is False

    def test_has_permission_user_read(self):
        """Test user has read permission"""
        auth_z = AuthorizationService()

        result = auth_z.has_permission(UserRole.USER.value, PermissionLevel.READ)

        assert result is True

    def test_has_permission_user_no_write(self):
        """Test user does not have write permission"""
        auth_z = AuthorizationService()

        result = auth_z.has_permission(UserRole.USER.value, PermissionLevel.WRITE)

        assert result is False

    def test_has_permission_user_no_admin(self):
        """Test user does not have admin permission"""
        auth_z = AuthorizationService()

        result = auth_z.has_permission(UserRole.USER.value, PermissionLevel.ADMIN)

        assert result is False

    def test_has_permission_unknown_role(self):
        """Test unknown role defaults to read permission"""
        auth_z = AuthorizationService()

        # Unknown role should get READ permission
        result_read = auth_z.has_permission("unknown_role", PermissionLevel.READ)
        result_write = auth_z.has_permission("unknown_role", PermissionLevel.WRITE)

        assert result_read is True
        assert result_write is False
