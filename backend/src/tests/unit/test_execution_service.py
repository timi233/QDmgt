"""
Unit Tests for ExecutionPlanService

This module tests the execution plan service business logic.
"""

import pytest
from sqlalchemy.orm import Session
import uuid

from backend.src.services.execution_service import ExecutionPlanService
from backend.src.models.execution_plan import ExecutionPlan, PlanType, ExecutionStatus
from backend.src.models.channel import Channel
from backend.src.models.user import User
from backend.src.utils.exceptions import ValidationError, NotFoundError


# =============================================================================
# Create Execution Plan Tests
# =============================================================================

@pytest.mark.unit
class TestCreateExecutionPlan:
    """Test ExecutionPlanService.create_execution_plan"""

    def test_create_monthly_plan_success(self, db: Session, test_channel: Channel, test_user: User):
        """Test successful monthly execution plan creation"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        plan = ExecutionPlanService.create_execution_plan(
            db=db,
            channel_id=channel_id,
            user_id=user_id,
            plan_type=PlanType.monthly,
            plan_period="2024-03",
            plan_content="March execution plan",
            execution_status="In progress",
            key_obstacles="Limited resources",
            next_steps="Hire more staff"
        )

        assert plan.id is not None
        assert plan.plan_type == PlanType.monthly
        assert plan.plan_period == "2024-03"
        assert plan.plan_content == "March execution plan"
        assert plan.status == ExecutionStatus.planned

    def test_create_weekly_plan_success(self, db: Session, test_channel: Channel, test_user: User):
        """Test successful weekly execution plan creation"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        plan = ExecutionPlanService.create_execution_plan(
            db=db,
            channel_id=channel_id,
            user_id=user_id,
            plan_type=PlanType.weekly,
            plan_period="2024-W12",
            plan_content="Week 12 execution plan",
            execution_status=None,
            key_obstacles=None,
            next_steps=None
        )

        assert plan.id is not None
        assert plan.plan_type == PlanType.weekly
        assert plan.plan_period == "2024-W12"

    def test_create_plan_invalid_monthly_format(self, db: Session, test_channel: Channel, test_user: User):
        """Test creating plan with invalid monthly period format fails"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        with pytest.raises(ValidationError) as exc_info:
            ExecutionPlanService.create_execution_plan(
                db=db,
                channel_id=channel_id,
                user_id=user_id,
                plan_type=PlanType.monthly,
                plan_period="202403",  # Invalid format
                plan_content="Test plan"
            )

        assert "YYYY-MM format" in exc_info.value.detail

    def test_create_plan_invalid_weekly_format(self, db: Session, test_channel: Channel, test_user: User):
        """Test creating plan with invalid weekly period format fails"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        with pytest.raises(ValidationError) as exc_info:
            ExecutionPlanService.create_execution_plan(
                db=db,
                channel_id=channel_id,
                user_id=user_id,
                plan_type=PlanType.weekly,
                plan_period="2024W12",  # Invalid format (no dash)
                plan_content="Test plan"
            )

        assert "YYYY-W" in exc_info.value.detail and "format" in exc_info.value.detail

    def test_create_plan_user_not_found(self, db: Session, test_channel: Channel):
        """Test creating plan with non-existent user fails"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        non_existent_user_id = uuid.uuid4()

        with pytest.raises(NotFoundError) as exc_info:
            ExecutionPlanService.create_execution_plan(
                db=db,
                channel_id=channel_id,
                user_id=non_existent_user_id,
                plan_type=PlanType.monthly,
                plan_period="2024-01",
                plan_content="Test plan"
            )

        assert "not found" in exc_info.value.detail.lower()

    def test_create_plan_channel_not_found(self, db: Session, test_user: User):
        """Test creating plan with non-existent channel fails"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        non_existent_channel_id = uuid.uuid4()

        with pytest.raises(NotFoundError) as exc_info:
            ExecutionPlanService.create_execution_plan(
                db=db,
                channel_id=non_existent_channel_id,
                user_id=user_id,
                plan_type=PlanType.monthly,
                plan_period="2024-01",
                plan_content="Test plan"
            )

        assert "not found" in exc_info.value.detail.lower()


# =============================================================================
# Get Execution Plan Tests
# =============================================================================

