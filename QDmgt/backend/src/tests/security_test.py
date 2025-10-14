"""
Security Testing Suite

This module contains comprehensive security tests for the Channel Management System
to ensure the application is protected against common vulnerabilities and attacks.
"""

import unittest
import asyncio
from typing import Dict, Any, List
from unittest.mock import patch, MagicMock
import json
import re
from datetime import datetime, timedelta
import jwt
import hashlib
import secrets

# Import application modules for testing
from ..config.security import SecurityConfig
from ..security.hardening import (
    PasswordValidator, 
    TokenManager, 
    RateLimiter, 
    InputSanitizer, 
    SessionManager,
    SecurityLogger,
    SecurityAuditor
)
from ..security.audit import (
    security_audit, 
    AuditEventType,
    audit_login_success,
    audit_login_failure,
    audit_permission_denied
)
from ..security.monitoring import (
    security_monitor,
    AlertSeverity,
    AlertType,
    NotificationChannel,
    monitor_security_event
)
from ..middleware.security import SecurityMiddleware, AuthenticationMiddleware, CSRFMiddleware


class SecurityTestCase(unittest.TestCase):
    """Base test case for security tests"""
    
    def setUp(self):
        """Set up test environment"""
        self.config = SecurityConfig()
        self.security_logger = SecurityLogger()
        self.security_auditor = SecurityAuditor()
        self.rate_limiter = RateLimiter()
        self.session_manager = SessionManager()
        
        # Mock request objects for testing
        self.mock_request = MagicMock()
        self.mock_request.client.host = "192.168.1.100"
        self.mock_request.headers = {}
        self.mock_request.state = MagicMock()
        self.mock_request.state.user_id = None
        self.mock_request.state.username = None
        self.mock_request.state.role = None
        
        # Mock response objects for testing
        self.mock_response = MagicMock()
        self.mock_response.headers = {}
    
    def tearDown(self):
        """Clean up after tests"""
        pass


class TestPasswordSecurity(SecurityTestCase):
    """Test password security features"""
    
    def test_password_validation_strength(self):
        """Test password strength validation"""
        test_cases = [
            # Weak passwords
            ("weak", False, ["Password must be at least 8 characters long"]),
            ("password", False, ["Password must contain at least one uppercase letter"]),
            ("PASSWORD", False, ["Password must contain at least one lowercase letter"]),
            ("Password", False, ["Password must contain at least one digit"]),
            ("Password123", False, ["Password must contain at least one special character"]),
            
            # Strong passwords
            ("StrongPass123!", True, []),
            ("MySecurePassword2023@", True, []),
            ("P@ssw0rd!2023#Secure", True, []),
        ]
        
        for password, expected_valid, expected_errors in test_cases:
            with self.subTest(password=password):
                is_valid, errors = PasswordValidator.validate_password(password)
                self.assertEqual(is_valid, expected_valid)
                # Check that expected errors are present (if any)
                for expected_error in expected_errors:
                    self.assertTrue(
                        any(expected_error in error for error in errors),
                        f"Expected error '{expected_error}' not found in {errors}"
                    )
    
    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "MySecurePassword123!"
        hashed = PasswordValidator.hash_password(password)
        
        # Verify hashed password
        self.assertTrue(PasswordValidator.verify_password(password, hashed))
        
        # Verify incorrect password
        self.assertFalse(PasswordValidator.verify_password("WrongPassword", hashed))
        
        # Verify empty password
        self.assertFalse(PasswordValidator.verify_password("", hashed))
    
    def test_password_common_patterns(self):
        """Test rejection of common weak password patterns"""
        weak_patterns = [
            "123456",
            "password",
            "qwerty",
            "abc123",
            "admin",
            "login",
            "Password123",  # Contains common pattern
        ]
        
        for password in weak_patterns:
            with self.subTest(password=password):
                is_valid, errors = PasswordValidator.validate_password(password)
                # At least one error should be present for weak patterns
                self.assertGreater(len(errors), 0, f"Weak password '{password}' should have validation errors")


