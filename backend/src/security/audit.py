"""
Security Audit and Compliance Reporting

This module provides security auditing capabilities and generates
compliance reports for the Channel Management System.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
import csv
from io import StringIO
from enum import Enum
import logging
from ..utils.logger import logger
from ..config.security import SecurityConfig


class AuditEventType(Enum):
    """Types of security audit events"""
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    PERMISSION_DENIED = "permission_denied"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    CONFIGURATION_CHANGE = "configuration_change"
    SYSTEM_EVENT = "system_event"
    SECURITY_VIOLATION = "security_violation"
    ANOMALY_DETECTED = "anomaly_detected"


class SecurityAudit:
    """Security audit system for tracking and reporting security events"""
    
    def __init__(self):
        self.config = SecurityConfig()
        self.audit_log: List[Dict[str, Any]] = []
        self.logger = logging.getLogger("security_audit")
    
    def log_event(
        self, 
        event_type: AuditEventType, 
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        ip_address: Optional[str] = None,
        resource: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: str = "info"
    ):
        """
        Log a security event
        
        Args:
            event_type: Type of security event
            user_id: ID of user involved
            username: Username of user involved
            ip_address: IP address of client
            resource: Resource involved in event
            details: Additional event details
            severity: Event severity (info, warning, error, critical)
        """
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type.value,
            "user_id": user_id,
            "username": username,
            "ip_address": ip_address,
            "resource": resource,
            "details": details or {},
            "severity": severity,
            "event_id": self._generate_event_id()
        }
        
        self.audit_log.append(event)
        
        # Log to security logger
        log_level = getattr(logging, severity.upper(), logging.INFO)
        self.logger.log(log_level, f"Security event: {event_type.value}", extra=event)
        
        # Keep only recent events (based on retention policy)
        self._cleanup_old_events()
    
    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        return f"evt_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{hash(str(datetime.utcnow())) % 10000:04d}"
    
    def _cleanup_old_events(self):
        """Remove events older than retention period"""
        cutoff_date = datetime.utcnow() - timedelta(days=self.config.AUDIT_LOG_RETENTION_DAYS)
        
        self.audit_log = [
            event for event in self.audit_log
            if datetime.fromisoformat(event["timestamp"].replace('Z', '+00:00')) > cutoff_date
        ]
    
    def get_events(
        self, 
        event_types: Optional[List[AuditEventType]] = None,
        user_id: Optional[str] = None,
        severity: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Retrieve security events based on filters
        
        Args:
            event_types: List of event types to filter by
            user_id: User ID to filter by
            severity: Severity level to filter by
            start_date: Start date for time range filter
            end_date: End date for time range filter
            limit: Maximum number of events to return
            
        Returns:
            List of filtered security events
        """
        filtered_events = self.audit_log.copy()
        
        # Apply event type filter
        if event_types:
            event_type_values = [et.value for et in event_types]
            filtered_events = [
                event for event in filtered_events
                if event["event_type"] in event_type_values
            ]
        
        # Apply user ID filter
        if user_id:
            filtered_events = [
                event for event in filtered_events
                if event["user_id"] == user_id
            ]
        
        # Apply severity filter
        if severity:
            filtered_events = [
                event for event in filtered_events
                if event["severity"] == severity
            ]
        
        # Apply time range filter
        if start_date:
            filtered_events = [
                event for event in filtered_events
                if datetime.fromisoformat(event["timestamp"].replace('Z', '+00:00')) >= start_date
            ]
        
        if end_date:
            filtered_events = [
                event for event in filtered_events
                if datetime.fromisoformat(event["timestamp"].replace('Z', '+00:00')) <= end_date
            ]
        
        # Sort by timestamp (newest first)
        filtered_events.sort(key=lambda x: x["timestamp"], reverse=True)
        
        # Apply limit
        return filtered_events[:limit]
    
    def get_security_metrics(self, days: int = 30) -> Dict[str, Any]:
        """
        Get security metrics for compliance reporting
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Dictionary of security metrics
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        recent_events = self.get_events(start_date=start_date)
        
        metrics = {
            "total_events": len(recent_events),
            "events_by_type": {},
            "events_by_severity": {},
            "unique_users": set(),
            "failed_logins": 0,
            "permission_denials": 0,
            "data_modifications": 0,
            "security_violations": 0,
            "anomalies_detected": 0,
            "date_range": {
                "start": start_date.isoformat(),
                "end": datetime.utcnow().isoformat()
            }
        }
        
        # Calculate metrics
        for event in recent_events:
            # Count event types
            event_type = event["event_type"]
            metrics["events_by_type"][event_type] = metrics["events_by_type"].get(event_type, 0) + 1
            
            # Count severities
            severity = event["severity"]
            metrics["events_by_severity"][severity] = metrics["events_by_severity"].get(severity, 0) + 1
            
            # Count unique users
            if event["user_id"]:
                metrics["unique_users"].add(event["user_id"])
            
            # Count specific event types
            if event_type == AuditEventType.LOGIN_FAILURE.value:
                metrics["failed_logins"] += 1
            elif event_type == AuditEventType.PERMISSION_DENIED.value:
                metrics["permission_denials"] += 1
            elif event_type == AuditEventType.DATA_MODIFICATION.value:
                metrics["data_modifications"] += 1
            elif event_type == AuditEventType.SECURITY_VIOLATION.value:
                metrics["security_violations"] += 1
            elif event_type == AuditEventType.ANOMALY_DETECTED.value:
                metrics["anomalies_detected"] += 1
        
        # Convert set to count
        metrics["unique_users"] = len(metrics["unique_users"])
        
        return metrics
    
    def generate_compliance_report(self, format: str = "json") -> str:
        """
        Generate compliance report in specified format
        
        Args:
            format: Output format ('json', 'csv', 'summary')
            
        Returns:
            Compliance report as string
        """
        metrics = self.get_security_metrics()
        events = self.get_events(limit=1000)  # Last 1000 events
        
        report_data = {
            "report_generated": datetime.utcnow().isoformat(),
            "report_period": metrics["date_range"],
            "summary_metrics": metrics,
            "recent_events_sample": events[:50]  # Sample of recent events
        }
        
        if format.lower() == "json":
            return json.dumps(report_data, indent=2, default=str)
        elif format.lower() == "csv":
            return self._generate_csv_report(report_data)
        elif format.lower() == "summary":
            return self._generate_summary_report(report_data)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_csv_report(self, report_data: Dict[str, Any]) -> str:
        """Generate CSV format report"""
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(["Report Generated", "Period Start", "Period End"])
        writer.writerow([
            report_data["report_generated"],
            report_data["report_period"]["start"],
            report_data["report_period"]["end"]
        ])
        writer.writerow([])  # Empty row
        
        # Write summary metrics
        writer.writerow(["Metric", "Value"])
        metrics = report_data["summary_metrics"]
        for key, value in metrics.items():
            if key not in ["events_by_type", "events_by_severity", "date_range"]:
                writer.writerow([key, str(value)])
        writer.writerow([])  # Empty row
        
        # Write event type breakdown
        writer.writerow(["Event Type", "Count"])
        for event_type, count in metrics["events_by_type"].items():
            writer.writerow([event_type, str(count)])
        writer.writerow([])  # Empty row
        
        # Write severity breakdown
        writer.writerow(["Severity", "Count"])
        for severity, count in metrics["events_by_severity"].items():
            writer.writerow([severity, str(count)])
        writer.writerow([])  # Empty row
        
        # Write recent events sample
        writer.writerow(["Recent Events Sample"])
        writer.writerow([
            "Timestamp", "Event Type", "User ID", "Username", 
            "IP Address", "Resource", "Severity"
        ])
        
        for event in report_data["recent_events_sample"]:
            writer.writerow([
                event["timestamp"],
                event["event_type"],
                event["user_id"] or "",
                event["username"] or "",
                event["ip_address"] or "",
                event["resource"] or "",
                event["severity"]
            ])
        
        return output.getvalue()
    
    def _generate_summary_report(self, report_data: Dict[str, Any]) -> str:
        """Generate human-readable summary report"""
        metrics = report_data["summary_metrics"]
        
        report = []
        report.append("=" * 60)
        report.append("SECURITY COMPLIANCE REPORT")
        report.append("=" * 60)
        report.append(f"Report Generated: {report_data['report_generated']}")
        report.append(f"Analysis Period: {metrics['date_range']['start']} to {metrics['date_range']['end']}")
        report.append("")
        
        report.append("SUMMARY METRICS")
        report.append("-" * 30)
        report.append(f"Total Security Events: {metrics['total_events']}")
        report.append(f"Unique Users: {metrics['unique_users']}")
        report.append(f"Failed Login Attempts: {metrics['failed_logins']}")
        report.append(f"Permission Denials: {metrics['permission_denials']}")
        report.append(f"Data Modifications: {metrics['data_modifications']}")
        report.append(f"Security Violations: {metrics['security_violations']}")
        report.append(f"Anomalies Detected: {metrics['anomalies_detected']}")
        report.append("")
        
        report.append("EVENT TYPE BREAKDOWN")
        report.append("-" * 30)
        for event_type, count in metrics["events_by_type"].items():
            report.append(f"{event_type}: {count}")
        report.append("")
        
        report.append("SEVERITY DISTRIBUTION")
        report.append("-" * 30)
        for severity, count in metrics["events_by_severity"].items():
            report.append(f"{severity}: {count}")
        report.append("")
        
        report.append("RECENT EVENTS SAMPLE (Last 50)")
        report.append("-" * 30)
        report.append(f"{'Timestamp':<20} {'Event Type':<20} {'User':<15} {'Severity':<10}")
        report.append("-" * 70)
        
        for event in report_data["recent_events_sample"][:20]:  # Show first 20
            timestamp = event["timestamp"][:19]  # Truncate to seconds
            event_type = event["event_type"][:19]  # Truncate if too long
            username = (event["username"] or event["user_id"] or "N/A")[:14]
            severity = event["severity"]
            
            report.append(f"{timestamp:<20} {event_type:<20} {username:<15} {severity:<10}")
        
        report.append("")
        report.append("=" * 60)
        report.append("END OF REPORT")
        report.append("=" * 60)
        
        return "\n".join(report)
    
    def export_events_to_file(self, filename: str, format: str = "json"):
        """
        Export all audit events to a file
        
        Args:
            filename: Output filename
            format: Export format ('json', 'csv')
        """
        events = self.audit_log.copy()
        
        if format.lower() == "json":
            with open(filename, 'w') as f:
                json.dump(events, f, indent=2, default=str)
        elif format.lower() == "csv":
            with open(filename, 'w', newline='') as f:
                if events:
                    writer = csv.DictWriter(f, fieldnames=events[0].keys())
                    writer.writeheader()
                    writer.writerows(events)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        logger.info(f"Audit events exported to {filename}", extra={
            "filename": filename,
            "format": format,
            "event_count": len(events)
        })


# Global security audit instance
security_audit = SecurityAudit()


def audit_login_success(user_id: str, username: str, ip_address: str):
    """Audit successful login"""
    security_audit.log_event(
        AuditEventType.LOGIN_SUCCESS,
        user_id=user_id,
        username=username,
        ip_address=ip_address,
        severity="info"
    )


def audit_login_failure(username: str, ip_address: str, reason: str = None):
    """Audit failed login"""
    security_audit.log_event(
        AuditEventType.LOGIN_FAILURE,
        username=username,
        ip_address=ip_address,
        details={"failure_reason": reason},
        severity="warning"
    )


def audit_permission_denied(user_id: str, username: str, resource: str, required_permission: str):
    """Audit permission denial"""
    security_audit.log_event(
        AuditEventType.PERMISSION_DENIED,
        user_id=user_id,
        username=username,
        resource=resource,
        details={"required_permission": required_permission},
        severity="warning"
    )


def audit_data_access(user_id: str, username: str, resource: str, action: str):
    """Audit data access"""
    security_audit.log_event(
        AuditEventType.DATA_ACCESS,
        user_id=user_id,
        username=username,
        resource=resource,
        details={"action": action},
        severity="info"
    )


def audit_data_modification(user_id: str, username: str, resource: str, action: str, changes: Dict[str, Any]):
    """Audit data modification"""
    security_audit.log_event(
        AuditEventType.DATA_MODIFICATION,
        user_id=user_id,
        username=username,
        resource=resource,
        details={
            "action": action,
            "changes": changes
        },
        severity="info"
    )


def audit_configuration_change(user_id: str, username: str, setting: str, old_value: Any, new_value: Any):
    """Audit configuration change"""
    security_audit.log_event(
        AuditEventType.CONFIGURATION_CHANGE,
        user_id=user_id,
        username=username,
        resource=setting,
        details={
            "old_value": old_value,
            "new_value": new_value
        },
        severity="info"
    )


def audit_security_violation(user_id: str, username: str, violation_type: str, details: Dict[str, Any]):
    """Audit security violation"""
    security_audit.log_event(
        AuditEventType.SECURITY_VIOLATION,
        user_id=user_id,
        username=username,
        details={
            "violation_type": violation_type,
            "violation_details": details
        },
        severity="error"
    )


def audit_anomaly_detected(user_id: str, username: str, anomaly_type: str, details: Dict[str, Any]):
    """Audit anomaly detection"""
    security_audit.log_event(
        AuditEventType.ANOMALY_DETECTED,
        user_id=user_id,
        username=username,
        details={
            "anomaly_type": anomaly_type,
            "anomaly_details": details
        },
        severity="warning"
    )


# Example usage
if __name__ == "__main__":
    # Example of logging various security events
    print("Demonstrating security audit functionality...")
    
    # Log some example events
    audit_login_success("user123", "john_doe", "192.168.1.100")
    audit_login_failure("jane_doe", "192.168.1.101", "invalid_password")
    audit_permission_denied("user123", "john_doe", "/admin/users", "admin")
    audit_data_access("user123", "john_doe", "channel_list", "read")
    audit_data_modification("user123", "john_doe", "channel_1", "update", 
                           {"name": "Updated Channel Name"})
    audit_security_violation("user456", "malicious_user", "sql_injection", 
                           {"attempted_query": "DROP TABLE users"})
    audit_anomaly_detected("user123", "john_doe", "unusual_activity", 
                          {"activity_count": 150, "time_window": "1 hour"})
    
    # Generate reports
    print("\nGenerating summary report:")
    summary_report = security_audit.generate_compliance_report("summary")
    print(summary_report)
    
    print("\nGenerating JSON report:")
    json_report = security_audit.generate_compliance_report("json")
    print(json_report[:500] + "..." if len(json_report) > 500 else json_report)
    
    # Export to file
    security_audit.export_events_to_file("security_audit_export.json", "json")
    print("\nAudit events exported to security_audit_export.json")
    
    # Get security metrics
    metrics = security_audit.get_security_metrics()
    print(f"\nSecurity Metrics (30 days):")
    print(f"  Total Events: {metrics['total_events']}")
    print(f"  Unique Users: {metrics['unique_users']}")
    print(f"  Failed Logins: {metrics['failed_logins']}")