@pytest.mark.unit
class TestGetExecutionPlan:
    """Test ExecutionPlanService.get_execution_plan_by_id"""

    def test_get_execution_plan_success(self, db: Session, test_channel: Channel, test_user: User):
        """Test getting existing execution plan"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        # Create a plan
        created = ExecutionPlanService.create_execution_plan(
            db=db,
            channel_id=channel_id,
            user_id=user_id,
            plan_type=PlanType.monthly,
            plan_period="2024-04",
            plan_content="April plan"
        )

        # Get the plan
        plan_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        retrieved = ExecutionPlanService.get_execution_plan_by_id(db, plan_id)

        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.plan_period == "2024-04"

    def test_get_execution_plan_not_found(self, db: Session):
        """Test getting non-existent execution plan returns None"""
        non_existent_id = uuid.uuid4()
        result = ExecutionPlanService.get_execution_plan_by_id(db, non_existent_id)

        assert result is None


# =============================================================================
# Get Execution Plans by Channel Tests
# =============================================================================

@pytest.mark.unit
class TestGetExecutionPlansByChannel:
    """Test ExecutionPlanService.get_execution_plans_by_channel"""

    def test_get_plans_by_channel_no_filters(self, db: Session, test_channel: Channel, test_user: User):
        """Test getting all execution plans for a channel"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        # Create multiple plans
        for month in ["2024-01", "2024-02", "2024-03"]:
            ExecutionPlanService.create_execution_plan(
                db=db,
                channel_id=channel_id,
                user_id=user_id,
                plan_type=PlanType.monthly,
                plan_period=month,
                plan_content=f"Plan for {month}"
            )

        plans = ExecutionPlanService.get_execution_plans_by_channel(db, channel_id)

        assert len(plans) >= 3

    def test_get_plans_by_channel_filter_type(self, db: Session, test_channel: Channel, test_user: User):
        """Test filtering plans by type"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        # Create monthly and weekly plans
        ExecutionPlanService.create_execution_plan(
            db=db,
            channel_id=channel_id,
            user_id=user_id,
            plan_type=PlanType.monthly,
            plan_period="2024-05",
            plan_content="Monthly plan"
        )
        ExecutionPlanService.create_execution_plan(
            db=db,
            channel_id=channel_id,
            user_id=user_id,
            plan_type=PlanType.weekly,
            plan_period="2024-W20",
            plan_content="Weekly plan"
        )

        monthly_plans = ExecutionPlanService.get_execution_plans_by_channel(
            db, channel_id, plan_type=PlanType.monthly
        )

        assert all(p.plan_type == PlanType.monthly for p in monthly_plans)

    def test_get_plans_by_channel_filter_status(self, db: Session, test_channel: Channel, test_user: User):
        """Test filtering plans by status"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        # Create plan
        plan = ExecutionPlanService.create_execution_plan(
            db=db,
            channel_id=channel_id,
            user_id=user_id,
            plan_type=PlanType.monthly,
            plan_period="2024-06",
            plan_content="Test plan"
        )

        # Update status
        plan_id = uuid.UUID(plan.id) if isinstance(plan.id, str) else plan.id
        ExecutionPlanService.update_execution_status(db, plan_id, ExecutionStatus.in_progress)

        in_progress_plans = ExecutionPlanService.get_execution_plans_by_channel(
            db, channel_id, status=ExecutionStatus.in_progress
        )

        assert len(in_progress_plans) >= 1


# =============================================================================
# Get Execution Plans by User Tests
# =============================================================================