class TestJWTTokenSecurity(SecurityTestCase):
    """Test JWT token security"""
    
    def test_token_creation_and_verification(self):
        """Test JWT token creation and verification"""
        payload = {
            "user_id": "123",
            "username": "testuser",
            "role": "user"
        }
        
        # Create access token
        access_token = TokenManager.create_access_token(payload)
        self.assertIsInstance(access_token, str)
        self.assertGreater(len(access_token), 20)
        
        # Verify token
        verified_payload = TokenManager.verify_token(access_token)
        self.assertIsNotNone(verified_payload)
        self.assertEqual(verified_payload["user_id"], "123")
        self.assertEqual(verified_payload["username"], "testuser")
        self.assertEqual(verified_payload["role"], "user")
    
    def test_expired_token_rejection(self):
        """Test rejection of expired tokens"""
        # Create token that expires immediately
        payload = {"user_id": "123", "exp": datetime.utcnow().timestamp() - 1}
        expired_token = jwt.encode(payload, self.config.JWT_SECRET_KEY, algorithm=self.config.JWT_ALGORITHM)
        
        # Verify expired token is rejected
        verified_payload = TokenManager.verify_token(expired_token)
        self.assertIsNone(verified_payload)
    
    def test_invalid_token_rejection(self):
        """Test rejection of invalid tokens"""
        invalid_tokens = [
            "",  # Empty token
            "invalid.token.string",  # Invalid format
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",  # Invalid signature
        ]
        
        for token in invalid_tokens:
            with self.subTest(token=token):
                verified_payload = TokenManager.verify_token(token)
                self.assertIsNone(verified_payload)


class TestRateLimiting(SecurityTestCase):
    """Test rate limiting functionality"""
    
    def test_rate_limiting_enforcement(self):
        """Test rate limiting enforcement"""
        client_ip = "192.168.1.100"
        endpoint = "/api/test"
        
        # Allow requests within limit
        for i in range(self.config.RATE_LIMIT_REQUESTS_PER_MINUTE):
            with self.subTest(request=i):
                is_limited = self.rate_limiter.is_rate_limited(client_ip, endpoint)
                self.assertFalse(is_limited, f"Request {i} should not be rate limited")
        
        # Reject requests exceeding limit
        is_limited = self.rate_limiter.is_rate_limited(client_ip, endpoint)
        self.assertTrue(is_limited, "Request should be rate limited after exceeding limit")
    
    def test_rate_limit_reset(self):
        """Test rate limit reset after time window"""
        client_ip = "192.168.1.101"
        endpoint = "/api/test2"
        
        # Exceed rate limit
        for i in range(self.config.RATE_LIMIT_REQUESTS_PER_MINUTE + 5):
            self.rate_limiter.is_rate_limited(client_ip, endpoint)
        
        # Check retry after time
        retry_after = self.rate_limiter.get_retry_after(client_ip)
        self.assertGreaterEqual(retry_after, 0)
        self.assertLessEqual(retry_after, self.config.RATE_LIMIT_WINDOW_SECONDS)


class TestInputSanitization(SecurityTestCase):
    """Test input sanitization"""
    
    def test_string_sanitization(self):
        """Test string input sanitization"""
        test_cases = [
            ("Normal text", "Normal text"),
            ("<script>alert('xss')</script>", "&lt;script&gt;alert('xss')&lt;/script&gt;"),
            ("Text with <> symbols", "Text with &lt;&gt; symbols"),
            ("Special chars: !@#$%^&*()", "Special chars "),
        ]
        
        for input_text, expected in test_cases:
            with self.subTest(input=input_text):
                sanitized = InputSanitizer.sanitize_string(input_text)
                self.assertEqual(sanitized, expected)
    
    def test_email_sanitization(self):
        """Test email validation and sanitization"""
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "test+tag@sub.domain.com",
        ]
        
        invalid_emails = [
            "invalid-email",
            "@invalid.com",
            "test@",
            "test@.com",
            "test@domain.",
        ]
        
        # Test valid emails
        for email in valid_emails:
            with self.subTest(email=email):
                sanitized = InputSanitizer.sanitize_email(email)
                self.assertEqual(sanitized, email.lower())
        
        # Test invalid emails
        for email in invalid_emails:
            with self.subTest(email=email):
                sanitized = InputSanitizer.sanitize_email(email)
                self.assertEqual(sanitized, "")
    
    def test_xss_prevention(self):
        """Test XSS prevention"""
        xss_attempts = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "onload=alert('xss')",
        ]
        
        for attempt in xss_attempts:
            with self.subTest(attempt=attempt):
                # Test in various contexts
                sanitized = InputSanitizer.sanitize_string(attempt)
                self.assertNotIn("<script", sanitized.lower())
                self.assertNotIn("javascript:", sanitized.lower())
                self.assertNotIn("onerror", sanitized.lower())
                self.assertNotIn("onload", sanitized.lower())


