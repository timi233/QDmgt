"""
Authentication and Authorization Framework for Channel Management System

This module provides a complete authentication and authorization framework
with JWT token management, role-based access control, and secure session handling.
"""

from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import jwt
import re
import uuid
from enum import Enum
from passlib.hash import pbkdf2_sha256
from ..database import get_db
from ..models.user import User
from ..utils.logger import logger
from ..config.security import SecurityConfig


class UserRole(Enum):
    """User roles in the system"""
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


class PermissionLevel(Enum):
    """Permission levels for access control"""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class AuthManager:
    """Authentication and authorization manager"""
    
    def __init__(self):
        self.config = SecurityConfig()
        self.security = HTTPBearer()
    
    def create_access_token(self, data: dict) -> str:
        """
        Create JWT access token
        
        Args:
            data: Data to encode in token
            
        Returns:
            JWT access token string
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.config.JWT_SECRET_KEY, algorithm=self.config.JWT_ALGORITHM)
        return encoded_jwt
    
    def create_refresh_token(self, data: dict) -> str:
        """
        Create JWT refresh token
        
        Args:
            data: Data to encode in token
            
        Returns:
            JWT refresh token string
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.config.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.config.JWT_SECRET_KEY, algorithm=self.config.JWT_ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify JWT token
        
        Args:
            token: JWT token to verify
            
        Returns:
            Decoded token payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, self.config.JWT_SECRET_KEY, algorithms=[self.config.JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Expired token used", extra={"token": token[:10] + "..."})
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token used", extra={"token": token[:10] + "..."})
            return None
    
    async def get_current_user(
        self, 
        credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
    ) -> Dict[str, Any]:
        """
        Get current authenticated user from JWT token
        
        Args:
            credentials: HTTP authorization credentials
            
        Returns:
            User information dictionary
            
        Raises:
            HTTPException: If user is not authenticated
        """
        token = credentials.credentials
        payload = self.verify_token(token)
        
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return payload
    
    def hash_password(self, password: str) -> str:
        """
        Hash password using passlib's PBKDF2-SHA256

        Args:
            password: Plain text password

        Returns:
            Hashed password string
        """
        return pbkdf2_sha256.hash(password)

    def verify_password(self, password: str, hashed: str) -> bool:
        """
        Verify password against hash using passlib

        Args:
            password: Plain text password
            hashed: Hashed password

        Returns:
            True if password matches hash, False otherwise
        """
        try:
            return pbkdf2_sha256.verify(password, hashed)
        except Exception:
            return False
    
    def validate_password_strength(self, password: str) -> tuple[bool, List[str]]:
        """
        Validate password strength
        
        Args:
            password: Password to validate
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Length check
        if len(password) < self.config.PASSWORD_MIN_LENGTH:
            errors.append(f"Password must be at least {self.config.PASSWORD_MIN_LENGTH} characters long")
        
        # Character type checks
        if self.config.PASSWORD_REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if self.config.PASSWORD_REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if self.config.PASSWORD_REQUIRE_DIGITS and not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        if self.config.PASSWORD_REQUIRE_SPECIAL_CHARS and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        # Common password patterns to avoid
        common_patterns = [
            r'123456',
            r'password',
            r'qwerty',
            r'abc123',
            r'admin',
            r'login'
        ]
        
        for pattern in common_patterns:
            if re.search(pattern, password, re.IGNORECASE):
                errors.append("Password contains common weak pattern")
                break
        
        # Check for repeated characters
        if re.search(r'(.)\1{2,}', password):
            errors.append("Password contains too many repeated characters")
        
        return len(errors) == 0, errors


class AuthService:
    """Authentication service for user management"""
    
    def __init__(self):
        self.auth_manager = AuthManager()
        self.config = SecurityConfig()
    
    def authenticate_user(self, db: Session, username: str, password: str) -> Optional[User]:
        """
        Authenticate user with username and password
        
        Args:
            db: Database session
            username: Username
            password: Password
            
        Returns:
            User object if authentication successful, None otherwise
        """
        user = db.query(User).filter(User.username == username).first()
        
        if user and self.auth_manager.verify_password(password, user.hashed_password):
            return user
        
        return None
    
    def create_user(self, db: Session, username: str, email: str, password: str, role: str = "user") -> User:
        """
        Create new user
        
        Args:
            db: Database session
            username: Username
            email: Email address
            password: Password
            role: User role
            
        Returns:
            Created user object
            
        Raises:
            HTTPException: If user already exists or password is weak
        """
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this username or email already exists"
            )
        
        # Validate password strength
        is_valid, errors = self.auth_manager.validate_password_strength(password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="; ".join(errors)
            )
        
        # Hash password
        hashed_password = self.auth_manager.hash_password(password)
        
        # Create user
        user = User(
            id=str(uuid.uuid4()),  # Explicitly set ID as string for SQLite compatibility
            username=username,
            email=email,
            hashed_password=hashed_password,
            role=role
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user
    
    def login_user(self, db: Session, username: str, password: str) -> Dict[str, str]:
        """
        Login user and generate JWT tokens
        
        Args:
            db: Database session
            username: Username
            password: Password
            
        Returns:
            Dictionary with access and refresh tokens
            
        Raises:
            HTTPException: If authentication fails
        """
        user = self.authenticate_user(db, username, password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Create tokens
        access_token_data = {
            "sub": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": user.role.value  # Convert enum to string value
        }
        
        refresh_token_data = {
            "sub": str(user.id),
            "username": user.username
        }
        
        access_token = self.auth_manager.create_access_token(access_token_data)
        refresh_token = self.auth_manager.create_refresh_token(refresh_token_data)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    def refresh_access_token(self, refresh_token: str, db: Session) -> Dict[str, str]:
        """
        Refresh access token using refresh token

        Args:
            refresh_token: Refresh token
            db: Database session

        Returns:
            Dictionary with new access and refresh tokens

        Raises:
            HTTPException: If refresh token is invalid
        """
        payload = self.auth_manager.verify_token(refresh_token)

        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        # Get user from database to include current role and email
        user = db.query(User).filter(User.id == payload["sub"]).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        # Create new access token with complete user data
        access_token_data = {
            "sub": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": user.role.value  # Include role field
        }

        refresh_token_data = {
            "sub": str(user.id),
            "username": user.username
        }

        access_token = self.auth_manager.create_access_token(access_token_data)
        new_refresh_token = self.auth_manager.create_refresh_token(refresh_token_data)

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }


class AuthorizationService:
    """Authorization service for permission checking"""
    
    def __init__(self):
        self.config = SecurityConfig()
    
    def has_permission(self, user_role: str, required_permission: PermissionLevel) -> bool:
        """
        Check if user has required permission level
        
        Args:
            user_role: User's role
            required_permission: Required permission level
            
        Returns:
            True if user has required permission, False otherwise
        """
        # Map roles to permission levels
        role_permissions = {
            UserRole.ADMIN.value: PermissionLevel.ADMIN,
            UserRole.MANAGER.value: PermissionLevel.WRITE,
            UserRole.USER.value: PermissionLevel.READ
        }
        
        # Map permission levels to numeric values for comparison
        permission_values = {
            PermissionLevel.READ: 1,
            PermissionLevel.WRITE: 2,
            PermissionLevel.ADMIN: 3
        }
        
        user_permission = role_permissions.get(user_role, PermissionLevel.READ)
        required_value = permission_values[required_permission]
        user_value = permission_values[user_permission]
        
        return user_value >= required_value
    
    def require_permission(self, required_permission: PermissionLevel):
        """
        Decorator to require specific permission level
        
        Args:
            required_permission: Required permission level
            
        Returns:
            Decorator function
        """
        def decorator(func):
            async def wrapper(*args, **kwargs):
                # Get request from arguments
                request = None
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
                
                if request is None:
                    # Look in kwargs
                    for value in kwargs.values():
                        if isinstance(value, Request):
                            request = value
                            break
                
                if request is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Request object not found"
                    )
                
                # Get user from request state
                user_role = getattr(request.state, "user_role", None)
                if user_role is None:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User not authenticated"
                    )
                
                # Check permission
                if not self.has_permission(user_role, required_permission):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Insufficient permissions. Required: {required_permission.value}"
                    )
                
                return await func(*args, **kwargs)
            
            return wrapper
        return decorator


# Global instances
auth_manager = AuthManager()
auth_service = AuthService()
authorization_service = AuthorizationService()


# Dependency functions for FastAPI routes
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """Dependency to get current authenticated user"""
    return await auth_manager.get_current_user(credentials)


def require_admin_permission():
    """Dependency to require admin permission"""
    return authorization_service.require_permission(PermissionLevel.ADMIN)


def require_write_permission():
    """Dependency to require write permission"""
    return authorization_service.require_permission(PermissionLevel.WRITE)


def require_read_permission():
    """Dependency to require read permission"""
    return authorization_service.require_permission(PermissionLevel.READ)


# Example usage functions
async def example_login(db: Session, username: str, password: str):
    """Example login function"""
    try:
        result = auth_service.login_user(db, username, password)
        logger.info("User login successful", extra={"username": username})
        return result
    except HTTPException as e:
        logger.warning("User login failed", extra={"username": username, "error": e.detail})
        raise


async def example_create_user(db: Session, username: str, email: str, password: str, role: str = "user"):
    """Example create user function"""
    try:
        user = auth_service.create_user(db, username, email, password, role)
        logger.info("User created successfully", extra={"username": username, "user_id": str(user.id)})
        return user
    except HTTPException as e:
        logger.warning("User creation failed", extra={"username": username, "error": e.detail})
        raise


if __name__ == "__main__":
    # Example usage
    print("Authentication and Authorization Framework initialized")
    
    # Test password validation
    test_password = "MySecurePassword123!"
    is_valid, errors = auth_manager.validate_password_strength(test_password)
    print(f"Password '{test_password}' is {'valid' if is_valid else 'invalid'}")
    if errors:
        for error in errors:
            print(f"  - {error}")
    
    # Test token creation
    test_data = {"user_id": "123", "username": "testuser"}
    access_token = auth_manager.create_access_token(test_data)
    print(f"Access token created: {access_token[:20]}...")
    
    # Test token verification
    verified_data = auth_manager.verify_token(access_token)
    print(f"Token verified: {verified_data is not None}")