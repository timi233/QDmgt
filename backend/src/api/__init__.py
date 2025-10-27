"""
API Routing and Middleware Structure for Channel Management System

This module sets up the API routing structure and middleware for the FastAPI application.
"""

from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Callable, Awaitable, Optional, Dict, Any
from datetime import datetime
import time
import uuid
from ..utils.logger import logger
from ..config.security import SecurityConfig
from ..auth.auth_service import get_current_user, require_admin_permission, require_write_permission, require_read_permission


# Main API router
api_router = APIRouter(prefix="/api")


# Sub-routers for different modules
channels_router = APIRouter(prefix="/channels", tags=["channels"])
targets_router = APIRouter(prefix="/targets", tags=["targets"])
assignments_router = APIRouter(prefix="/assignments", tags=["assignments"])
execution_plans_router = APIRouter(prefix="/execution-plans", tags=["execution-plans"])
auth_router = APIRouter(prefix="/auth", tags=["authentication"])
users_router = APIRouter(prefix="/users", tags=["users"])
analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])
admin_router = APIRouter(prefix="/admin", tags=["administration"])


class APIMiddleware:
    """API middleware for request/response processing"""
    
    def __init__(self):
        self.config = SecurityConfig()
    
    async def request_logging_middleware(
        self, 
        request: Request, 
        call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """
        Middleware to log incoming requests
        
        Args:
            request: Incoming request
            call_next: Next middleware/callable in chain
            
        Returns:
            Response from next middleware/handler
        """
        start_time = time.time()
        request_id = str(uuid.uuid4())
        
        # Add request ID to request state
        request.state.request_id = request_id
        
        # Log request
        logger.info("Incoming request", extra={
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "client_ip": self._get_client_ip(request),
            "user_agent": request.headers.get("user-agent", "Unknown"),
            "timestamp": datetime.utcnow().isoformat()
        })
        
        try:
            # Process request
            response = await call_next(request)
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Log response
            logger.info("Request processed", extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "status_code": response.status_code,
                "process_time": f"{process_time:.4f}s",
                "timestamp": datetime.utcnow().isoformat()
            })
            
            return response
            
        except Exception as e:
            # Log exception
            logger.error("Request processing error", extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "error": str(e),
                "error_type": type(e).__name__,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Re-raise exception
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address from request
        
        Args:
            request: Incoming request
            
        Returns:
            Client IP address
        """
        # Check for forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to client host
        return request.client.host if request.client else "unknown"
    
    async def error_handling_middleware(
        self, 
        request: Request, 
        call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """
        Middleware to handle and format errors consistently
        
        Args:
            request: Incoming request
            call_next: Next middleware/callable in chain
            
        Returns:
            Response with consistent error formatting
        """
        try:
            return await call_next(request)
        except HTTPException as e:
            # Log HTTP exceptions
            logger.warning("HTTP exception", extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "status_code": e.status_code,
                "detail": e.detail,
                "method": request.method,
                "url": str(request.url)
            })
            
            # Return consistent error format
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "error": "Client Error",
                    "message": e.detail,
                    "status_code": e.status_code,
                    "request_id": getattr(request.state, "request_id", None)
                }
            )
        except Exception as e:
            # Log unexpected errors
            logger.error("Unexpected error", extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "error": str(e),
                "error_type": type(e).__name__,
                "method": request.method,
                "url": str(request.url),
                "traceback": str(e.__traceback__) if hasattr(e, '__traceback__') else "No traceback"
            })
            
            # Return consistent error format
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred",
                    "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                    "request_id": getattr(request.state, "request_id", None)
                }
            )


def setup_cors_middleware(app: FastAPI):
    """
    Setup CORS middleware for the application
    
    Args:
        app: FastAPI application instance
    """
    config = SecurityConfig()
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600
    )
    
    logger.info("CORS middleware configured", extra={
        "allowed_origins": config.ALLOWED_ORIGINS
    })


def setup_api_routes(app: FastAPI):
    """
    Setup API routes and middleware for the application
    
    Args:
        app: FastAPI application instance
    """
    # Initialize middleware
    api_middleware = APIMiddleware()
    
    # Add request logging middleware
    app.middleware("http")(api_middleware.request_logging_middleware)
    
    # Add error handling middleware
    app.middleware("http")(api_middleware.error_handling_middleware)
    
    # Setup CORS
    setup_cors_middleware(app)
    
    # Include sub-routers
    api_router.include_router(auth_router)
    api_router.include_router(users_router)
    api_router.include_router(channels_router)
    api_router.include_router(targets_router)
    api_router.include_router(assignments_router)
    api_router.include_router(execution_plans_router)
    api_router.include_router(analytics_router)
    api_router.include_router(admin_router)
    
    # Include main API router
    app.include_router(api_router)
    
    logger.info("API routes and middleware configured")


# Example route handlers for different modules
@auth_router.post("/login")
async def login():
    """Login endpoint"""
    return {"message": "Login endpoint"}

@auth_router.post("/register")
async def register():
    """Register endpoint"""
    return {"message": "Register endpoint"}

@auth_router.post("/refresh")
async def refresh_token():
    """Refresh token endpoint"""
    return {"message": "Refresh token endpoint"}

@auth_router.post("/logout")
async def logout():
    """Logout endpoint"""
    return {"message": "Logout endpoint"}

@channels_router.get("/")
async def list_channels():
    """List channels endpoint"""
    return {"message": "List channels endpoint"}

@channels_router.post("/")
async def create_channel():
    """Create channel endpoint"""
    return {"message": "Create channel endpoint"}

@channels_router.get("/{channel_id}")
async def get_channel(channel_id: str):
    """Get channel endpoint"""
    return {"message": f"Get channel {channel_id} endpoint"}

@channels_router.put("/{channel_id}")
async def update_channel(channel_id: str):
    """Update channel endpoint"""
    return {"message": f"Update channel {channel_id} endpoint"}

@channels_router.delete("/{channel_id}")
async def delete_channel(channel_id: str):
    """Delete channel endpoint"""
    return {"message": f"Delete channel {channel_id} endpoint"}

@targets_router.get("/channel/{channel_id}")
async def get_channel_targets(channel_id: str):
    """Get channel targets endpoint"""
    return {"message": f"Get targets for channel {channel_id} endpoint"}

@targets_router.post("/")
async def create_target():
    """Create target endpoint"""
    return {"message": "Create target endpoint"}

@targets_router.put("/{target_id}")
async def update_target(target_id: str):
    """Update target endpoint"""
    return {"message": f"Update target {target_id} endpoint"}

@assignments_router.get("/channel/{channel_id}")
async def get_channel_assignments(channel_id: str):
    """Get channel assignments endpoint"""
    return {"message": f"Get assignments for channel {channel_id} endpoint"}

@assignments_router.post("/")
async def create_assignment():
    """Create assignment endpoint"""
    return {"message": "Create assignment endpoint"}

@execution_plans_router.get("/channel/{channel_id}")
async def get_channel_execution_plans(channel_id: str):
    """Get channel execution plans endpoint"""
    return {"message": f"Get execution plans for channel {channel_id} endpoint"}

@execution_plans_router.post("/")
async def create_execution_plan():
    """Create execution plan endpoint"""
    return {"message": "Create execution plan endpoint"}

@users_router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user info endpoint"""
    return {"message": "Get current user info endpoint", "user": current_user}

@users_router.get("/{user_id}")
async def get_user(user_id: str):
    """Get user endpoint"""
    return {"message": f"Get user {user_id} endpoint"}

@analytics_router.get("/dashboard")
async def get_dashboard_stats():
    """Get dashboard statistics endpoint"""
    return {"message": "Get dashboard statistics endpoint"}

@admin_router.get("/settings")
async def get_admin_settings():
    """Get admin settings endpoint"""
    return {"message": "Get admin settings endpoint"}

@admin_router.put("/settings")
async def update_admin_settings():
    """Update admin settings endpoint"""
    return {"message": "Update admin settings endpoint"}


# Health check endpoint
@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Channel Management System"
    }


if __name__ == "__main__":
    # Example usage
    print("API routing and middleware structure initialized")
    
    # Create example FastAPI app
    app = FastAPI(title="Channel Management System API")
    
    # Setup API routes
    setup_api_routes(app)
    
    print("API routes configured:")
    for route in app.routes:
        if hasattr(route, "path"):
            print(f"  {route.methods} {route.path}")