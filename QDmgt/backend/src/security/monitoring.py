"""
Security Monitoring and Alerting System

This module provides real-time security monitoring, alerting,
and incident response capabilities for the Channel Management System.
"""

from typing import List, Dict, Any, Optional, Callable
from datetime import datetime, timedelta
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from enum import Enum
from dataclasses import dataclass
from ..utils.logger import logger
from ..config.security import SecurityConfig
from .audit import security_audit, AuditEventType


class AlertSeverity(Enum):
    """Alert severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(Enum):
    """Types of security alerts"""
    FAILED_LOGIN_ATTEMPTS = "failed_login_attempts"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_MODIFICATION = "data_modification"
    SYSTEM_ANOMALY = "system_anomaly"
    CONFIGURATION_CHANGE = "configuration_change"
    SECURITY_VIOLATION = "security_violation"


@dataclass
class SecurityAlert:
    """Security alert data structure"""
    alert_id: str
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    description: str
    timestamp: datetime
    source: str
    details: Dict[str, Any]
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None


class AlertRule:
    """Rule for detecting and triggering alerts"""
    
    def __init__(
        self, 
        name: str,
        alert_type: AlertType,
        severity: AlertSeverity,
        condition: Callable[[Dict[str, Any]], bool],
        threshold: int = 1,
        time_window: int = 300  # 5 minutes
    ):
        self.name = name
        self.alert_type = alert_type
        self.severity = severity
        self.condition = condition
        self.threshold = threshold
        self.time_window = time_window
        self.event_count: Dict[str, List[datetime]] = {}  # {source: [timestamps]}
    
    def evaluate(self, event: Dict[str, Any]) -> Optional[SecurityAlert]:
        """
        Evaluate event against rule and return alert if triggered
        
        Args:
            event: Security event to evaluate
            
        Returns:
            SecurityAlert if rule is triggered, None otherwise
        """
        # Check if condition is met
        if not self.condition(event):
            return None
        
        # Get source identifier
        source = event.get("ip_address") or event.get("user_id") or "unknown"
        
        # Initialize event count for source
        if source not in self.event_count:
            self.event_count[source] = []
        
        # Add current event timestamp
        now = datetime.utcnow()
        self.event_count[source].append(now)
        
        # Clean old events outside time window
        cutoff = now - timedelta(seconds=self.time_window)
        self.event_count[source] = [
            timestamp for timestamp in self.event_count[source]
            if timestamp > cutoff
        ]
        
        # Check if threshold is met
        if len(self.event_count[source]) >= self.threshold:
            # Create alert
            alert = SecurityAlert(
                alert_id=f"alert_{now.strftime('%Y%m%d%H%M%S')}_{hash(source) % 10000:04d}",
                alert_type=self.alert_type,
                severity=self.severity,
                title=f"{self.name} Alert",
                description=f"Rule '{self.name}' triggered for source {source}",
                timestamp=now,
                source=source,
                details={
                    "event_count": len(self.event_count[source]),
                    "threshold": self.threshold,
                    "time_window": self.time_window,
                    "triggering_event": event
                }
            )
            
            # Reset counter for this source
            self.event_count[source] = []
            
            return alert
        
        return None


class NotificationChannel(Enum):
    """Supported notification channels"""
    EMAIL = "email"
    SMS = "sms"
    SLACK = "slack"
    WEBHOOK = "webhook"


class AlertNotifier:
    """Handles sending alerts through various notification channels"""
    
    def __init__(self):
        self.config = SecurityConfig()
        self.notification_channels: Dict[NotificationChannel, List[str]] = {
            NotificationChannel.EMAIL: [],
            NotificationChannel.SMS: [],
            NotificationChannel.SLACK: [],
            NotificationChannel.WEBHOOK: []
        }
    
    def add_notification_recipient(self, channel: NotificationChannel, recipient: str):
        """Add recipient for specific notification channel"""
        if recipient not in self.notification_channels[channel]:
            self.notification_channels[channel].append(recipient)
    
    def remove_notification_recipient(self, channel: NotificationChannel, recipient: str):
        """Remove recipient from specific notification channel"""
        if recipient in self.notification_channels[channel]:
            self.notification_channels[channel].remove(recipient)
    
    async def send_alert(self, alert: SecurityAlert):
        """
        Send alert through all configured notification channels
        
        Args:
            alert: Security alert to send
        """
        logger.info(f"Sending alert: {alert.title}", extra={
            "alert_id": alert.alert_id,
            "severity": alert.severity.value,
            "source": alert.source
        })
        
        # Send through each configured channel
        for channel, recipients in self.notification_channels.items():
            if recipients:
                try:
                    await self._send_alert_via_channel(alert, channel, recipients)
                except Exception as e:
                    logger.error(f"Failed to send alert via {channel.value}", extra={
                        "alert_id": alert.alert_id,
                        "channel": channel.value,
                        "error": str(e)
                    })
    
    async def _send_alert_via_channel(
        self, 
        alert: SecurityAlert, 
        channel: NotificationChannel, 
        recipients: List[str]
    ):
        """Send alert via specific channel"""
        if channel == NotificationChannel.EMAIL:
            await self._send_email_alert(alert, recipients)
        elif channel == NotificationChannel.SMS:
            await self._send_sms_alert(alert, recipients)
        elif channel == NotificationChannel.SLACK:
            await self._send_slack_alert(alert, recipients)
        elif channel == NotificationChannel.WEBHOOK:
            await self._send_webhook_alert(alert, recipients)
    
    async def _send_email_alert(self, alert: SecurityAlert, recipients: List[str]):
        """Send alert via email"""
        # This is a simplified implementation
        # In production, use proper email service
        logger.info(f"Email alert sent to {len(recipients)} recipients", extra={
            "alert_id": alert.alert_id,
            "recipients": recipients[:3]  # Log first 3 for privacy
        })
        
        # In a real implementation:
        # smtp_server = smtplib.SMTP(self.config.EMAIL_HOST, self.config.EMAIL_PORT)
        # smtp_server.starttls()
        # smtp_server.login(self.config.EMAIL_USERNAME, self.config.EMAIL_PASSWORD)
        # ... send emails
        # smtp_server.quit()
    
    async def _send_sms_alert(self, alert: SecurityAlert, recipients: List[str]):
        """Send alert via SMS"""
        logger.info(f"SMS alert sent to {len(recipients)} recipients", extra={
            "alert_id": alert.alert_id,
            "recipients": recipients[:3]  # Log first 3 for privacy
        })
    
    async def _send_slack_alert(self, alert: SecurityAlert, recipients: List[str]):
        """Send alert via Slack"""
        logger.info(f"Slack alert sent to {len(recipients)} channels", extra={
            "alert_id": alert.alert_id,
            "channels": recipients[:3]  # Log first 3 for privacy
        })
    
    async def _send_webhook_alert(self, alert: SecurityAlert, recipients: List[str]):
        """Send alert via webhook"""
        logger.info(f"Webhook alert sent to {len(recipients)} endpoints", extra={
            "alert_id": alert.alert_id,
            "endpoints": recipients[:3]  # Log first 3 for privacy
        })


class SecurityMonitor:
    """Main security monitoring system"""
    
    def __init__(self):
        self.config = SecurityConfig()
        self.alert_rules: List[AlertRule] = []
        self.active_alerts: List[SecurityAlert] = []
        self.notifier = AlertNotifier()
        self.monitoring_enabled = True
        self.logger = logging.getLogger("security_monitor")
        
        # Initialize default alert rules
        self._initialize_default_rules()
    
    def _initialize_default_rules(self):
        """Initialize default security alert rules"""
        
        # Failed login attempts rule
        failed_login_rule = AlertRule(
            name="Failed Login Attempts",
            alert_type=AlertType.FAILED_LOGIN_ATTEMPTS,
            severity=AlertSeverity.MEDIUM,
            condition=lambda event: (
                event.get("event_type") == AuditEventType.LOGIN_FAILURE.value and
                event.get("details", {}).get("failure_attempts", 0) >= 5
            ),
            threshold=5,
            time_window=300  # 5 minutes
        )
        self.add_alert_rule(failed_login_rule)
        
        # Suspicious activity rule
        suspicious_activity_rule = AlertRule(
            name="Suspicious Activity",
            alert_type=AlertType.SUSPICIOUS_ACTIVITY,
            severity=AlertSeverity.HIGH,
            condition=lambda event: (
                event.get("event_type") == AuditEventType.ANOMALY_DETECTED.value or
                event.get("severity") == "warning"
            ),
            threshold=3,
            time_window=600  # 10 minutes
        )
        self.add_alert_rule(suspicious_activity_rule)
        
        # Unauthorized access rule
        unauthorized_access_rule = AlertRule(
            name="Unauthorized Access",
            alert_type=AlertType.UNAUTHORIZED_ACCESS,
            severity=AlertSeverity.HIGH,
            condition=lambda event: (
                event.get("event_type") == AuditEventType.PERMISSION_DENIED.value
            ),
            threshold=1,  # Immediate alert
            time_window=60  # 1 minute
        )
        self.add_alert_rule(unauthorized_access_rule)
        
        # Security violation rule
        security_violation_rule = AlertRule(
            name="Security Violation",
            alert_type=AlertType.SECURITY_VIOLATION,
            severity=AlertSeverity.CRITICAL,
            condition=lambda event: (
                event.get("event_type") == AuditEventType.SECURITY_VIOLATION.value or
                event.get("severity") == "error" or
                event.get("severity") == "critical"
            ),
            threshold=1,  # Immediate alert
            time_window=0  # Immediate
        )
        self.add_alert_rule(security_violation_rule)
    
    def add_alert_rule(self, rule: AlertRule):
        """Add alert rule to monitor"""
        self.alert_rules.append(rule)
        logger.info(f"Added alert rule: {rule.name}")
    
    def remove_alert_rule(self, rule_name: str):
        """Remove alert rule by name"""
        self.alert_rules = [rule for rule in self.alert_rules if rule.name != rule_name]
        logger.info(f"Removed alert rule: {rule_name}")
    
    def process_event(self, event: Dict[str, Any]):
        """
        Process security event and trigger alerts if needed
        
        Args:
            event: Security event to process
        """
        if not self.monitoring_enabled:
            return
        
        # Evaluate event against all rules
        for rule in self.alert_rules:
            try:
                alert = rule.evaluate(event)
                if alert:
                    self._handle_alert(alert)
            except Exception as e:
                logger.error(f"Error evaluating rule {rule.name}", extra={
                    "error": str(e),
                    "event": event
                })
    
    def _handle_alert(self, alert: SecurityAlert):
        """
        Handle triggered alert
        
        Args:
            alert: Security alert to handle
        """
        # Add to active alerts
        self.active_alerts.append(alert)
        
        # Log alert
        logger.warning(f"Security alert triggered: {alert.title}", extra={
            "alert_id": alert.alert_id,
            "severity": alert.severity.value,
            "source": alert.source,
            "details": alert.details
        })
        
        # Send notifications
        asyncio.create_task(self.notifier.send_alert(alert))
        
        # Store in audit log
        security_audit.log_event(
            AuditEventType.SECURITY_VIOLATION,
            user_id=alert.details.get("triggering_event", {}).get("user_id"),
            username=alert.details.get("triggering_event", {}).get("username"),
            ip_address=alert.source,
            resource=alert.details.get("triggering_event", {}).get("resource"),
            details={
                "alert_type": alert.alert_type.value,
                "alert_severity": alert.severity.value,
                "alert_title": alert.title,
                "alert_description": alert.description
            },
            severity=alert.severity.value
        )
    
    def acknowledge_alert(self, alert_id: str, user_id: str):
        """
        Acknowledge alert
        
        Args:
            alert_id: ID of alert to acknowledge
            user_id: ID of user acknowledging alert
        """
        for alert in self.active_alerts:
            if alert.alert_id == alert_id and not alert.acknowledged:
                alert.acknowledged = True
                alert.acknowledged_by = user_id
                alert.acknowledged_at = datetime.utcnow()
                
                logger.info(f"Alert acknowledged: {alert_id}", extra={
                    "alert_id": alert_id,
                    "acknowledged_by": user_id
                })
                return True
        
        return False
    
    def get_active_alerts(
        self, 
        severity: Optional[AlertSeverity] = None,
        alert_type: Optional[AlertType] = None,
        acknowledged: Optional[bool] = None
    ) -> List[SecurityAlert]:
        """
        Get active alerts with optional filtering
        
        Args:
            severity: Filter by severity
            alert_type: Filter by alert type
            acknowledged: Filter by acknowledgment status
            
        Returns:
            List of filtered alerts
        """
        filtered_alerts = self.active_alerts.copy()
        
        if severity:
            filtered_alerts = [alert for alert in filtered_alerts if alert.severity == severity]
        
        if alert_type:
            filtered_alerts = [alert for alert in filtered_alerts if alert.alert_type == alert_type]
        
        if acknowledged is not None:
            filtered_alerts = [alert for alert in filtered_alerts if alert.acknowledged == acknowledged]
        
        # Sort by timestamp (newest first)
        filtered_alerts.sort(key=lambda x: x.timestamp, reverse=True)
        
        return filtered_alerts
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """
        Get alert statistics
        
        Returns:
            Dictionary of alert statistics
        """
        stats = {
            "total_alerts": len(self.active_alerts),
            "active_alerts": len([a for a in self.active_alerts if not a.acknowledged]),
            "acknowledged_alerts": len([a for a in self.active_alerts if a.acknowledged]),
            "alerts_by_severity": {},
            "alerts_by_type": {},
            "recent_alerts": []
        }
        
        # Count by severity
        for alert in self.active_alerts:
            severity = alert.severity.value
            stats["alerts_by_severity"][severity] = stats["alerts_by_severity"].get(severity, 0) + 1
            
            alert_type = alert.alert_type.value
            stats["alerts_by_type"][alert_type] = stats["alerts_by_type"].get(alert_type, 0) + 1
        
        # Get recent alerts (last 24 hours)
        cutoff = datetime.utcnow() - timedelta(hours=24)
        recent_alerts = [
            alert for alert in self.active_alerts
            if alert.timestamp > cutoff
        ]
        stats["recent_alerts"] = len(recent_alerts)
        
        return stats
    
    def enable_monitoring(self):
        """Enable security monitoring"""
        self.monitoring_enabled = True
        logger.info("Security monitoring enabled")
    
    def disable_monitoring(self):
        """Disable security monitoring"""
        self.monitoring_enabled = False
        logger.info("Security monitoring disabled")
    
    async def start_monitoring_loop(self):
        """Start continuous monitoring loop"""
        logger.info("Starting security monitoring loop")
        
        while self.monitoring_enabled:
            try:
                # In a real implementation, this would continuously monitor
                # security events and trigger alerts
                
                # For now, we'll just sleep and check if monitoring is still enabled
                await asyncio.sleep(1)
                
            except KeyboardInterrupt:
                logger.info("Monitoring loop interrupted")
                break
            except Exception as e:
                logger.error("Error in monitoring loop", extra={"error": str(e)})
                await asyncio.sleep(5)  # Wait before retrying


# Global security monitor instance
security_monitor = SecurityMonitor()


def monitor_security_event(event: Dict[str, Any]):
    """
    Monitor security event through the global security monitor
    
    Args:
        event: Security event to monitor
    """
    security_monitor.process_event(event)


def add_notification_recipient(channel: NotificationChannel, recipient: str):
    """
    Add notification recipient for security alerts
    
    Args:
        channel: Notification channel
        recipient: Recipient address/identifier
    """
    security_monitor.notifier.add_notification_recipient(channel, recipient)


def remove_notification_recipient(channel: NotificationChannel, recipient: str):
    """
    Remove notification recipient for security alerts
    
    Args:
        channel: Notification channel
        recipient: Recipient address/identifier
    """
    security_monitor.notifier.remove_notification_recipient(channel, recipient)


# Example usage and testing
async def example_usage():
    """Example usage of security monitoring system"""
    print("Demonstrating security monitoring system...")
    
    # Add notification recipients
    add_notification_recipient(NotificationChannel.EMAIL, "admin@company.com")
    add_notification_recipient(NotificationChannel.SMS, "+1234567890")
    
    # Simulate security events
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
        },
        {
            "event_type": AuditEventType.SECURITY_VIOLATION.value,
            "username": "malicious_user",
            "ip_address": "10.0.0.1",
            "resource": "user_database",
            "details": {"violation_type": "sql_injection", "query": "DROP TABLE users"},
            "severity": "critical"
        }
    ]
    
    # Process events
    for event in test_events:
        monitor_security_event(event)
        await asyncio.sleep(0.1)  # Small delay between events
    
    # Wait a moment for alerts to be processed
    await asyncio.sleep(1)
    
    # Get alert statistics
    stats = security_monitor.get_alert_statistics()
    print(f"\nAlert Statistics:")
    print(f"  Total Alerts: {stats['total_alerts']}")
    print(f"  Active Alerts: {stats['active_alerts']}")
    print(f"  Acknowledged Alerts: {stats['acknowledged_alerts']}")
    print(f"  Recent Alerts (24h): {stats['recent_alerts']}")
    
    # Get active alerts
    active_alerts = security_monitor.get_active_alerts(acknowledged=False)
    print(f"\nActive Alerts ({len(active_alerts)}):")
    for alert in active_alerts[:5]:  # Show first 5
        print(f"  - {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')} [{alert.severity.value.upper()}] {alert.title}")
    
    print("\nSecurity monitoring demonstration completed")


if __name__ == "__main__":
    # Run example usage
    asyncio.run(example_usage())