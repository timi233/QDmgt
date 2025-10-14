"""
Unit Tests for Database Models

This module tests all database models to ensure they work correctly.
"""

import pytest
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from backend.src.models.user import User, UserRole
from backend.src.models.channel import Channel, ChannelStatus, BusinessType
from backend.src.models.channel_target import TargetPlan
from backend.src.models.assignment import ChannelAssignment, PermissionLevel
from backend.src.models.execution_plan import ExecutionPlan, PlanType, ExecutionStatus


# =============================================================================
# User Model Tests
# =============================================================================

@pytest.mark.unit
class TestUserModel:
    """Test User model"""

    def test_create_user(self, db_session: Session):
        """Test creating a user"""
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hashed_password",
            full_name="Test User",
            role=UserRole.user,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.id is not None
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.role == UserRole.user
        assert user.is_active is True
        assert user.created_at is not None

    def test_user_roles(self, db_session: Session):
        """Test different user roles"""
        admin = User(
            id=str(uuid.uuid4()),
            username="admin",
            email="admin@example.com",
            hashed_password="hashed",
            role=UserRole.admin,
            is_active=True
        )
        manager = User(
            id=str(uuid.uuid4()),
            username="manager",
            email="manager@example.com",
            hashed_password="hashed",
            role=UserRole.manager,
            is_active=True
        )
        user = User(
            id=str(uuid.uuid4()),
            username="user",
            email="user@example.com",
            hashed_password="hashed",
            role=UserRole.user,
            is_active=True
        )

        db_session.add_all([admin, manager, user])
        db_session.commit()

        assert admin.role == UserRole.admin
        assert manager.role == UserRole.manager
        assert user.role == UserRole.user

    def test_user_unique_constraints(self, db_session: Session):
        """Test user unique constraints"""
        user1 = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hashed",
            role=UserRole.user,
            is_active=True
        )
        db_session.add(user1)
        db_session.commit()

        # Try to create another user with same username
        user2 = User(
            id=str(uuid.uuid4()),
            username="testuser",  # Duplicate username
            email="test2@example.com",
            hashed_password="hashed",
            role=UserRole.user,
            is_active=True
        )
        db_session.add(user2)

        with pytest.raises(Exception):  # Should raise IntegrityError
            db_session.commit()

    def test_user_repr(self, db_session: Session):
        """Test user string representation"""
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            email="test@example.com",
            hashed_password="hashed",
            role=UserRole.user,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()

        repr_str = repr(user)
        assert "testuser" in repr_str
        assert "User" in repr_str


# =============================================================================
# Channel Model Tests
# =============================================================================

@pytest.mark.unit
class TestChannelModel:
    """Test Channel model"""

    def test_create_channel(self, db_session: Session, test_admin: User):
        """Test creating a channel"""
        channel = Channel(
            id=str(uuid.uuid4()),
            name="Test Channel",
            description="Test description",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            contact_email="channel@example.com",
            contact_phone="+1234567890",
            created_by=test_admin.id,
            last_modified_by=test_admin.id
        )
        db_session.add(channel)
        db_session.commit()
        db_session.refresh(channel)

        assert channel.id is not None
        assert channel.name == "Test Channel"
        assert channel.status == ChannelStatus.active
        assert channel.business_type == BusinessType.basic
        assert channel.created_at is not None

    def test_channel_statuses(self, db_session: Session, test_admin: User):
        """Test different channel statuses"""
        active = Channel(
            id=str(uuid.uuid4()),
            name="Active Channel",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            created_by=test_admin.id,
            last_modified_by=test_admin.id
        )
        inactive = Channel(
            id=str(uuid.uuid4()),
            name="Inactive Channel",
            status=ChannelStatus.inactive,
            business_type=BusinessType.basic,
            created_by=test_admin.id,
            last_modified_by=test_admin.id
        )
        suspended = Channel(
            id=str(uuid.uuid4()),
            name="Suspended Channel",
            status=ChannelStatus.suspended,
            business_type=BusinessType.basic,
            created_by=test_admin.id,
            last_modified_by=test_admin.id
        )

        db_session.add_all([active, inactive, suspended])
        db_session.commit()

        assert active.status == ChannelStatus.active
        assert inactive.status == ChannelStatus.inactive
        assert suspended.status == ChannelStatus.suspended

    def test_channel_business_types(self, db_session: Session, test_admin: User):
        """Test different business types"""
        basic = Channel(
            id=str(uuid.uuid4()),
            name="Basic Channel",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            created_by=test_admin.id,
            last_modified_by=test_admin.id
        )
        high_value = Channel(
            id=str(uuid.uuid4()),
            name="High Value Channel",
            status=ChannelStatus.active,
            business_type=BusinessType.high_value,
            created_by=test_admin.id,
            last_modified_by=test_admin.id
        )

        db_session.add_all([basic, high_value])
        db_session.commit()

        assert basic.business_type == BusinessType.basic
        assert high_value.business_type == BusinessType.high_value

    def test_channel_relationships(self, db_session: Session, test_admin: User):
        """Test channel relationships with user"""
        channel = Channel(
            id=str(uuid.uuid4()),
            name="Test Channel",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            created_by=test_admin.id,
            last_modified_by=test_admin.id
        )
        db_session.add(channel)
        db_session.commit()
        db_session.refresh(channel)

        assert channel.created_by == test_admin.id
        assert channel.last_modified_by == test_admin.id


