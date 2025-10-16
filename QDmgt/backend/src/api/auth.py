"""
Authentication API Endpoints for Channel Management System

This module provides REST API endpoints for user authentication,
including registration, login, token refresh, and user profile management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from enum import Enum

from ..database import get_db
from ..auth.auth_service import AuthService, AuthManager, get_current_user
from ..models.user import UserRole, User
from ..utils.logger import logger


router = APIRouter(prefix="/auth", tags=["authentication"])


# =============================================================================
# Request/Response Models
# =============================================================================

class UserRoleEnum(str, Enum):
    """User role enumeration for API"""
    admin = "admin"
    manager = "manager"
    user = "user"


class RegisterRequest(BaseModel):
    """User registration request"""
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, max_length=128, description="Password")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")
    role: UserRoleEnum = Field(UserRoleEnum.user, description="User role")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "john.doe@example.com",
                "password": "SecurePass123!",
                "full_name": "John Doe",
                "role": "user"
            }
        }


class LoginRequest(BaseModel):
    """User login request"""
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "johndoe",
                "password": "SecurePass123!"
            }
        }


class TokenResponse(BaseModel):
    """Token response"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field("bearer", description="Token type")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer"
            }
        }


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str = Field(..., description="Refresh token")

    class Config:
        json_schema_extra = {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }


class UserResponse(BaseModel):
    """User profile response"""
    id: str = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    email: str = Field(..., description="Email address")
    full_name: Optional[str] = Field(None, description="Full name")
    role: str = Field(..., description="User role")
    is_active: bool = Field(..., description="Whether user is active")
    created_at: datetime = Field(..., description="Creation timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "username": "johndoe",
                "email": "john.doe@example.com",
                "full_name": "John Doe",
                "role": "user",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00"
            }
        }


class UserUpdateRequest(BaseModel):
    """User update request"""
    role: UserRoleEnum = Field(..., description="User role")
    is_active: bool = Field(..., description="Whether user is active")
    password: Optional[str] = Field(None, min_length=8, max_length=128, description="New password (optional)")


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str = Field(..., description="Response message")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Operation completed successfully"
            }
        }


def _ensure_admin(current_user: Dict[str, Any]) -> None:
    if current_user.get("role") != UserRole.admin.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )


def _map_user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        is_active=user.is_active,
        created_at=user.created_at
    )


# =============================================================================
# Authentication Endpoints
# =============================================================================

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user

    **Parameters:**
    - **username**: Unique username (3-50 characters)
    - **email**: Valid email address
    - **password**: Strong password (min 8 characters)
    - **full_name**: Optional full name
    - **role**: User role (default: user)

    **Returns:**
    - User profile information

    **Raises:**
    - **409 Conflict**: If username or email already exists
    - **422 Unprocessable Entity**: If password is too weak
    """
    try:
        logger.info(f"User registration attempt: {user_data.username}")

        auth_service = AuthService()
        user = auth_service.create_user(
            db=db,
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            role=user_data.role.value
        )

        # Update full_name if provided
        if user_data.full_name:
            user.full_name = user_data.full_name
            db.commit()
            db.refresh(user)

        logger.info(f"User registered successfully: {user.username} (ID: {user.id})")

        return UserResponse(
            id=str(user.id),
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value if hasattr(user.role, 'value') else user.role,
            is_active=user.is_active,
            created_at=user.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User registration failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )


@router.post("/login", response_model=TokenResponse)
def login_user(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login user and obtain JWT tokens

    **Parameters:**
    - **username**: Username
    - **password**: Password

    **Returns:**
    - Access token and refresh token

    **Raises:**
    - **401 Unauthorized**: If credentials are invalid
    """
    try:
        logger.info(f"User login attempt: {credentials.username}")

        auth_service = AuthService()
        tokens = auth_service.login_user(
            db=db,
            username=credentials.username,
            password=credentials.password
        )

        logger.info(f"User logged in successfully: {credentials.username}")

        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type="bearer"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User login failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to login"
        )


@router.post("/refresh", response_model=TokenResponse)
def refresh_access_token(
    token_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token

    **Parameters:**
    - **refresh_token**: Valid refresh token

    **Returns:**
    - New access token and refresh token

    **Raises:**
    - **401 Unauthorized**: If refresh token is invalid or expired
    """
    try:
        logger.info("Token refresh attempt")

        auth_service = AuthService()
        new_tokens = auth_service.refresh_access_token(
            refresh_token=token_data.refresh_token,
            db=db
        )

        logger.info("Token refreshed successfully")

        return TokenResponse(
            access_token=new_tokens["access_token"],
            refresh_token=new_tokens["refresh_token"],
            token_type="bearer"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )


@router.get("/users", response_model=List[UserResponse])
def list_users(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        _ensure_admin(current_user)

        users = db.query(User).all()
        logger.info("Admin requested user list", extra={"user_count": len(users)})

        return [_map_user_to_response(user) for user in users]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    update_data: UserUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        _ensure_admin(current_user)

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user.role = UserRole(update_data.role.value)
        user.is_active = update_data.is_active

        # Update password if provided
        if update_data.password:
            auth_service = AuthService()
            user.hashed_password = auth_service.auth_manager.hash_password(update_data.password)
            logger.info("Admin updated user password", extra={"user_id": user_id})

        db.commit()
        db.refresh(user)

        logger.info("Admin updated user", extra={"user_id": user_id, "role": user.role.value, "is_active": user.is_active})

        return _map_user_to_response(user)
    except HTTPException as exc:
        db.rollback()
        raise exc
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )


@router.delete("/users/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a user account (Admin only)

    **Parameters:**
    - **user_id**: ID of the user to delete

    **Returns:**
    - Success message

    **Raises:**
    - **403 Forbidden**: If not admin
    - **404 Not Found**: If user not found
    - **409 Conflict**: If trying to delete current user
    """
    try:
        _ensure_admin(current_user)

        # Prevent deleting the current user
        current_user_id = current_user.get("sub")
        if current_user_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete your own account"
            )

        # Find the user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        username = user.username
        db.delete(user)
        db.commit()

        logger.info(f"Admin deleted user: {username} (ID: {user_id})")

        return MessageResponse(
            message=f"User '{username}' has been deleted successfully"
        )

    except HTTPException as exc:
        db.rollback()
        raise exc
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )


@router.post("/logout", response_model=MessageResponse)
def logout_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Logout user (client-side token invalidation)

    **Note:** This endpoint primarily serves as a documentation endpoint.
    Actual token invalidation should be handled on the client side by
    removing the stored tokens.

    **Returns:**
    - Success message

    **Raises:**
    - **401 Unauthorized**: If not authenticated
    """
    try:
        logger.info(f"User logout: {current_user.get('username', 'unknown')}")

        return MessageResponse(
            message="Successfully logged out. Please remove tokens from client."
        )

    except Exception as e:
        logger.error(f"User logout failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout"
        )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user's profile

    **Returns:**
    - Current user's profile information

    **Raises:**
    - **401 Unauthorized**: If not authenticated
    - **404 Not Found**: If user not found in database
    """
    try:
        from ..models.user import User

        user_id = current_user.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: user ID not found"
            )

        # Fetch user from database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return UserResponse(
            id=str(user.id),
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value if hasattr(user.role, 'value') else user.role,
            is_active=user.is_active,
            created_at=user.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )
