"""
Environment Configuration Management for Channel Management System

This module manages environment-specific configuration settings
using pydantic-settings for type-safe configuration loading.
"""

from pydantic_settings import BaseSettings
from pydantic import Field, validator, AnyHttpUrl
from typing import Optional, List, Dict, Any, Union
import os
import json
from enum import Enum
from pydantic_core import Url


class Environment(str, Enum):
    """Application environments"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class DatabaseConfig(BaseSettings):
    """Database configuration settings"""
    
    # Database URL (can be SQLite or PostgreSQL)
    DATABASE_URL: str = Field(
        default="sqlite:///./test.db", 
        description="Database URL (supports SQLite or PostgreSQL)"
    )
    
    # PostgreSQL settings (for when PostgreSQL is used)
    POSTGRES_SERVER: Optional[str] = Field(default="localhost", description="PostgreSQL server hostname")
    POSTGRES_USER: Optional[str] = Field(default="postgres", description="PostgreSQL username")
    POSTGRES_PASSWORD: Optional[str] = Field(default="postgres", description="PostgreSQL password")
    POSTGRES_DB: Optional[str] = Field(default="channel_management", description="PostgreSQL database name")
    POSTGRES_PORT: Optional[int] = Field(default=5432, description="PostgreSQL port")
    
    class Config:
        env_file = ".env"
        env_prefix = "DB_"


class RedisConfig(BaseSettings):
    """Redis configuration settings"""
    
    REDIS_HOST: str = Field(default="localhost", description="Redis server hostname")
    REDIS_PORT: int = Field(default=6379, description="Redis server port")
    REDIS_DB: int = Field(default=0, description="Redis database number")
    REDIS_PASSWORD: Optional[str] = Field(default=None, description="Redis password")
    REDIS_URL: Optional[str] = None
    
    @validator("REDIS_URL", pre=True)
    def assemble_redis_url(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        """Assemble Redis URL from components if not provided"""
        if isinstance(v, str):
            return v
        
        password_part = f":{values.get('REDIS_PASSWORD')}@" if values.get("REDIS_PASSWORD") else ""
        return f"redis://{password_part}{values.get('REDIS_HOST')}:{values.get('REDIS_PORT')}/{values.get('REDIS_DB')}"
    
    class Config:
        env_file = ".env"
        env_prefix = "REDIS_"


class JWTConfig(BaseSettings):
    """JWT configuration settings"""
    
    JWT_SECRET_KEY: str = Field(
        default="your-super-secret-jwt-key-change-in-production",
        description="Secret key for JWT token signing"
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="Algorithm for JWT token signing")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="Access token expiration in minutes")
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, description="Refresh token expiration in days")
    
    class Config:
        env_file = ".env"
        env_prefix = "JWT_"


class SecurityConfig(BaseSettings):
    """Security configuration settings"""
    
    # Password policy
    PASSWORD_MIN_LENGTH: int = Field(default=8, description="Minimum password length")
    PASSWORD_REQUIRE_UPPERCASE: bool = Field(default=True, description="Require uppercase letters in passwords")
    PASSWORD_REQUIRE_LOWERCASE: bool = Field(default=True, description="Require lowercase letters in passwords")
    PASSWORD_REQUIRE_DIGITS: bool = Field(default=True, description="Require digits in passwords")
    PASSWORD_REQUIRE_SPECIAL_CHARS: bool = Field(default=True, description="Require special characters in passwords")
    
    # Rate limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(default=60, description="Maximum requests per minute per IP")
    RATE_LIMIT_WINDOW_SECONDS: int = Field(default=60, description="Rate limiting window in seconds")
    
    # Session settings
    SESSION_TIMEOUT_MINUTES: int = Field(default=30, description="Session timeout in minutes")
    SESSION_INACTIVE_TIMEOUT_MINUTES: int = Field(default=15, description="Inactive session timeout in minutes")
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "https://localhost:3000"],
        description="Allowed CORS origins"
    )

    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_allowed_origins(cls, v):
        """Parse ALLOWED_ORIGINS from JSON string if needed"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # Fallback: split by comma
                return [origin.strip() for origin in v.split(",")]
        return v

    # CSRF settings
    CSRF_COOKIE_NAME: str = Field(default="csrf_token", description="CSRF cookie name")
    CSRF_HEADER_NAME: str = Field(default="X-CSRF-Token", description="CSRF header name")
    
    class Config:
        env_file = ".env"
        env_prefix = "SECURITY_"