# =============================================================================
# TargetPlan Model Tests
# =============================================================================

@pytest.mark.unit
class TestTargetPlanModel:
    """Test TargetPlan model"""

    def test_create_target_plan(self, db_session: Session, test_channel: Channel, test_admin: User):
        """Test creating a target plan"""
        target = TargetPlan(
            id=str(uuid.uuid4()),
            channel_id=test_channel.id,
            year=2025,
            quarter=1,
            month=1,
            performance_target=100.00,
            opportunity_target=150.00,
            project_count_target=10,
            development_goal="Increase market share",
            created_by=test_admin.id
        )
        db_session.add(target)
        db_session.commit()
        db_session.refresh(target)

        assert target.id is not None
        assert target.channel_id == test_channel.id
        assert target.year == 2025
        assert target.quarter == 1
        assert target.month == 1
        assert float(target.performance_target) == 100.00
        assert target.created_at is not None

    def test_target_plan_quarterly(self, db_session: Session, test_channel: Channel, test_admin: User):
        """Test quarterly target plan (without month)"""
        target = TargetPlan(
            id=str(uuid.uuid4()),
            channel_id=test_channel.id,
            year=2025,
            quarter=2,
            month=None,  # Quarterly target
            performance_target=300.00,
            created_by=test_admin.id
        )
        db_session.add(target)
        db_session.commit()
        db_session.refresh(target)

        assert target.quarter == 2
        assert target.month is None

    def test_target_plan_achievement(self, db_session: Session, test_channel: Channel, test_admin: User):
        """Test target achievement tracking"""
        target = TargetPlan(
            id=str(uuid.uuid4()),
            channel_id=test_channel.id,
            year=2025,
            quarter=1,
            performance_target=100.00,
            achieved_performance=75.50,
            opportunity_target=150.00,
            achieved_opportunity=120.00,
            project_count_target=10,
            achieved_project_count=8,
            created_by=test_admin.id
        )
        db_session.add(target)
        db_session.commit()
        db_session.refresh(target)

        assert float(target.achieved_performance) == 75.50
        assert float(target.achieved_opportunity) == 120.00
        assert target.achieved_project_count == 8


# =============================================================================
# ChannelAssignment Model Tests
# =============================================================================

@pytest.mark.unit
class TestChannelAssignmentModel:
    """Test ChannelAssignment model"""

    def test_create_assignment(self, db_session: Session, test_channel: Channel,
                              test_user: User, test_admin: User):
        """Test creating a channel assignment"""
        assignment = ChannelAssignment(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            channel_id=test_channel.id,
            permission_level=PermissionLevel.write,
            assigned_by=test_admin.id,
            target_responsibility=True
        )
        db_session.add(assignment)
        db_session.commit()
        db_session.refresh(assignment)

        assert assignment.id is not None
        assert assignment.user_id == test_user.id
        assert assignment.channel_id == test_channel.id
        assert assignment.permission_level == PermissionLevel.write
        assert assignment.target_responsibility is True

    def test_assignment_permission_levels(self, db_session: Session, test_channel: Channel,
                                          test_user: User, test_manager: User, test_admin: User):
        """Test different permission levels"""
        read_assignment = ChannelAssignment(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            channel_id=test_channel.id,
            permission_level=PermissionLevel.read,
            assigned_by=test_admin.id
        )
        write_assignment = ChannelAssignment(
            id=str(uuid.uuid4()),
            user_id=test_manager.id,
            channel_id=test_channel.id,
            permission_level=PermissionLevel.write,
            assigned_by=test_admin.id
        )

        db_session.add_all([read_assignment, write_assignment])
        db_session.commit()

        assert read_assignment.permission_level == PermissionLevel.read
        assert write_assignment.permission_level == PermissionLevel.write


# =============================================================================
# ExecutionPlan Model Tests
# =============================================================================