@pytest.mark.unit
class TestGetExecutionPlansByUser:
    """Test ExecutionPlanService.get_execution_plans_by_user"""

    def test_get_plans_by_user(self, db: Session, test_channel: Channel, test_user: User):
        """Test getting all execution plans for a user"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        # Create multiple plans for the user
        for i in range(3):
            ExecutionPlanService.create_execution_plan(
                db=db,
                channel_id=channel_id,
                user_id=user_id,
                plan_type=PlanType.monthly,
                plan_period=f"2024-0{i+1}",
                plan_content=f"User plan {i}"
            )

        plans = ExecutionPlanService.get_execution_plans_by_user(db, user_id)

        assert len(plans) >= 3


# =============================================================================
# Update Execution Plan Tests
# =============================================================================

@pytest.mark.unit
class TestUpdateExecutionPlan:
    """Test ExecutionPlanService.update_execution_plan"""

    def test_update_execution_plan_success(self, db: Session, test_channel: Channel, test_user: User):
        """Test successful execution plan update"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        # Create a plan
        created = ExecutionPlanService.create_execution_plan(
            db=db,
            channel_id=channel_id,
            user_id=user_id,
            plan_type=PlanType.monthly,
            plan_period="2024-07",
            plan_content="Original content",
            execution_status="Initial status"
        )

        # Update the plan
        plan_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        updated = ExecutionPlanService.update_execution_plan(
            db=db,
            execution_plan_id=plan_id,
            plan_content="Updated content",
            execution_status="Updated status",
            key_obstacles="New obstacles",
            next_steps="New next steps"
        )

        assert updated is not None
        assert updated.plan_content == "Updated content"
        assert updated.execution_status == "Updated status"
        assert updated.key_obstacles == "New obstacles"
        assert updated.next_steps == "New next steps"

    def test_update_execution_plan_partial(self, db: Session, test_channel: Channel, test_user: User):
        """Test partial execution plan update"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        created = ExecutionPlanService.create_execution_plan(
            db=db,
            channel_id=channel_id,
            user_id=user_id,
            plan_type=PlanType.monthly,
            plan_period="2024-08",
            plan_content="Original content"
        )

        plan_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        updated = ExecutionPlanService.update_execution_plan(
            db=db,
            execution_plan_id=plan_id,
            key_obstacles="Only obstacles updated"
        )

        assert updated.plan_content == "Original content"  # Unchanged
        assert updated.key_obstacles == "Only obstacles updated"

    def test_update_execution_plan_not_found(self, db: Session):
        """Test updating non-existent execution plan returns None"""
        non_existent_id = uuid.uuid4()

        result = ExecutionPlanService.update_execution_plan(
            db=db,
            execution_plan_id=non_existent_id,
            plan_content="Updated content"
        )

        assert result is None


# =============================================================================
# Update Execution Status Tests
# =============================================================================

@pytest.mark.unit
class TestUpdateExecutionStatus:
    """Test ExecutionPlanService.update_execution_status"""

    def test_update_status_success(self, db: Session, test_channel: Channel, test_user: User):
        """Test successful status update"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        created = ExecutionPlanService.create_execution_plan(
            db=db,
            channel_id=channel_id,
            user_id=user_id,
            plan_type=PlanType.monthly,
            plan_period="2024-09",
            plan_content="Test plan"
        )

        plan_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        updated = ExecutionPlanService.update_execution_status(
            db, plan_id, ExecutionStatus.completed
        )

        assert updated is not None
        assert updated.status == ExecutionStatus.completed

    def test_update_status_to_in_progress(self, db: Session, test_channel: Channel, test_user: User):
        """Test updating status to in_progress"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        created = ExecutionPlanService.create_execution_plan(
            db=db,
            channel_id=channel_id,
            user_id=user_id,
            plan_type=PlanType.weekly,
            plan_period="2024-W30",
            plan_content="Test plan"
        )

        plan_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        updated = ExecutionPlanService.update_execution_status(
            db, plan_id, ExecutionStatus.in_progress
        )

        assert updated.status == ExecutionStatus.in_progress

    def test_update_status_not_found(self, db: Session):
        """Test updating status for non-existent plan returns None"""
        non_existent_id = uuid.uuid4()

        result = ExecutionPlanService.update_execution_status(
            db, non_existent_id, ExecutionStatus.completed
        )

        assert result is None


# =============================================================================
# Delete Execution Plan Tests
# =============================================================================

@pytest.mark.unit
class TestDeleteExecutionPlan:
    """Test ExecutionPlanService.delete_execution_plan"""

    def test_delete_execution_plan_success(self, db: Session, test_channel: Channel, test_user: User):
        """Test successful execution plan deletion"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        # Create a plan to delete
        created = ExecutionPlanService.create_execution_plan(
            db=db,
            channel_id=channel_id,
            user_id=user_id,
            plan_type=PlanType.monthly,
            plan_period="2024-10",
            plan_content="To be deleted"
        )

        plan_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        success = ExecutionPlanService.delete_execution_plan(db, plan_id)

        assert success is True

        # Verify plan is deleted
        result = ExecutionPlanService.get_execution_plan_by_id(db, plan_id)
        assert result is None

    def test_delete_execution_plan_not_found(self, db: Session):
        """Test deleting non-existent execution plan returns False"""
        non_existent_id = uuid.uuid4()

        success = ExecutionPlanService.delete_execution_plan(db, non_existent_id)

        assert success is False
