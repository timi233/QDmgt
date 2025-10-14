"""
Integration Tests for Authentication API

This module tests the authentication API endpoints end-to-end.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.src.models.user import User


# =============================================================================
# Register Tests
# =============================================================================

@pytest.mark.integration
class TestRegisterAPI:
    """Test POST /auth/register endpoint"""

    def test_register_success(self, client: TestClient, db_session: Session):
        """Test successful user registration"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "NewUser123!",
                "full_name": "New User",
                "role": "user"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@example.com"
        assert data["full_name"] == "New User"
        assert data["role"] == "user"
        assert data["is_active"] is True
        assert "id" in data
        assert "created_at" in data
        assert "hashed_password" not in data  # Should not expose password

    def test_register_minimal_fields(self, client: TestClient):
        """Test registration with minimal required fields"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "minimaluser",
                "email": "minimal@example.com",
                "password": "Minimal123!"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "minimaluser"
        assert data["role"] == "user"  # Default role

    def test_register_duplicate_username(self, client: TestClient, test_user: User):
        """Test registration with duplicate username"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": test_user.username,  # Duplicate
                "email": "different@example.com",
                "password": "DiffPass123!"
            }
        )

        assert response.status_code == 409  # Conflict

    def test_register_duplicate_email(self, client: TestClient, test_user: User):
        """Test registration with duplicate email"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "differentuser",
                "email": test_user.email,  # Duplicate
                "password": "DiffPass123!"
            }
        )

        assert response.status_code == 409  # Conflict

    def test_register_weak_password(self, client: TestClient):
        """Test registration with weak password"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "weakpassuser",
                "email": "weak@example.com",
                "password": "weak"  # Too weak
            }
        )

        assert response.status_code == 422  # Unprocessable Entity

    def test_register_invalid_email(self, client: TestClient):
        """Test registration with invalid email"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "invalidemail",
                "email": "not-an-email",  # Invalid
                "password": "ValidPass123!"
            }
        )

        assert response.status_code == 422  # Unprocessable Entity


# =============================================================================
# Login Tests
# =============================================================================

@pytest.mark.integration
class TestLoginAPI:
    """Test POST /auth/login endpoint"""

    def test_login_success(self, client: TestClient, test_user: User, test_user_data: dict):
        """Test successful login"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": test_user_data["username"],
                "password": test_user_data["password"]
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0
        assert len(data["refresh_token"]) > 0

    def test_login_invalid_username(self, client: TestClient):
        """Test login with non-existent username"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "nonexistent",
                "password": "SomePass123!"
            }
        )

        assert response.status_code == 401  # Unauthorized

    def test_login_invalid_password(self, client: TestClient, test_user: User):
        """Test login with wrong password"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": test_user.username,
                "password": "WrongPassword123!"
            }
        )

        assert response.status_code == 401  # Unauthorized

    def test_login_missing_fields(self, client: TestClient):
        """Test login with missing required fields"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser"
                # Missing password
            }
        )

        assert response.status_code == 422  # Unprocessable Entity


# =============================================================================
# Refresh Token Tests
# =============================================================================

@pytest.mark.integration
class TestRefreshTokenAPI:
    """Test POST /auth/refresh endpoint"""

    def test_refresh_token_success(self, client: TestClient, test_user: User, test_user_data: dict):
        """Test successful token refresh"""
        # First, login to get tokens
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "username": test_user_data["username"],
                "password": test_user_data["password"]
            }
        )
        assert login_response.status_code == 200
        tokens = login_response.json()
        refresh_token = tokens["refresh_token"]

        # Then refresh
        response = client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": refresh_token
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["access_token"] != tokens["access_token"]  # New token

    def test_refresh_token_invalid(self, client: TestClient):
        """Test token refresh with invalid token"""
        response = client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": "invalid.token.here"
            }
        )

        assert response.status_code == 401  # Unauthorized

    def test_refresh_token_missing(self, client: TestClient):
        """Test token refresh without token"""
        response = client.post(
            "/api/v1/auth/refresh",
            json={}
        )

        assert response.status_code == 422  # Unprocessable Entity


# =============================================================================
# Logout Tests
# =============================================================================

@pytest.mark.integration
class TestLogoutAPI:
    """Test POST /auth/logout endpoint"""

    def test_logout_success(self, client: TestClient, auth_headers_user: dict):
        """Test successful logout"""
        response = client.post(
            "/api/v1/auth/logout",
            headers=auth_headers_user
        )

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    def test_logout_unauthorized(self, client: TestClient):
        """Test logout without authentication"""
        response = client.post(
            "/api/v1/auth/logout"
        )

        assert response.status_code == 403  # Forbidden (no credentials)


# =============================================================================
# Get Current User Tests
# =============================================================================

@pytest.mark.integration
class TestGetCurrentUserAPI:
    """Test GET /auth/me endpoint"""

    def test_get_current_user_success(self, client: TestClient, test_user: User, auth_headers_user: dict):
        """Test getting current user profile"""
        response = client.get(
            "/api/v1/auth/me",
            headers=auth_headers_user
        )

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == test_user.username
        assert data["email"] == test_user.email
        assert data["id"] == str(test_user.id)
        assert "hashed_password" not in data  # Should not expose password

    def test_get_current_user_unauthorized(self, client: TestClient):
        """Test getting current user without authentication"""
        response = client.get(
            "/api/v1/auth/me"
        )

        assert response.status_code == 403  # Forbidden

    def test_get_current_user_invalid_token(self, client: TestClient):
        """Test getting current user with invalid token"""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"}
        )

        assert response.status_code == 401  # Unauthorized


# =============================================================================
# Integration Flow Tests
# =============================================================================

@pytest.mark.integration
class TestAuthenticationFlow:
    """Test complete authentication workflows"""

    def test_complete_auth_flow(self, client: TestClient):
        """Test complete registration -> login -> access protected -> refresh -> logout flow"""
        # Step 1: Register
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "flowuser",
                "email": "flow@example.com",
                "password": "FlowUser123!",
                "full_name": "Flow User"
            }
        )
        assert register_response.status_code == 201

        # Step 2: Login
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "flowuser",
                "password": "FlowUser123!"
            }
        )
        assert login_response.status_code == 200
        tokens = login_response.json()

        # Step 3: Access protected endpoint
        me_response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        assert me_response.status_code == 200
        user_data = me_response.json()
        assert user_data["username"] == "flowuser"

        # Step 4: Refresh token
        refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]}
        )
        assert refresh_response.status_code == 200
        new_tokens = refresh_response.json()
        assert new_tokens["access_token"] != tokens["access_token"]

        # Step 5: Logout
        logout_response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {new_tokens['access_token']}"}
        )
        assert logout_response.status_code == 200

    def test_auth_flow_different_roles(self, client: TestClient):
        """Test authentication with different user roles"""
        roles_passwords = [
            ("user", "UserPass123!"),
            ("manager", "ManagerPass123!"),
            ("admin", "SuperPass123!")  # Changed from "AdminPass123!" to avoid weak pattern
        ]

        for i, (role, password) in enumerate(roles_passwords):
            # Register user with specific role
            response = client.post(
                "/api/v1/auth/register",
                json={
                    "username": f"{role}test{i}",
                    "email": f"{role}{i}@example.com",
                    "password": password,
                    "role": role
                }
            )
            assert response.status_code == 201
            data = response.json()
            assert data["role"] == role

            # Login and verify
            login_response = client.post(
                "/api/v1/auth/login",
                json={
                    "username": f"{role}test{i}",
                    "password": password
                }
            )
            assert login_response.status_code == 200
