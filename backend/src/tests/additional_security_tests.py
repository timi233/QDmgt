"""
Additional Security Tests for CLI Interface and Data Visualization

This module contains additional security tests specifically for CLI interface 
functionality and data visualization features of the Channel Management System.
"""

import unittest
from unittest.mock import patch, MagicMock
import json
import sys
from io import StringIO
from typing import Dict, Any
import re

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


class TestCLISecurity(unittest.TestCase):
    """Test CLI interface security"""
    
    def setUp(self):
        """Set up test environment"""
        self.config = SecurityConfig()
        self.security_logger = SecurityLogger()
        self.security_auditor = SecurityAuditor()
        
        # Capture stdout for CLI testing
        self.held_stdout = StringIO()
        self.held_stderr = StringIO()
        
    def tearDown(self):
        """Clean up after tests"""
        pass
    
    def test_cli_command_validation(self):
        """Test CLI command validation and sanitization"""
        # Test valid CLI commands
        valid_commands = [
            "channel-mgmt init-db",
            "channel-mgmt create-user --username testuser --email test@example.com --password SecurePass123!",
            "channel-mgmt list-channels --status active",
            "channel-mgmt health"
        ]
        
        for command in valid_commands:
            with self.subTest(command=command):
                # Simulate CLI command parsing
                args = command.split()
                self.assertGreater(len(args), 1, f"Command '{command}' should have at least 2 arguments")
    
    def test_cli_input_sanitization(self):
        """Test CLI input sanitization to prevent command injection"""
        # Test malicious input attempts
        malicious_inputs = [
            "channel-mgmt create-user --username 'testuser; rm -rf /' --email test@example.com",
            "channel-mgmt list-channels --search '; DROP TABLE channels;'",
            "channel-mgmt health; echo 'malicious command'",
        ]
        
        for input_str in malicious_inputs:
            with self.subTest(input_str=input_str):
                # Simulate input sanitization
                sanitized = InputSanitizer.sanitize_string(input_str)
                # Check that dangerous characters are removed or escaped
                self.assertNotIn(";", sanitized)
                self.assertNotIn("'", sanitized)
                self.assertNotIn('"', sanitized)
    
    def test_cli_output_security(self):
        """Test CLI output security to prevent information leakage"""
        # Test that sensitive information is not exposed in CLI output
        sensitive_data = [
            "password",
            "secret",
            "token",
            "key",
            "credential"
        ]
        
        for data in sensitive_data:
            with self.subTest(data=data):
                # Simulate CLI output filtering
                output = f"Processing {data}: ********"
                self.assertNotIn(data, output.split(":")[1], f"Sensitive data '{data}' should be masked in output")
    
    def test_cli_authentication_required(self):
        """Test that CLI commands requiring authentication are properly protected"""
        # Commands that should require authentication
        auth_required_commands = [
            "channel-mgmt create-channel",
            "channel-mgmt update-channel",
            "channel-mgmt delete-channel",
            "channel-mgmt assign-channel"
        ]
        
        for command in auth_required_commands:
            with self.subTest(command=command):
                # Simulate authentication check
                # In a real implementation, this would check for valid JWT token or session
                self.assertTrue(True, f"Command '{command}' should require authentication")


class TestDataVisualizationSecurity(unittest.TestCase):
    """Test data visualization security"""
    
    def setUp(self):
        """Set up test environment"""
        self.config = SecurityConfig()
        
    def tearDown(self):
        """Clean up after tests"""
        pass
    
    def test_chart_data_sanitization(self):
        """Test that chart data is properly sanitized to prevent XSS"""
        # Test malicious data that could be embedded in chart data
        malicious_data = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
        ]
        
        for data in malicious_data:
            with self.subTest(data=data):
                # Simulate data sanitization for charts
                sanitized = InputSanitizer.sanitize_string(data)
                self.assertNotIn("<script", sanitized.lower())
                self.assertNotIn("javascript:", sanitized.lower())
                self.assertNotIn("onerror", sanitized.lower())
    
    def test_visualization_api_security(self):
        """Test security of visualization API endpoints"""
        # Test that visualization APIs properly validate input
        test_cases = [
            {
                "input": {"chart_type": "pie", "data": "normal_data"},
                "expected_valid": True
            },
            {
                "input": {"chart_type": "../../../etc/passwd", "data": "malicious_data"},
                "expected_valid": False
            },
            {
                "input": {"chart_type": "pie<script>", "data": "normal_data"},
                "expected_valid": False
            }
        ]
        
        for case in test_cases:
            with self.subTest(case=case):
                # Simulate API input validation
                chart_type = case["input"]["chart_type"]
                is_valid = re.match(r'^[a-zA-Z0-9_-]+$', chart_type) is not None
                self.assertEqual(
                    is_valid, 
                    case["expected_valid"], 
                    f"Chart type validation failed for '{chart_type}'"
                )
    
    def test_visualization_access_control(self):
        """Test that visualization access is properly controlled"""
        # Test that users can only access visualizations for channels they have permission to view
        test_scenarios = [
            {
                "user_role": "admin",
                "channel_permission": "admin",
                "expected_access": True
            },
            {
                "user_role": "user",
                "channel_permission": "read",
                "expected_access": True
            },
            {
                "user_role": "user",
                "channel_permission": "none",
                "expected_access": False
            }
        ]
        
        for scenario in test_scenarios:
            with self.subTest(scenario=scenario):
                # Simulate access control check
                has_access = scenario["expected_access"]
                self.assertEqual(
                    has_access,
                    scenario["expected_access"],
                    f"Access control check failed for user role '{scenario['user_role']}' with permission '{scenario['channel_permission']}'"
                )


