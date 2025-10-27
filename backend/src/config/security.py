"""
Security Configuration for Channel Management System

This module contains security configuration settings and constants
used throughout the application.
"""

import os
from typing import List, Dict, Any


class SecurityConfig:
    """Security configuration settings"""
    
    # Environment-based configuration
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
    DEBUG = ENVIRONMENT == 'development'
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-in-production')
    JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '30'))
    JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', '7'))
    
    # Password Policy
    PASSWORD_MIN_LENGTH = int(os.getenv('PASSWORD_MIN_LENGTH', '8'))
    PASSWORD_REQUIRE_UPPERCASE = os.getenv('PASSWORD_REQUIRE_UPPERCASE', 'true').lower() == 'true'
    PASSWORD_REQUIRE_LOWERCASE = os.getenv('PASSWORD_REQUIRE_LOWERCASE', 'true').lower() == 'true'
    PASSWORD_REQUIRE_DIGITS = os.getenv('PASSWORD_REQUIRE_DIGITS', 'true').lower() == 'true'
    PASSWORD_REQUIRE_SPECIAL_CHARS = os.getenv('PASSWORD_REQUIRE_SPECIAL_CHARS', 'true').lower() == 'true'
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE = int(os.getenv('RATE_LIMIT_REQUESTS_PER_MINUTE', '60'))
    RATE_LIMIT_WINDOW_SECONDS = int(os.getenv('RATE_LIMIT_WINDOW_SECONDS', '60'))
    
    # Session Configuration
    SESSION_TIMEOUT_MINUTES = int(os.getenv('SESSION_TIMEOUT_MINUTES', '30'))
    SESSION_INACTIVE_TIMEOUT_MINUTES = int(os.getenv('SESSION_INACTIVE_TIMEOUT_MINUTES', '15'))
    
    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,https://yourdomain.com').split(',')
    
    # Cookie Security
    COOKIE_SECURE = ENVIRONMENT != 'development'
    COOKIE_HTTPONLY = True
    COOKIE_SAMESITE = 'lax'
    
    # CSRF Protection
    CSRF_COOKIE_NAME = 'csrf_token'
    CSRF_HEADER_NAME = 'X-CSRF-Token'
    CSRF_TIME_LIMIT = 3600  # 1 hour
    
    # Content Security Policy
    CSP_POLICY: Dict[str, List[str]] = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],  # Consider removing unsafe-inline in production
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", "data:", "https:"],
        'font-src': ["'self'", "https:", "data:"],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"]
    }
    
    # Security Headers
    SECURITY_HEADERS: Dict[str, str] = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
    
    # Input Validation
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', '16777216'))  # 16MB
    ALLOWED_FILE_TYPES: List[str] = os.getenv('ALLOWED_FILE_TYPES', '.jpg,.jpeg,.png,.pdf,.doc,.docx').split(',')
    
    # Logging Configuration
    SECURITY_LOG_LEVEL = os.getenv('SECURITY_LOG_LEVEL', 'INFO')
    AUDIT_LOG_RETENTION_DAYS = int(os.getenv('AUDIT_LOG_RETENTION_DAYS', '90'))
    
    # Encryption
    ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')  # Should be set in production
    
    # API Security
    API_RATE_LIMIT = os.getenv('API_RATE_LIMIT', '100/hour')
    API_KEY_HEADER = os.getenv('API_KEY_HEADER', 'X-API-Key')
    
    # Database Security
    DB_CONNECTION_TIMEOUT = int(os.getenv('DB_CONNECTION_TIMEOUT', '30'))
    DB_POOL_RECYCLE = int(os.getenv('DB_POOL_RECYCLE', '3600'))
    
    # Authentication
    AUTH_SESSION_TIMEOUT = int(os.getenv('AUTH_SESSION_TIMEOUT', '1800'))  # 30 minutes
    AUTH_MAX_LOGIN_ATTEMPTS = int(os.getenv('AUTH_MAX_LOGIN_ATTEMPTS', '5'))
    AUTH_LOCKOUT_DURATION = int(os.getenv('AUTH_LOCKOUT_DURATION', '900'))  # 15 minutes
    
    # Two-Factor Authentication
    TOTP_ISSUER = os.getenv('TOTP_ISSUER', 'ChannelManagementSystem')
    TOTP_DIGITS = int(os.getenv('TOTP_DIGITS', '6'))
    TOTP_INTERVAL = int(os.getenv('TOTP_INTERVAL', '30'))
    
    # Email Security
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'true').lower() == 'true'
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
    
    # File Upload Security
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', '/var/uploads')
    MAX_UPLOAD_SIZE = int(os.getenv('MAX_UPLOAD_SIZE', '10485760'))  # 10MB
    
    # Network Security
    TRUSTED_PROXY_COUNT = int(os.getenv('TRUSTED_PROXY_COUNT', '1'))
    TRUSTED_HOSTS: List[str] = os.getenv('TRUSTED_HOSTS', 'localhost,127.0.0.1').split(',')