@pytest.mark.unit
class TestExecutionPlanModel:
    """Test ExecutionPlan model"""

    def test_create_execution_plan(self, db_session: Session, test_channel: Channel, test_admin: User):
        """Test creating an execution plan"""
        plan = ExecutionPlan(
            id=str(uuid.uuid4()),
            channel_id=test_channel.id,
            user_id=test_admin.id,
            plan_type=PlanType.monthly,
            plan_period="2025-01",
            plan_content="1. Contact client\n2. Send proposal\n3. Close deal",
            status=ExecutionStatus.planned
        )
        db_session.add(plan)
        db_session.commit()
        db_session.refresh(plan)

        assert plan.id is not None
        assert plan.channel_id == test_channel.id
        assert plan.user_id == test_admin.id
        assert plan.plan_type == PlanType.monthly
        assert plan.plan_period == "2025-01"
        assert plan.status == ExecutionStatus.planned

    def test_execution_plan_statuses(self, db_session: Session, test_channel: Channel, test_admin: User):
        """Test different execution plan statuses"""
        planned = ExecutionPlan(
            id=str(uuid.uuid4()),
            channel_id=test_channel.id,
            user_id=test_admin.id,
            plan_type=PlanType.monthly,
            plan_period="2025-01",
            plan_content="Plan content",
            status=ExecutionStatus.planned
        )
        in_progress = ExecutionPlan(
            id=str(uuid.uuid4()),
            channel_id=test_channel.id,
            user_id=test_admin.id,
            plan_type=PlanType.monthly,
            plan_period="2025-02",
            plan_content="Plan content",
            status=ExecutionStatus.in_progress
        )
        completed = ExecutionPlan(
            id=str(uuid.uuid4()),
            channel_id=test_channel.id,
            user_id=test_admin.id,
            plan_type=PlanType.monthly,
            plan_period="2025-03",
            plan_content="Plan content",
            status=ExecutionStatus.completed
        )

        db_session.add_all([planned, in_progress, completed])
        db_session.commit()

        assert planned.status == ExecutionStatus.planned
        assert in_progress.status == ExecutionStatus.in_progress
        assert completed.status == ExecutionStatus.completed

    def test_execution_plan_types(self, db_session: Session, test_channel: Channel, test_admin: User):
        """Test different plan types"""
        monthly = ExecutionPlan(
            id=str(uuid.uuid4()),
            channel_id=test_channel.id,
            user_id=test_admin.id,
            plan_type=PlanType.monthly,
            plan_period="2025-01",
            plan_content="Monthly plan content",
            status=ExecutionStatus.planned
        )
        weekly = ExecutionPlan(
            id=str(uuid.uuid4()),
            channel_id=test_channel.id,
            user_id=test_admin.id,
            plan_type=PlanType.weekly,
            plan_period="2025-01",  # Format: YYYY-WW
            plan_content="Weekly plan content",
            status=ExecutionStatus.planned
        )

        db_session.add_all([monthly, weekly])
        db_session.commit()

        assert monthly.plan_type == PlanType.monthly
        assert monthly.plan_period == "2025-01"
        assert weekly.plan_type == PlanType.weekly
        assert weekly.plan_period == "2025-01"


# =============================================================================
# Model Relationship Tests
# =============================================================================

@pytest.mark.unit
class TestModelRelationships:
    """Test relationships between models"""

    def test_user_channel_relationship(self, db_session: Session, test_admin: User):
        """Test user can create multiple channels"""
        channel1 = Channel(
            id=str(uuid.uuid4()),
            name="Channel 1",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            created_by=test_admin.id,
            last_modified_by=test_admin.id
        )
        channel2 = Channel(
            id=str(uuid.uuid4()),
            name="Channel 2",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            created_by=test_admin.id,
            last_modified_by=test_admin.id
        )

        db_session.add_all([channel1, channel2])
        db_session.commit()

        # Query channels by creator
        channels = db_session.query(Channel).filter(
            Channel.created_by == test_admin.id
        ).all()

        assert len(channels) >= 2

    def test_channel_target_relationship(self, db_session: Session, test_channel: Channel, test_admin: User):
        """Test channel can have multiple targets"""
        target1 = TargetPlan(
            id=str(uuid.uuid4()),
            channel_id=test_channel.id,
            year=2025,
            quarter=1,
            created_by=test_admin.id
        )
        target2 = TargetPlan(
            id=str(uuid.uuid4()),
            channel_id=test_channel.id,
            year=2025,
            quarter=2,
            created_by=test_admin.id
        )

        db_session.add_all([target1, target2])
        db_session.commit()

        # Query targets by channel
        targets = db_session.query(TargetPlan).filter(
            TargetPlan.channel_id == test_channel.id
        ).all()

        assert len(targets) >= 2

    def test_channel_assignment_relationship(self, db_session: Session, test_channel: Channel,
                                            test_user: User, test_admin: User):
        """Test channel can have multiple assignments"""
        assignment = ChannelAssignment(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            channel_id=test_channel.id,
            permission_level=PermissionLevel.read,
            assigned_by=test_admin.id
        )

        db_session.add(assignment)
        db_session.commit()

        # Query assignments by channel
        assignments = db_session.query(ChannelAssignment).filter(
            ChannelAssignment.channel_id == test_channel.id
        ).all()

        assert len(assignments) >= 1
        assert assignments[0].user_id == test_user.id