class LoggingConfig(BaseSettings):
    """Logging configuration settings"""
    
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    LOG_FORMAT: str = Field(default="%(asctime)s - %(name)s - %(levelname)s - %(message)s", description="Log format")
    LOG_FILE: Optional[str] = Field(default=None, description="Log file path")
    LOG_MAX_BYTES: int = Field(default=10485760, description="Maximum log file size in bytes (10MB)")
    LOG_BACKUP_COUNT: int = Field(default=5, description="Number of backup log files to keep")
    
    class Config:
        env_file = ".env"
        env_prefix = "LOG_"


class AppConfig(BaseSettings):
    """Main application configuration"""
    
    # Environment
    ENVIRONMENT: Environment = Field(default=Environment.DEVELOPMENT, description="Application environment")
    DEBUG: bool = Field(default=False, description="Debug mode")
    
    # Application settings
    APP_NAME: str = Field(default="Channel Management System", description="Project name")
    VERSION: str = Field(default="0.1.0", description="Application version")
    API_V1_STR: str = Field(default="/api/v1", description="API base path")
    SECRET_KEY: str = Field(
        default="your-secret-key-here-change-in-production",
        description="Secret key for cryptographic operations"
    )
    
    # Server settings
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    WORKERS: int = Field(default=1, description="Number of worker processes")
    
    # Third-party services
    EMAIL_HOST: Optional[str] = Field(default=None, description="SMTP server hostname")
    EMAIL_PORT: int = Field(default=587, description="SMTP server port")
    EMAIL_USERNAME: Optional[str] = Field(default=None, description="SMTP username")
    EMAIL_PASSWORD: Optional[str] = Field(default=None, description="SMTP password")
    EMAIL_USE_TLS: bool = Field(default=True, description="Use TLS for SMTP")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


