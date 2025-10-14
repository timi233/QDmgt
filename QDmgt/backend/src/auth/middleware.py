from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import os
from datetime import datetime
from ..database import get_db
from ..models.user import User
from ..models.assignment import ChannelAssignment, PermissionLevel
from ..services.assignment_service import AssignmentService
from ..utils.logger import logger


# Secret key for JWT - should be loaded from environment variables in production
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"


class AuthMiddleware:
    def __init__(self):
        self.security = HTTPBearer()
    
    async def authenticate_user(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate user based on JWT token
        
        Returns:
            Dict with user information if authenticated, None otherwise
        """
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id is None:
                logger.warning("Invalid token payload - missing user ID")
                return None
            
            # In a real implementation, you would validate the user exists in the database
            # For now, we'll just return the extracted user info
            return {
                "user_id": user_id,
                "username": payload.get("username", ""),
                "email": payload.get("email", ""),
                "role": payload.get("role", "user")
            }
        except JWTError as e:
            logger.warning("JWT decode error", extra={"error": str(e)})
            return None
        except Exception as e:
            logger.error("Unexpected error during authentication", extra={"error": str(e)})
            return None
    
    async def get_current_user(self, request: Request) -> Dict[str, Any]:
        """
        Get current authenticated user from request
        
        Raises:
            HTTPException: If user is not authenticated
        """
        credentials: HTTPAuthorizationCredentials = await self.security(request)
        
        user = await self.authenticate_user(credentials.credentials)
        if user is None:
            logger.warning("Authentication failed", extra={"token": credentials.credentials[:10] + "..."})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info("User authenticated successfully", extra={"user_id": user["user_id"]})
        return user


class PermissionMiddleware:
    def __init__(self):
        self.auth_middleware = AuthMiddleware()
    
    async def check_permission(
        self, 
        request: Request, 
        db: Session, 
        required_permission: PermissionLevel,
        channel_id_param: Optional[str] = "channel_id"
    ) -> bool:
        """
        Check if the authenticated user has the required permission for a channel
        
        Args:
            request: FastAPI request object
            db: Database session
            required_permission: Required permission level
            channel_id_param: Name of the path parameter containing channel ID
            
        Returns:
            True if user has permission, False otherwise
            
        Raises:
            HTTPException: If user is not authenticated or doesn't have permission
        """
        # Get current user
        try:
            user = await self.auth_middleware.get_current_user(request)
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Error getting current user", extra={"error": str(e)})
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )
        
        # Extract channel ID from request path parameters
        channel_id = request.path_params.get(channel_id_param)
        if not channel_id:
            logger.warning("Channel ID not found in request path parameters", extra={
                "path_params": request.path_params,
                "expected_param": channel_id_param
            })
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Channel ID not specified"
            )
        
        try:
            # Check if user has required permission for the channel
            has_permission = AssignmentService.has_permission(
                db, 
                user["user_id"], 
                channel_id, 
                required_permission
            )
            
            if not has_permission:
                logger.warning("User lacks required permission for channel", extra={
                    "user_id": user["user_id"],
                    "channel_id": channel_id,
                    "required_permission": required_permission.value
                })
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required: {required_permission.value}"
                )
            
            logger.info("Permission check passed", extra={
                "user_id": user["user_id"],
                "channel_id": channel_id,
                "required_permission": required_permission.value
            })
            
            return True
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error("Error checking user permission", extra={
                "error": str(e),
                "user_id": user["user_id"],
                "channel_id": channel_id,
                "required_permission": required_permission.value
            })
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )
    
    async def require_admin_role(self, request: Request) -> bool:
        """
        Require user to have admin role
        
        Raises:
            HTTPException: If user is not authenticated or doesn't have admin role
        """
        user = await self.auth_middleware.get_current_user(request)
        
        if user["role"] != "admin":
            logger.warning("User lacks admin role", extra={
                "user_id": user["user_id"],
                "user_role": user["role"]
            })
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin role required"
            )
        
        logger.info("Admin role verified", extra={"user_id": user["user_id"]})
        return True


# Create middleware instances
auth_middleware = AuthMiddleware()
permission_middleware = PermissionMiddleware()


# Dependency functions for FastAPI routes
async def get_current_user(request: Request) -> Dict[str, Any]:
    """Dependency to get current authenticated user"""
    return await auth_middleware.get_current_user(request)


async def require_read_permission(
    request: Request, 
    db: Session = Depends(get_db)
) -> bool:
    """Dependency to require read permission for channel"""
    return await permission_middleware.check_permission(
        request, db, PermissionLevel.read, "channel_id"
    )


async def require_write_permission(
    request: Request, 
    db: Session = Depends(get_db)
) -> bool:
    """Dependency to require write permission for channel"""
    return await permission_middleware.check_permission(
        request, db, PermissionLevel.write, "channel_id"
    )


async def require_admin_permission(
    request: Request, 
    db: Session = Depends(get_db)
) -> bool:
    """Dependency to require admin permission for channel"""
    return await permission_middleware.check_permission(
        request, db, PermissionLevel.admin, "channel_id"
    )


async def require_admin_role(request: Request) -> bool:
    """Dependency to require admin role"""
    return await permission_middleware.require_admin_role(request)


# Decorator for protecting routes with permissions
def require_permission(permission_level: PermissionLevel):
    """
    Decorator to protect routes with specific permission levels
    
    Usage:
        @app.get("/channels/{channel_id}")
        @require_permission(PermissionLevel.read)
        async def get_channel(channel_id: str, user: dict = Depends(get_current_user)):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # This would need to be implemented with more sophisticated introspection
            # For now, we recommend using the dependency injection approach above
            return await func(*args, **kwargs)
        return wrapper
    return decorator