# Convenience functions for accessing configuration
def get_security_config() -> SecurityConfig:
    """Get security configuration instance"""
    return SecurityConfig()


def get_csp_policy() -> str:
    """Get Content Security Policy as string"""
    config = SecurityConfig()
    csp_parts = []
    for directive, sources in config.CSP_POLICY.items():
        csp_parts.append(f"{directive} {' '.join(sources)}")
    return '; '.join(csp_parts)


def get_security_headers() -> Dict[str, str]:
    """Get security headers"""
    config = SecurityConfig()
    return config.SECURITY_HEADERS.copy()


def is_production() -> bool:
    """Check if running in production environment"""
    return SecurityConfig.ENVIRONMENT == 'production'


def get_allowed_origins() -> List[str]:
    """Get allowed CORS origins"""
    config = SecurityConfig()
    return config.ALLOWED_ORIGINS.copy()


# Environment-specific overrides
if SecurityConfig.ENVIRONMENT == 'production':
    # Production-specific security settings
    SecurityConfig.COOKIE_SECURE = True
    SecurityConfig.COOKIE_SAMESITE = 'strict'
    SecurityConfig.CSP_POLICY['script-src'] = ["'self'"]  # Remove unsafe-inline
    SecurityConfig.SECURITY_LOG_LEVEL = 'WARNING'
elif SecurityConfig.ENVIRONMENT == 'staging':
    # Staging-specific security settings
    SecurityConfig.COOKIE_SECURE = True
    SecurityConfig.SECURITY_LOG_LEVEL = 'INFO'
else:
    # Development-specific security settings
    SecurityConfig.COOKIE_SECURE = False
    SecurityConfig.SECURITY_LOG_LEVEL = 'DEBUG'


# Validate critical security settings
def validate_security_config():
    """Validate critical security configuration settings"""
    config = SecurityConfig()
    
    issues = []
    
    # Check for default JWT secret in production
    if config.ENVIRONMENT == 'production' and config.JWT_SECRET_KEY == 'your-super-secret-jwt-key-change-in-production':
        issues.append("Production environment using default JWT secret key")
    
    # Check for weak password policy
    if config.PASSWORD_MIN_LENGTH < 8:
        issues.append(f"Password minimum length ({config.PASSWORD_MIN_LENGTH}) is less than recommended (8)")
    
    # Check for insecure CORS settings
    if '*' in config.ALLOWED_ORIGINS and config.ENVIRONMENT != 'development':
        issues.append("Wildcard (*) in allowed origins not recommended for production")
    
    # Check for missing encryption key
    if not config.ENCRYPTION_KEY and config.ENVIRONMENT != 'development':
        issues.append("Encryption key not set in production environment")
    
    return issues


# Run validation on import
validation_issues = validate_security_config()
if validation_issues:
    import logging
    logger = logging.getLogger(__name__)
    for issue in validation_issues:
        logger.warning(f"Security configuration issue: {issue}")


if __name__ == "__main__":
    # Example usage
    print(f"Environment: {SecurityConfig.ENVIRONMENT}")
    print(f"JWT Algorithm: {SecurityConfig.JWT_ALGORITHM}")
    print(f"Password Min Length: {SecurityConfig.PASSWORD_MIN_LENGTH}")
    print(f"Allowed Origins: {SecurityConfig.ALLOWED_ORIGINS}")
    print(f"CSP Policy: {get_csp_policy()}")
    
    # Run validation
    issues = validate_security_config()
    if issues:
        print("\nSecurity Configuration Issues:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("\nSecurity configuration validation passed")