class Settings(
    DatabaseConfig,
    RedisConfig,
    JWTConfig,
    SecurityConfig,
    LoggingConfig,
    AppConfig
):
    """Combined settings class"""

    @validator("DEBUG", pre=True)
    def set_debug_mode(cls, v: Any, values: Dict[str, Any]) -> bool:
        """Set debug mode based on environment"""
        if values.get("ENVIRONMENT") == Environment.DEVELOPMENT:
            return True
        return v if isinstance(v, bool) else False

    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_allowed_origins_settings(cls, v):
        """Parse ALLOWED_ORIGINS from JSON string or comma-separated if needed"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # Fallback: split by comma
                return [origin.strip() for origin in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """
    Get application settings instance
    
    Returns:
        Settings instance with loaded configuration
    """
    return settings


def get_environment() -> Environment:
    """
    Get current environment
    
    Returns:
        Current environment enum value
    """
    return settings.ENVIRONMENT


def is_development() -> bool:
    """
    Check if running in development environment
    
    Returns:
        True if in development environment, False otherwise
    """
    return settings.ENVIRONMENT == Environment.DEVELOPMENT


def is_staging() -> bool:
    """
    Check if running in staging environment
    
    Returns:
        True if in staging environment, False otherwise
    """
    return settings.ENVIRONMENT == Environment.STAGING


def is_production() -> bool:
    """
    Check if running in production environment
    
    Returns:
        True if in production environment, False otherwise
    """
    return settings.ENVIRONMENT == Environment.PRODUCTION


def is_testing() -> bool:
    """
    Check if running in testing environment
    
    Returns:
        True if in testing environment, False otherwise
    """
    return settings.ENVIRONMENT == Environment.TESTING


# Environment-specific overrides
if is_production():
    # Production-specific settings
    settings.LOG_LEVEL = "WARNING"
    settings.WORKERS = int(os.getenv("WORKERS", "4"))
elif is_staging():
    # Staging-specific settings
    settings.LOG_LEVEL = "INFO"
    settings.WORKERS = int(os.getenv("WORKERS", "2"))
else:
    # Development/testing settings
    settings.LOG_LEVEL = "DEBUG"
    settings.WORKERS = 1


# Validate critical settings
def validate_settings():
    """
    Validate critical configuration settings

    In production environment, this function enforces strict security requirements
    and raises ValueError for critical misconfigurations that could compromise security.

    In development/testing environments, issues are logged as warnings but do not
    prevent the application from starting.

    Raises:
        ValueError: If critical settings are invalid in production environment
    """
    critical_errors = []
    warnings = []

    is_prod = is_production()

    # Critical: Check for default JWT secret in production
    if settings.JWT_SECRET_KEY == "your-super-secret-jwt-key-change-in-production":
        if is_prod:
            critical_errors.append(
                "CRITICAL: Production environment is using the default JWT secret key. "
                "Set JWT_SECRET_KEY environment variable to a strong random value."
            )
        else:
            warnings.append("Using default JWT secret key (OK for development only)")

    # Critical: Check for missing or default SECRET_KEY
    if not settings.SECRET_KEY or settings.SECRET_KEY == "your-secret-key-here-change-in-production":
        if is_prod:
            critical_errors.append(
                "CRITICAL: SECRET_KEY is not set or using default value in production. "
                "Set SECRET_KEY environment variable to a strong random value."
            )
        else:
            warnings.append("SECRET_KEY is not set or using default value (OK for development only)")

    # Critical: Check JWT secret key length (should be at least 32 characters)
    if len(settings.JWT_SECRET_KEY) < 32:
        if is_prod:
            critical_errors.append(
                f"CRITICAL: JWT_SECRET_KEY is too short ({len(settings.JWT_SECRET_KEY)} characters). "
                "Use at least 32 characters for production."
            )
        else:
            warnings.append(f"JWT_SECRET_KEY is short ({len(settings.JWT_SECRET_KEY)} characters)")

    # Critical: Check for insecure CORS settings in production
    if "*" in settings.ALLOWED_ORIGINS and is_prod:
        critical_errors.append(
            "CRITICAL: Wildcard (*) in ALLOWED_ORIGINS is not permitted in production. "
            "Specify explicit allowed origins."
        )

    # Warning: Check for weak password policy
    if settings.PASSWORD_MIN_LENGTH < 8:
        warnings.append(
            f"Password minimum length ({settings.PASSWORD_MIN_LENGTH}) is less than recommended (8)"
        )

    # Warning: Check for DEBUG mode in production
    if settings.DEBUG and is_prod:
        warnings.append(
            "DEBUG mode is enabled in production environment (not recommended)"
        )

    # Print warnings if any
    if warnings:
        print("\n" + "=" * 70)
        print("Configuration Warnings:")
        print("=" * 70)
        for warning in warnings:
            print(f"  ⚠️  {warning}")
        print("=" * 70 + "\n")

    # Raise error for critical issues in production
    if critical_errors:
        error_message = "\n" + "=" * 70 + "\n"
        error_message += "FATAL: Critical Configuration Errors Detected\n"
        error_message += "=" * 70 + "\n"
        for error in critical_errors:
            error_message += f"  ❌ {error}\n"
        error_message += "=" * 70 + "\n"
        error_message += "Application cannot start with these configuration errors.\n"
        error_message += "Please fix the above issues and restart the application.\n"
        error_message += "=" * 70

        raise ValueError(error_message)

    return len(warnings) == 0


# Run validation on import
validate_settings()


if __name__ == "__main__":
    # Example usage
    print("Environment Configuration Management Initialized")
    print(f"Environment: {settings.ENVIRONMENT.value}")
    print(f"Debug Mode: {settings.DEBUG}")
    print(f"Database URL: {settings.DATABASE_URL}")
    print(f"JWT Algorithm: {settings.JWT_ALGORITHM}")
    print(f"Password Min Length: {settings.PASSWORD_MIN_LENGTH}")
    print(f"Allowed Origins: {settings.ALLOWED_ORIGINS}")
    print(f"Log Level: {settings.LOG_LEVEL}")
    
    # Validate settings
    is_valid = validate_settings()
    print(f"Configuration Validation: {'Passed' if is_valid else 'Failed with warnings'}")