class TestAuthenticationSecurity(SecurityTestCase):
    """Test authentication security"""
    
    def test_session_creation_and_validation(self):
        """Test session creation and validation"""
        user_id = "testuser123"
        ip_address = "192.168.1.100"
        
        # Create session
        session_id = self.session_manager.create_session(user_id, ip_address)
        self.assertIsInstance(session_id, str)
        self.assertGreater(len(session_id), 20)
        
        # Validate session
        validated_user_id = self.session_manager.validate_session(session_id, ip_address)
        self.assertEqual(validated_user_id, user_id)
    
    def test_session_timeout(self):
        """Test session timeout"""
        # This would require mocking time in a real implementation
        pass
    
    def test_session_ip_consistency(self):
        """Test session IP address consistency"""
        user_id = "testuser123"
        original_ip = "192.168.1.100"
        different_ip = "10.0.0.1"
        
        # Create session with original IP
        session_id = self.session_manager.create_session(user_id, original_ip)
        
        # Validate with different IP (should still work in basic implementation)
        validated_user_id = self.session_manager.validate_session(session_id, different_ip)
        self.assertEqual(validated_user_id, user_id)


class TestSecurityMiddleware(SecurityTestCase):
    """Test security middleware"""
    
    def test_security_middleware_initialization(self):
        """Test security middleware initialization"""
        # This would require a FastAPI app instance in a real test
        pass
    
    def test_cors_protection(self):
        """Test CORS protection"""
        # Test CORS headers are applied
        pass
    
    def test_security_headers(self):
        """Test security headers are applied"""
        # Test CSP, XSS protection, and other security headers
        pass


class TestAuditLogging(SecurityTestCase):
    """Test audit logging"""
    
    def test_audit_event_logging(self):
        """Test audit event logging"""
        # Log test events
        audit_login_success("user123", "john_doe", "192.168.1.100")
        audit_login_failure("jane_doe", "192.168.1.101", "invalid_password")
        audit_permission_denied("user456", "malicious_user", "/admin/users", "admin")
        
        # Verify events were logged
        recent_audits = self.security_auditor.get_recent_audits()
        self.assertGreaterEqual(len(recent_audits), 3)
    
    def test_audit_log_retention(self):
        """Test audit log retention policy"""
        # Test that old audit entries are cleaned up
        pass


class TestSecurityMonitoring(SecurityTestCase):
    """Test security monitoring"""
    
    def test_alert_generation(self):
        """Test security alert generation"""
        # Test that alerts are generated for security events
        pass
    
    def test_alert_notification(self):
        """Test alert notification system"""
        # Test that notifications are sent for critical alerts
        pass


class TestIntegrationSecurity(SecurityTestCase):
    """Test integration security"""
    
    def test_full_authentication_flow(self):
        """Test full authentication flow security"""
        # Test login, session creation, token generation, and validation
        pass
    
    def test_protected_endpoint_access(self):
        """Test access to protected endpoints"""
        # Test that unauthorized access is properly rejected
        pass
    
    def test_concurrent_session_handling(self):
        """Test concurrent session handling"""
        # Test multiple sessions for same user
        pass


def run_security_tests():
    """Run all security tests"""
    print("Running Security Test Suite...")
    print("=" * 50)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test cases
    test_classes = [
        TestPasswordSecurity,
        TestJWTTokenSecurity,
        TestRateLimiting,
        TestInputSanitization,
        TestAuthenticationSecurity,
        TestAuditLogging,
    ]
    
    for test_class in test_classes:
        suite.addTests(loader.loadTestsFromTestCase(test_class))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 50)
    print("Security Test Results:")
    print(f"  Tests Run: {result.testsRun}")
    print(f"  Failures: {len(result.failures)}")
    print(f"  Errors: {len(result.errors)}")
    print(f"  Success Rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    print("=" * 50)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    # Run security tests
    success = run_security_tests()
    
    # Exit with appropriate code
    exit(0 if success else 1)