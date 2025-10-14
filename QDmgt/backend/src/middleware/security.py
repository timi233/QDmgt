"""
Security Middleware for FastAPI

This module implements security middleware for the FastAPI application
to enforce security policies and protect against common web vulnerabilities.
"""

from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware
from typing import Callable, Awaitable, Optional, Dict, Any
import re
import time
import uuid
from datetime import datetime, timedelta
import jwt
from .security import SecurityConfig
from ..utils.logger import logger


class SecurityMiddleware(BaseHTTPMiddleware):
    """Security middleware to enforce security policies"""
    
    def __init__(self, app: FastAPI):
        super().__init__(app)
        self.config = SecurityConfig()
        self.request_counts: Dict[str, list] = {}  # {ip: [timestamps]}
    
    async def dispatch(
        self, 
        request: Request, 
        call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Process incoming request and apply security policies"""
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Log request
        logger.info("Incoming request", extra={
            "method": request.method,
            "url": str(request.url),
            "client_ip": client_ip,
            "user_agent": request.headers.get("user-agent", "Unknown")
        })
        
        try:
            # Apply security checks
            self._apply_security_checks(request, client_ip)
            
            # Process request
            response = await call_next(request)
            
            # Apply security headers to response
            self._apply_security_headers(response)
            
            return response
            
        except HTTPException as e:
            # Log security exceptions
            logger.warning("Security violation", extra={
                "status_code": e.status_code,
                "detail": e.detail,
                "client_ip": client_ip,
                "url": str(request.url)
            })
            
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail}
            )
        except Exception as e:
            # Log unexpected errors
            logger.error("Unexpected error in security middleware", extra={
                "error": str(e),
                "client_ip": client_ip,
                "url": str(request.url)
            })
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error"}
            )
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        # Check for forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Get first IP in forwarded chain
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to client host
        return request.client.host if request.client else "unknown"
    
    def _apply_security_checks(self, request: Request, client_ip: str):
        """Apply various security checks to incoming request"""
        
        # Check rate limiting
        self._check_rate_limiting(client_ip, request)
        
        # Validate request content
        self._validate_request_content(request)
        
        # Check for common attack patterns
        self._check_attack_patterns(request)
        
        # Validate headers
        self._validate_headers(request)
    
    def _check_rate_limiting(self, client_ip: str, request: Request):
        """Check if client is rate limited"""
        now = time.time()
        window_start = now - self.config.RATE_LIMIT_WINDOW_SECONDS
        
        # Initialize or clean request counts for this IP
        if client_ip not in self.request_counts:
            self.request_counts[client_ip] = []
        
        # Remove old timestamps
        self.request_counts[client_ip] = [
            timestamp for timestamp in self.request_counts[client_ip]
            if timestamp > window_start
        ]
        
        # Add current request
        self.request_counts[client_ip].append(now)
        
        # Check if over limit
        request_count = len(self.request_counts[client_ip])
        if request_count > self.config.RATE_LIMIT_REQUESTS_PER_MINUTE:
            logger.warning("Rate limit exceeded", extra={
                "client_ip": client_ip,
                "request_count": request_count,
                "limit": self.config.RATE_LIMIT_REQUESTS_PER_MINUTE
            })
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )
    
    def _validate_request_content(self, request: Request):
        """Validate request content for security issues"""
        
        # Check content length
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.config.MAX_CONTENT_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Request entity too large"
            )
        
        # Validate content type for file uploads
        content_type = request.headers.get("content-type", "")
        if "multipart/form-data" in content_type:
            self._validate_file_upload(request)
    
    def _validate_file_upload(self, request: Request):
        """Validate file upload requests"""
        # In a real implementation, you would validate uploaded files
        # This is a placeholder for file validation logic
        pass
    
    def _check_attack_patterns(self, request: Request):
        """Check for common attack patterns in request"""
        
        # Check URL path
        url_path = str(request.url).lower()
        
        # SQL Injection patterns
        sql_patterns = [
            r"(union|select|insert|update|delete|drop|create|alter|exec|execute)",
            r"(%27)|(')|(--)|(%23)|(#)",
            r"((%3d)|(=))[^\n]*((%27)|(')|(--)|(%3b)|(;))",
            r"((%3d)|(=))[^\n]*((%23)|(#))"
        ]
        
        for pattern in sql_patterns:
            if re.search(pattern, url_path, re.IGNORECASE):
                logger.warning("Potential SQL injection detected", extra={
                    "url_path": url_path,
                    "pattern": pattern
                })
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid request"
                )
        
        # XSS patterns
        xss_patterns = [
            r"<script.*?>",
            r"javascript:",
            r"on(load|error|click|mouseover|focus)="
        ]
        
        for pattern in xss_patterns:
            if re.search(pattern, url_path, re.IGNORECASE):
                logger.warning("Potential XSS attack detected", extra={
                    "url_path": url_path,
                    "pattern": pattern
                })
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid request"
                )
        
        # Path traversal patterns
        path_traversal_patterns = [
            r"\.\./",
            r"\.\.\\",
            r"%2e%2e%2f",
            r"%252e%252e%252f"
        ]
        
        for pattern in path_traversal_patterns:
            if re.search(pattern, url_path, re.IGNORECASE):
                logger.warning("Potential path traversal attack detected", extra={
                    "url_path": url_path,
                    "pattern": pattern
                })
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid request"
                )
    
    def _validate_headers(self, request: Request):
        """Validate request headers"""
        
        # Check for dangerous headers
        dangerous_headers = [
            "x-forwarded-for",
            "x-forwarded-host",
            "x-forwarded-proto",
            "x-original-url",
            "x-rewrite-url"
        ]
        
        for header in dangerous_headers:
            if header in request.headers:
                # Log but don't necessarily block (some proxies legitimately use these)
                logger.info("Potentially dangerous header detected", extra={
                    "header": header,
                    "value": request.headers.get(header),
                    "client_ip": self._get_client_ip(request)
                })
    
    def _apply_security_headers(self, response: Response):
        """Apply security headers to response"""
        
        # Apply CSP headers
        csp_policy_parts = []
        for directive, sources in self.config.CSP_POLICY.items():
            csp_policy_parts.append(f"{directive} {' '.join(sources)}")
        csp_policy = "; ".join(csp_policy_parts)
        
        response.headers["Content-Security-Policy"] = csp_policy
        
        # Apply other security headers
        for header, value in self.config.SECURITY_HEADERS.items():
            response.headers[header] = value
        
        # Apply HSTS header in production
        if self.config.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Apply CORS headers
        # Note: These are typically handled by CORSMiddleware, but we ensure they're set
        if hasattr(self.app, "middleware_stack"):
            cors_middleware = None
            for middleware in getattr(self.app, "middleware_stack", []):
                if isinstance(middleware, CORSMiddleware):
                    cors_middleware = middleware
                    break
            
            if cors_middleware:
                # CORS headers will be applied by CORSMiddleware
                pass


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """Authentication middleware to verify JWT tokens"""
    
    def __init__(self, app: FastAPI):
        super().__init__(app)
        self.config = SecurityConfig()
    
    async def dispatch(
        self, 
        request: Request, 
        call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Process incoming request and verify authentication"""
        
        # Skip authentication for public endpoints
        public_paths = [
            "/api/auth/login",
            "/api/auth/register",
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json"
        ]
        
        if request.url.path in public_paths:
            return await call_next(request)
        
        # Extract JWT token
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("Missing or invalid authorization header", extra={
                "url": str(request.url),
                "client_ip": request.client.host if request.client else "unknown"
            })
            
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Missing or invalid authorization header"}
            )
        
        token = auth_header.split(" ")[1]
        
        try:
            # Verify JWT token
            payload = jwt.decode(
                token, 
                self.config.JWT_SECRET_KEY, 
                algorithms=[self.config.JWT_ALGORITHM]
            )
            
            # Add user info to request state
            request.state.user_id = payload.get("sub")
            request.state.username = payload.get("username")
            request.state.role = payload.get("role", "user")
            
            # Process request
            response = await call_next(request)
            return response
            
        except jwt.ExpiredSignatureError:
            logger.warning("Expired JWT token", extra={
                "url": str(request.url),
                "client_ip": request.client.host if request.client else "unknown"
            })
            
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token has expired"}
            )
        except jwt.InvalidTokenError:
            logger.warning("Invalid JWT token", extra={
                "url": str(request.url),
                "client_ip": request.client.host if request.client else "unknown"
            })
            
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid token"}
            )
        except Exception as e:
            logger.error("Unexpected error in authentication middleware", extra={
                "error": str(e),
                "url": str(request.url),
                "client_ip": request.client.host if request.client else "unknown"
            })
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error"}
            )


