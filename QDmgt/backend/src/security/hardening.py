"""
Security Hardening Module for Channel Management System

This module implements various security measures to protect the application
from common vulnerabilities and attacks.
"""

import hashlib
import secrets
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import jwt
from cryptography.fernet import Fernet
import logging
from functools import wraps


class SecurityConfig:
    """Security configuration settings"""
    
    # JWT settings
    JWT_SECRET_KEY = "your-super-secret-jwt-key-change-in-production"
    JWT_ALGORITHM = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS = 7
    
    # Password settings
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_REQUIRE_UPPERCASE = True
    PASSWORD_REQUIRE_LOWERCASE = True
    PASSWORD_REQUIRE_DIGITS = True
    PASSWORD_REQUIRE_SPECIAL_CHARS = True
    
    # Rate limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE = 60
    RATE_LIMIT_WINDOW_SECONDS = 60
    
    # Session settings
    SESSION_TIMEOUT_MINUTES = 30
    SESSION_INACTIVE_TIMEOUT_MINUTES = 15
    
    # Encryption key (should be loaded from secure storage in production)
    ENCRYPTION_KEY = Fernet.generate_key()
    
    # CORS settings
    ALLOWED_ORIGINS = [
        "https://yourdomain.com",
        "https://www.yourdomain.com",
        # Add more allowed origins as needed
    ]


class SecurityLogger:
    """Centralized security logging"""
    
    def __init__(self):
        self.logger = logging.getLogger("security")
        self.logger.setLevel(logging.INFO)
        
        # Create handler if it doesn't exist
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - SECURITY - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def log_security_event(self, level: str, message: str, details: Dict[str, Any] = None):
        """Log a security event"""
        log_message = f"{message}"
        if details:
            log_message += f" | Details: {details}"
        
        getattr(self.logger, level.lower())(log_message)
    
    def log_login_attempt(self, username: str, success: bool, ip_address: str = None):
        """Log a login attempt"""
        self.log_security_event(
            "INFO" if success else "WARNING",
            f"Login {'successful' if success else 'failed'} for user: {username}",
            {"ip_address": ip_address, "timestamp": datetime.now().isoformat()}
        )
    
    def log_unauthorized_access(self, user: str, resource: str, ip_address: str = None):
        """Log unauthorized access attempt"""
        self.log_security_event(
            "WARNING",
            f"Unauthorized access attempt by {user} to {resource}",
            {"ip_address": ip_address, "timestamp": datetime.now().isoformat()}
        )
    
    def log_suspicious_activity(self, activity: str, user: str = None, ip_address: str = None):
        """Log suspicious activity"""
        self.log_security_event(
            "WARNING",
            f"Suspicious activity detected: {activity}",
            {"user": user, "ip_address": ip_address, "timestamp": datetime.now().isoformat()}
        )


# Initialize security logger
security_logger = SecurityLogger()