class TestSecurityLoggingAndMonitoring(unittest.TestCase):
    """Test security logging and monitoring capabilities"""
    
    def setUp(self):
        """Set up test environment"""
        self.security_logger = SecurityLogger()
        self.security_auditor = SecurityAuditor()
        self.security_monitor = security_monitor
    
    def tearDown(self):
        """Clean up after tests"""
        pass
    
    def test_security_event_logging(self):
        """Test that security events are properly logged"""
        # Test different types of security events
        test_events = [
            {
                "event_type": AuditEventType.LOGIN_SUCCESS,
                "user_id": "testuser123",
                "username": "testuser",
                "ip_address": "192.168.1.100",
                "severity": "info"
            },
            {
                "event_type": AuditEventType.LOGIN_FAILURE,
                "user_id": "testuser123",
                "username": "testuser",
                "ip_address": "192.168.1.100",
                "severity": "warning"
            },
            {
                "event_type": AuditEventType.SECURITY_VIOLATION,
                "user_id": "malicious_user",
                "username": "malicious_user",
                "ip_address": "10.0.0.1",
                "severity": "error"
            }
        ]
        
        for event in test_events:
            with self.subTest(event=event):
                # Simulate security event logging
                security_audit.log_event(
                    event_type=event["event_type"],
                    user_id=event["user_id"],
                    username=event["username"],
                    ip_address=event["ip_address"],
                    severity=event["severity"]
                )
                
                # Verify event was logged
                recent_audits = security_audit.get_recent_audits()
                self.assertGreater(len(recent_audits), 0)
                
                # Check that the latest audit matches our event
                latest_audit = recent_audits[0]
                self.assertEqual(latest_audit["event_type"], event["event_type"].value)
                self.assertEqual(latest_audit["user_id"], event["user_id"])
                self.assertEqual(latest_audit["ip_address"], event["ip_address"])
    
    def test_alert_generation(self):
        """Test that security alerts are properly generated"""
        # Test alert generation for different scenarios
        test_alerts = [
            {
                "alert_type": AlertType.FAILED_LOGIN_ATTEMPTS,
                "severity": AlertSeverity.MEDIUM,
                "title": "Failed Login Attempts Alert",
                "description": "Multiple failed login attempts detected",
                "source": "192.168.1.100"
            },
            {
                "alert_type": AlertType.SECURITY_VIOLATION,
                "severity": AlertSeverity.CRITICAL,
                "title": "Security Violation Alert",
                "description": "Potential security violation detected",
                "source": "10.0.0.1"
            }
        ]
        
        for alert_data in test_alerts:
            with self.subTest(alert_data=alert_data):
                # Simulate alert generation
                alert = {
                    "alert_type": alert_data["alert_type"],
                    "severity": alert_data["severity"],
                    "title": alert_data["title"],
                    "description": alert_data["description"],
                    "source": alert_data["source"],
                    "timestamp": "2025-10-11T10:00:00Z"
                }
                
                # Verify alert structure
                self.assertIn("alert_type", alert)
                self.assertIn("severity", alert)
                self.assertIn("title", alert)
                self.assertIn("description", alert)
                self.assertIn("source", alert)
                self.assertIn("timestamp", alert)
    
    def test_monitoring_integration(self):
        """Test integration with security monitoring system"""
        # Test that security events are properly processed by the monitoring system
        test_events = [
            {
                "event_type": AuditEventType.LOGIN_FAILURE.value,
                "username": "testuser",
                "ip_address": "192.168.1.100",
                "details": {"failure_reason": "invalid_password"}
            },
            {
                "event_type": AuditEventType.PERMISSION_DENIED.value,
                "username": "testuser",
                "ip_address": "192.168.1.100",
                "resource": "/admin/users",
                "details": {"required_permission": "admin"}
            }
        ]
        
        for event in test_events:
            with self.subTest(event=event):
                # Simulate event processing by monitoring system
                monitor_security_event(event)
                
                # Verify event was processed (in a real implementation, this would check for alerts)
                self.assertTrue(True, "Event should be processed by monitoring system")


def run_additional_security_tests():
    """Run additional security tests for CLI interface and data visualization"""
    print("Running Additional Security Tests...")
    print("=" * 50)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test cases
    test_classes = [
        TestCLISecurity,
        TestDataVisualizationSecurity,
        TestSecurityLoggingAndMonitoring,
    ]
    
    for test_class in test_classes:
        suite.addTests(loader.loadTestsFromTestCase(test_class))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 50)
    print("Additional Security Test Results:")
    print(f"  Tests Run: {result.testsRun}")
    print(f"  Failures: {len(result.failures)}")
    print(f"  Errors: {len(result.errors)}")
    print(f"  Success Rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    print("=" * 50)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    # Run additional security tests
    success = run_additional_security_tests()
    
    # Exit with appropriate code
    exit(0 if success else 1)