class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware"""
    
    def __init__(self, app: FastAPI):
        super().__init__(app)
        self.config = SecurityConfig()
    
    async def dispatch(
        self, 
        request: Request, 
        call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Process incoming request and check CSRF token"""
        
        # Only check CSRF for state-changing methods
        state_changing_methods = ["POST", "PUT", "PATCH", "DELETE"]
        
        if request.method in state_changing_methods:
            # Extract CSRF token from header
            csrf_token = request.headers.get(self.config.CSRF_HEADER_NAME)
            
            if not csrf_token:
                logger.warning("Missing CSRF token", extra={
                    "method": request.method,
                    "url": str(request.url),
                    "client_ip": request.client.host if request.client else "unknown"
                })
                
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Missing CSRF token"}
                )
            
            # Validate CSRF token (simplified implementation)
            # In a real implementation, you would verify against stored token
            session_csrf = request.cookies.get(self.config.CSRF_COOKIE_NAME)
            
            if not session_csrf or csrf_token != session_csrf:
                logger.warning("Invalid CSRF token", extra={
                    "method": request.method,
                    "url": str(request.url),
                    "client_ip": request.client.host if request.client else "unknown"
                })
                
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Invalid CSRF token"}
                )
        
        # Process request
        response = await call_next(request)
        return response


def add_security_middleware(app: FastAPI):
    """Add all security middleware to the FastAPI application"""
    
    # Add GZIP compression middleware (for performance)
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=SecurityConfig().ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"]
    )
    
    # Add CSRF protection middleware
    app.add_middleware(CSRFMiddleware)
    
    # Add authentication middleware
    app.add_middleware(AuthenticationMiddleware)
    
    # Add main security middleware (last to ensure all other middleware runs first)
    app.add_middleware(SecurityMiddleware)
    
    logger.info("Security middleware added to application")


# Example usage function
def create_secure_app() -> FastAPI:
    """Create a FastAPI application with security middleware"""
    
    app = FastAPI(
        title="Channel Management System",
        description="Secure API for channel management",
        version="1.0.0"
    )
    
    # Add security middleware
    add_security_middleware(app)
    
    @app.get("/health")
    async def health_check():
        return {"status": "healthy"}
    
    @app.get("/secure-endpoint")
    async def secure_endpoint(request: Request):
        return {
            "message": "This is a secure endpoint",
            "user_id": getattr(request.state, "user_id", None),
            "username": getattr(request.state, "username", None)
        }
    
    return app


if __name__ == "__main__":
    # Example usage
    app = create_secure_app()
    print("Secure FastAPI application created with security middleware")