class PasswordValidator:
    """Password validation utility"""
    
    @staticmethod
    def validate_password(password: str) -> tuple[bool, List[str]]:
        """
        Validate password strength
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Length check
        if len(password) < SecurityConfig.PASSWORD_MIN_LENGTH:
            errors.append(f"Password must be at least {SecurityConfig.PASSWORD_MIN_LENGTH} characters long")
        
        # Character type checks
        if SecurityConfig.PASSWORD_REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if SecurityConfig.PASSWORD_REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if SecurityConfig.PASSWORD_REQUIRE_DIGITS and not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        if SecurityConfig.PASSWORD_REQUIRE_SPECIAL_CHARS and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
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
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        # In a real implementation, you would use bcrypt.hashpw()
        # For this example, we'll use a simple hash with salt
        salt = secrets.token_hex(16)
        hashed = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return f"{salt}${hashed.hex()}"
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            salt, stored_hash = hashed.split('$')
            computed_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
            return computed_hash.hex() == stored_hash
        except Exception:
            return False


class TokenManager:
    """JWT token management"""
    
    @staticmethod
    def create_access_token(data: dict) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=SecurityConfig.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SecurityConfig.JWT_SECRET_KEY, algorithm=SecurityConfig.JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=SecurityConfig.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SecurityConfig.JWT_SECRET_KEY, algorithm=SecurityConfig.JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, SecurityConfig.JWT_SECRET_KEY, algorithms=[SecurityConfig.JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            security_logger.log_security_event("WARNING", "Expired token used", {"token": token[:10] + "..."})
            return None
        except jwt.InvalidTokenError:
            security_logger.log_security_event("WARNING", "Invalid token used", {"token": token[:10] + "..."})
            return None


class RateLimiter:
    """Rate limiting to prevent brute force and DoS attacks"""
    
    def __init__(self):
        self.requests = {}  # {ip_address: [(timestamp, endpoint), ...]}
    
    def is_rate_limited(self, ip_address: str, endpoint: str = None) -> bool:
        """
        Check if IP address is rate limited
        
        Returns:
            True if rate limited, False otherwise
        """
        now = datetime.now()
        window_start = now - timedelta(seconds=SecurityConfig.RATE_LIMIT_WINDOW_SECONDS)
        
        # Clean old requests
        if ip_address in self.requests:
            self.requests[ip_address] = [
                (timestamp, ep) for timestamp, ep in self.requests[ip_address]
                if timestamp > window_start
            ]
        else:
            self.requests[ip_address] = []
        
        # Add current request
        self.requests[ip_address].append((now, endpoint or "general"))
        
        # Check if over limit
        request_count = len(self.requests[ip_address])
        is_limited = request_count > SecurityConfig.RATE_LIMIT_REQUESTS_PER_MINUTE
        
        if is_limited:
            security_logger.log_security_event(
                "WARNING",
                f"Rate limit exceeded for IP: {ip_address}",
                {"request_count": request_count, "endpoint": endpoint}
            )
        
        return is_limited
    
    def get_retry_after(self, ip_address: str) -> int:
        """Get seconds until rate limit resets"""
        if ip_address not in self.requests or not self.requests[ip_address]:
            return 0
        
        oldest_request = min(timestamp for timestamp, _ in self.requests[ip_address])
        window_end = oldest_request + timedelta(seconds=SecurityConfig.RATE_LIMIT_WINDOW_SECONDS)
        now = datetime.now()
        
        if now < window_end:
            return int((window_end - now).total_seconds())
        return 0


class InputSanitizer:
    """Input sanitization to prevent XSS and injection attacks"""
    
    @staticmethod
    def sanitize_string(text: str) -> str:
        """Sanitize string input"""
        if not isinstance(text, str):
            return ""
        
        # Remove or escape dangerous characters
        sanitized = text.replace('<', '&lt;').replace('>', '&gt;')
        sanitized = re.sub(r'[^\w\s\-_.@]', '', sanitized)  # Allow only safe characters
        return sanitized.strip()
    
    @staticmethod
    def sanitize_email(email: str) -> str:
        """Sanitize email input"""
        if not isinstance(email, str):
            return ""
        
        # Basic email validation and sanitization
        email = email.strip().lower()
        if re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return email
        return ""
    
    @staticmethod
    def sanitize_html_content(html: str) -> str:
        """Sanitize HTML content (basic)"""
        if not isinstance(html, str):
            return ""
        
        # Remove script tags and other dangerous elements
        html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.IGNORECASE | re.DOTALL)
        html = re.sub(r'on\w+="[^"]*"', '', html, flags=re.IGNORECASE)
        html = re.sub(r'on\w+=\'[^\']*\'', '', html, flags=re.IGNORECASE)
        html = re.sub(r'javascript:', '', html, flags=re.IGNORECASE)
        
        return html


class SessionManager:
    """Session management with timeout and security features"""
    
    def __init__(self):
        self.sessions = {}  # {session_id: {user_id, created_at, last_activity, ip_address}}
    
    def create_session(self, user_id: str, ip_address: str = None) -> str:
        """Create new session"""
        session_id = secrets.token_urlsafe(32)
        now = datetime.now()
        
        self.sessions[session_id] = {
            "user_id": user_id,
            "created_at": now,
            "last_activity": now,
            "ip_address": ip_address
        }
        
        security_logger.log_security_event(
            "INFO",
            f"Session created for user: {user_id}",
            {"session_id": session_id[:10] + "...", "ip_address": ip_address}
        )
        
        return session_id
    
    def validate_session(self, session_id: str, ip_address: str = None) -> Optional[str]:
        """Validate session and return user_id if valid"""
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        now = datetime.now()
        
        # Check if session expired
        if now - session["created_at"] > timedelta(minutes=SecurityConfig.SESSION_TIMEOUT_MINUTES):
            del self.sessions[session_id]
            security_logger.log_security_event(
                "INFO",
                "Session expired",
                {"session_id": session_id[:10] + "...", "user_id": session["user_id"]}
            )
            return None
        
        # Check if inactive for too long
        if now - session["last_activity"] > timedelta(minutes=SecurityConfig.SESSION_INACTIVE_TIMEOUT_MINUTES):
            del self.sessions[session_id]
            security_logger.log_security_event(
                "INFO",
                "Session timed out due to inactivity",
                {"session_id": session_id[:10] + "...", "user_id": session["user_id"]}
            )
            return None
        
        # Check IP address consistency (optional security feature)
        if ip_address and session.get("ip_address") and session["ip_address"] != ip_address:
            security_logger.log_security_event(
                "WARNING",
                "IP address mismatch for session",
                {
                    "session_id": session_id[:10] + "...", 
                    "user_id": session["user_id"],
                    "original_ip": session["ip_address"],
                    "new_ip": ip_address
                }
            )
            # Optionally invalidate session here
        
        # Update last activity
        session["last_activity"] = now
        
        return session["user_id"]
    
    def destroy_session(self, session_id: str):
        """Destroy session"""
        if session_id in self.sessions:
            user_id = self.sessions[session_id]["user_id"]
            del self.sessions[session_id]
            security_logger.log_security_event(
                "INFO",
                f"Session destroyed for user: {user_id}",
                {"session_id": session_id[:10] + "..."}
            )


class SecurityAuditor:
    """Security auditing and monitoring"""
    
    def __init__(self):
        self.audit_log = []  # Store audit events
    
    def log_audit_event(self, event_type: str, user_id: str, details: Dict[str, Any] = None):
        """Log audit event"""
        audit_entry = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "user_id": user_id,
            "details": details or {}
        }
        
        self.audit_log.append(audit_entry)
        
        # Keep only last 1000 audit entries
        if len(self.audit_log) > 1000:
            self.audit_log = self.audit_log[-1000:]
    
    def get_recent_audits(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get recent audit entries"""
        cutoff = datetime.now() - timedelta(hours=hours)
        recent_audits = [
            entry for entry in self.audit_log
            if datetime.fromisoformat(entry["timestamp"]) > cutoff
        ]
        return recent_audits
    
    def get_user_audits(self, user_id: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Get audits for specific user"""
        cutoff = datetime.now() - timedelta(hours=hours)
        user_audits = [
            entry for entry in self.audit_log
            if entry["user_id"] == user_id and 
            datetime.fromisoformat(entry["timestamp"]) > cutoff
        ]
        return user_audits


# Initialize security components
rate_limiter = RateLimiter()
session_manager = SessionManager()
security_auditor = SecurityAuditor()


def require_permission(permission_level: str):
    """
    Decorator to require specific permission level for route
    
    Usage:
        @app.route('/admin')
        @require_permission('admin')
        def admin_route():
            return "Admin only content"
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # In a real implementation, you would check the user's permission level
            # This is a simplified example
            user_permission = getattr(wrapper, '_user_permission', 'read')
            
            # Map permission levels to numeric values for comparison
            permission_values = {
                'read': 1,
                'write': 2,
                'admin': 3
            }
            
            required_value = permission_values.get(permission_level, 0)
            user_value = permission_values.get(user_permission, 0)
            
            if user_value < required_value:
                security_logger.log_security_event(
                    "WARNING",
                    f"Unauthorized access attempt to {func.__name__}",
                    {"required_permission": permission_level, "user_permission": user_permission}
                )
                # In a real implementation, you would return an error response
                raise PermissionError("Insufficient permissions")
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


# Security utilities
def generate_secure_token() -> str:
    """Generate cryptographically secure random token"""
    return secrets.token_urlsafe(32)


def hash_sensitive_data(data: str) -> str:
    """Hash sensitive data for logging/storage"""
    return hashlib.sha256(data.encode()).hexdigest()[:16]  # Only store first 16 chars


def mask_sensitive_data(data: str, show_last: int = 4) -> str:
    """Mask sensitive data for display"""
    if len(data) <= show_last:
        return "*" * len(data)
    return "*" * (len(data) - show_last) + data[-show_last:]


# Example usage functions
def example_secure_login(username: str, password: str, ip_address: str = None) -> Optional[str]:
    """Example secure login implementation"""
    # Rate limiting check
    if rate_limiter.is_rate_limited(ip_address, "login"):
        return None
    
    # Sanitize inputs
    clean_username = InputSanitizer.sanitize_string(username)
    if not clean_username:
        return None
    
    # In a real implementation, you would verify the password against stored hash
    # For this example, we'll simulate a successful login
    if clean_username and len(password) >= 6:  # Simplified check
        # Log successful login
        security_logger.log_login_attempt(clean_username, True, ip_address)
        
        # Create session
        session_id = session_manager.create_session(clean_username, ip_address)
        
        # Audit log
        security_auditor.log_audit_event("login", clean_username, {"ip_address": ip_address})
        
        return session_id
    
    # Log failed login
    security_logger.log_login_attempt(clean_username, False, ip_address)
    security_auditor.log_audit_event("failed_login", clean_username, {"ip_address": ip_address})
    
    return None


def example_validate_session(session_id: str, ip_address: str = None) -> Optional[str]:
    """Example session validation"""
    return session_manager.validate_session(session_id, ip_address)


if __name__ == "__main__":
    # Example usage
    print("Security Hardening Module initialized")
    
    # Test password validation
    password = "MySecurePassword123!"
    is_valid, errors = PasswordValidator.validate_password(password)
    print(f"Password '{password}' is {'valid' if is_valid else 'invalid'}")
    if errors:
        for error in errors:
            print(f"  - {error}")
    
    # Test token creation
    token_data = {"user_id": "123", "username": "testuser"}
    access_token = TokenManager.create_access_token(token_data)
    print(f"Access token created: {access_token[:20]}...")
    
    # Test rate limiting
    client_ip = "192.168.1.100"
    for i in range(5):
        is_limited = rate_limiter.is_rate_limited(client_ip, f"test_endpoint_{i}")
        print(f"Request {i+1}: {'Rate limited' if is_limited else 'Allowed'}")
    
    # Test session management
    session_id = session_manager.create_session("testuser", client_ip)
    print(f"Session created: {session_id[:20]}...")
    
    user_id = session_manager.validate_session(session_id, client_ip)
    print(f"Session validated for user: {user_id}")
    
    # Test audit logging
    security_auditor.log_audit_event("test_event", "testuser", {"test_data": "value"})
    recent_audits = security_auditor.get_recent_audits()
    print(f"Recent audits: {len(recent_audits)}")