"""
Unit Tests for TargetService

This module tests the target service business logic.
"""

import pytest
from sqlalchemy.orm import Session
from decimal import Decimal
import uuid

from backend.src.services.target_service import TargetService
from backend.src.models.channel_target import TargetPlan
from backend.src.models.channel import Channel, ChannelStatus, BusinessType
from backend.src.models.user import User
from backend.src.utils.exceptions import ValidationError, ConflictError


# =============================================================================
# Create Target Plan Tests
# =============================================================================

@pytest.mark.unit
class TestCreateTargetPlan:
    """Test TargetService.create_target_plan"""

    def test_create_target_plan_success(self, db: Session, test_channel: Channel, test_admin: User):
        """Test successful target plan creation"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        target_plan = TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2024,
            quarter=1,
            performance_target=Decimal("100000.00"),
            opportunity_target=Decimal("50000.00"),
            project_count_target=10,
            development_goal="Expand market share",
            created_by=admin_id
        )

        assert target_plan.id is not None
        assert target_plan.channel_id == channel_id
        assert target_plan.year == 2024
        assert target_plan.quarter == 1
        assert target_plan.performance_target == Decimal("100000.00")
        assert target_plan.opportunity_target == Decimal("50000.00")
        assert target_plan.project_count_target == 10
        assert target_plan.development_goal == "Expand market share"

    def test_create_target_plan_with_month(self, db: Session, test_channel: Channel, test_admin: User):
        """Test creating target plan with specific month"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        target_plan = TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2024,
            quarter=2,
            month=6,
            performance_target=Decimal("25000.00"),
            opportunity_target=None,
            project_count_target=3,
            development_goal="Monthly target",
            created_by=admin_id
        )

        assert target_plan.month == 6
        assert target_plan.quarter == 2

    def test_create_target_plan_invalid_quarter(self, db: Session, test_channel: Channel, test_admin: User):
        """Test creating target plan with invalid quarter fails"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        with pytest.raises(ValidationError) as exc_info:
            TargetService.create_target_plan(
                db=db,
                channel_id=channel_id,
                year=2024,
                quarter=5,  # Invalid: must be 1-4
                performance_target=Decimal("100000.00"),
                opportunity_target=None,
                project_count_target=None,
                development_goal=None,
                created_by=admin_id
            )

        assert "Quarter must be between 1 and 4" in exc_info.value.detail

    def test_create_target_plan_invalid_month(self, db: Session, test_channel: Channel, test_admin: User):
        """Test creating target plan with invalid month fails"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        with pytest.raises(ValidationError) as exc_info:
            TargetService.create_target_plan(
                db=db,
                channel_id=channel_id,
                year=2024,
                quarter=1,
                month=13,  # Invalid: must be 1-12
                performance_target=Decimal("100000.00"),
                opportunity_target=None,
                project_count_target=None,
                development_goal=None,
                created_by=admin_id
            )

        assert "Month must be between 1 and 12" in exc_info.value.detail

    def test_create_target_plan_duplicate(self, db: Session, test_channel: Channel, test_admin: User):
        """Test creating duplicate target plan fails"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create first target plan
        TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2024,
            quarter=3,
            performance_target=Decimal("100000.00"),
            opportunity_target=None,
            project_count_target=None,
            development_goal=None,
            created_by=admin_id
        )

        # Try to create duplicate
        with pytest.raises(ConflictError) as exc_info:
            TargetService.create_target_plan(
                db=db,
                channel_id=channel_id,
                year=2024,
                quarter=3,
                performance_target=Decimal("200000.00"),
                opportunity_target=None,
                project_count_target=None,
                development_goal=None,
                created_by=admin_id
            )

        assert "already exists" in exc_info.value.detail

    def test_create_target_plan_minimal_fields(self, db: Session, test_channel: Channel, test_admin: User):
        """Test creating target plan with minimal fields"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        target_plan = TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2024,
            quarter=4,
            performance_target=None,
            opportunity_target=None,
            project_count_target=None,
            development_goal=None,
            created_by=admin_id
        )

        assert target_plan.id is not None
        assert target_plan.performance_target is None
        assert target_plan.opportunity_target is None
        assert target_plan.project_count_target is None


# =============================================================================
# Get Target Plan Tests
# =============================================================================

@pytest.mark.unit
class TestGetTargetPlan:
    """Test TargetService.get_target_plan_by_id"""

    def test_get_target_plan_success(self, db: Session, test_channel: Channel, test_admin: User):
        """Test getting existing target plan"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create a target plan
        created = TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2024,
            quarter=1,
            performance_target=Decimal("100000.00"),
            opportunity_target=None,
            project_count_target=None,
            development_goal="Test goal",
            created_by=admin_id
        )

        # Get the target plan
        target_plan_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        retrieved = TargetService.get_target_plan_by_id(db, target_plan_id)

        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.year == 2024
        assert retrieved.quarter == 1

    def test_get_target_plan_not_found(self, db: Session):
        """Test getting non-existent target plan returns None"""
        non_existent_id = uuid.uuid4()
        result = TargetService.get_target_plan_by_id(db, non_existent_id)

        assert result is None


# =============================================================================
# Get Target Plans by Channel Tests
# =============================================================================

@pytest.mark.unit
class TestGetTargetPlansByChannel:
    """Test TargetService.get_target_plans_by_channel"""

    def test_get_target_plans_no_filters(self, db: Session, test_channel: Channel, test_admin: User):
        """Test getting all target plans for a channel"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create multiple target plans
        for quarter in [1, 2, 3]:
            TargetService.create_target_plan(
                db=db,
                channel_id=channel_id,
                year=2024,
                quarter=quarter,
                performance_target=Decimal("100000.00"),
                opportunity_target=None,
                project_count_target=None,
                development_goal=None,
                created_by=admin_id
            )

        plans = TargetService.get_target_plans_by_channel(db, channel_id)

        assert len(plans) >= 3
        assert all(p.channel_id == channel_id for p in plans)

    def test_get_target_plans_filter_year(self, db: Session, test_channel: Channel, test_admin: User):
        """Test filtering target plans by year"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create target plans for different years
        TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2023,
            quarter=4,
            performance_target=Decimal("50000.00"),
            opportunity_target=None,
            project_count_target=None,
            development_goal=None,
            created_by=admin_id
        )
        TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2025,
            quarter=1,
            performance_target=Decimal("100000.00"),
            opportunity_target=None,
            project_count_target=None,
            development_goal=None,
            created_by=admin_id
        )

        plans_2025 = TargetService.get_target_plans_by_channel(db, channel_id, year=2025)

        assert all(p.year == 2025 for p in plans_2025)

    def test_get_target_plans_filter_quarter(self, db: Session, test_channel: Channel, test_admin: User):
        """Test filtering target plans by quarter"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create target plans for different quarters
        for quarter in [1, 2, 3, 4]:
            TargetService.create_target_plan(
                db=db,
                channel_id=channel_id,
                year=2026,
                quarter=quarter,
                performance_target=Decimal("100000.00"),
                opportunity_target=None,
                project_count_target=None,
                development_goal=None,
                created_by=admin_id
            )

        plans_q2 = TargetService.get_target_plans_by_channel(db, channel_id, year=2026, quarter=2)

        assert len(plans_q2) == 1
        assert plans_q2[0].quarter == 2


# =============================================================================
# Update Target Plan Tests
# =============================================================================

@pytest.mark.unit
class TestUpdateTargetPlan:
    """Test TargetService.update_target_plan"""

    def test_update_target_plan_success(self, db: Session, test_channel: Channel, test_admin: User):
        """Test successful target plan update"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create a target plan
        created = TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2024,
            quarter=1,
            performance_target=Decimal("100000.00"),
            opportunity_target=Decimal("50000.00"),
            project_count_target=10,
            development_goal="Original goal",
            created_by=admin_id
        )

        # Update the target plan
        target_plan_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        updated = TargetService.update_target_plan(
            db=db,
            target_plan_id=target_plan_id,
            performance_target=Decimal("150000.00"),
            development_goal="Updated goal"
        )

        assert updated is not None
        assert updated.performance_target == Decimal("150000.00")
        assert updated.development_goal == "Updated goal"
        assert updated.opportunity_target == Decimal("50000.00")  # Unchanged

    def test_update_target_plan_partial(self, db: Session, test_channel: Channel, test_admin: User):
        """Test partial target plan update"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        created = TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2024,
            quarter=2,
            performance_target=Decimal("100000.00"),
            opportunity_target=Decimal("50000.00"),
            project_count_target=10,
            development_goal="Original goal",
            created_by=admin_id
        )

        target_plan_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        updated = TargetService.update_target_plan(
            db=db,
            target_plan_id=target_plan_id,
            development_goal="Only goal updated"
        )

        assert updated.development_goal == "Only goal updated"
        assert updated.performance_target == Decimal("100000.00")  # Unchanged

    def test_update_target_plan_not_found(self, db: Session):
        """Test updating non-existent target plan returns None"""
        non_existent_id = uuid.uuid4()

        result = TargetService.update_target_plan(
            db=db,
            target_plan_id=non_existent_id,
            performance_target=Decimal("100000.00")
        )

        assert result is None


# =============================================================================
# Update Target Achievement Tests
# =============================================================================

@pytest.mark.unit
class TestUpdateTargetAchievement:
    """Test TargetService.update_target_achievement"""

    def test_update_achievement_success(self, db: Session, test_channel: Channel, test_admin: User):
        """Test successful achievement update"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        created = TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2024,
            quarter=1,
            performance_target=Decimal("100000.00"),
            opportunity_target=Decimal("50000.00"),
            project_count_target=10,
            development_goal="Test goal",
            created_by=admin_id
        )

        target_plan_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        updated = TargetService.update_target_achievement(
            db=db,
            target_plan_id=target_plan_id,
            achieved_performance=Decimal("75000.00"),
            achieved_opportunity=Decimal("30000.00"),
            achieved_project_count=7
        )

        assert updated is not None
        assert updated.achieved_performance == Decimal("75000.00")
        assert updated.achieved_opportunity == Decimal("30000.00")
        assert updated.achieved_project_count == 7

    def test_update_achievement_partial(self, db: Session, test_channel: Channel, test_admin: User):
        """Test partial achievement update"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        created = TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2024,
            quarter=2,
            performance_target=Decimal("100000.00"),
            opportunity_target=Decimal("50000.00"),
            project_count_target=10,
            development_goal="Test goal",
            created_by=admin_id
        )

        target_plan_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        updated = TargetService.update_target_achievement(
            db=db,
            target_plan_id=target_plan_id,
            achieved_performance=Decimal("50000.00")
        )

        assert updated.achieved_performance == Decimal("50000.00")
        assert updated.achieved_opportunity == Decimal("0")  # Default value

    def test_update_achievement_not_found(self, db: Session):
        """Test updating achievement for non-existent target plan"""
        non_existent_id = uuid.uuid4()

        result = TargetService.update_target_achievement(
            db=db,
            target_plan_id=non_existent_id,
            achieved_performance=Decimal("50000.00")
        )

        assert result is None


# =============================================================================
# Calculate Completion Percentage Tests
# =============================================================================

@pytest.mark.unit
class TestCalculateCompletionPercentage:
    """Test TargetService.calculate_completion_percentage"""

    def test_calculate_completion_all_metrics(self, db: Session, test_channel: Channel, test_admin: User):
        """Test calculating completion with all metrics"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        target_plan = TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2024,
            quarter=1,
            performance_target=Decimal("100000.00"),
            opportunity_target=Decimal("50000.00"),
            project_count_target=10,
            development_goal="Test goal",
            created_by=admin_id
        )

        # Update achievements
        target_plan_id = uuid.UUID(target_plan.id) if isinstance(target_plan.id, str) else target_plan.id
        TargetService.update_target_achievement(
            db=db,
            target_plan_id=target_plan_id,
            achieved_performance=Decimal("50000.00"),
            achieved_opportunity=Decimal("25000.00"),
            achieved_project_count=5
        )

        # Refresh to get updated values
        db.refresh(target_plan)

        result = TargetService.calculate_completion_percentage(target_plan)

        assert result["performance"] == 50.0
        assert result["opportunity"] == 50.0
        assert result["project_count"] == 50.0
        assert result["average"] == 50.0

    def test_calculate_completion_partial_metrics(self, db: Session, test_channel: Channel, test_admin: User):
        """Test calculating completion with partial metrics"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        target_plan = TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2024,
            quarter=2,
            performance_target=Decimal("100000.00"),
            opportunity_target=None,  # No target
            project_count_target=None,  # No target
            development_goal="Test goal",
            created_by=admin_id
        )

        target_plan_id = uuid.UUID(target_plan.id) if isinstance(target_plan.id, str) else target_plan.id
        TargetService.update_target_achievement(
            db=db,
            target_plan_id=target_plan_id,
            achieved_performance=Decimal("75000.00")
        )

        db.refresh(target_plan)

        result = TargetService.calculate_completion_percentage(target_plan)

        assert result["performance"] == 75.0
        assert result["opportunity"] == 0.0  # No target
        assert result["project_count"] == 0.0  # No target

    def test_calculate_completion_over_100_percent(self, db: Session, test_channel: Channel, test_admin: User):
        """Test calculating completion when over 100%"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        target_plan = TargetService.create_target_plan(
            db=db,
            channel_id=channel_id,
            year=2024,
            quarter=3,
            performance_target=Decimal("100000.00"),
            opportunity_target=None,
            project_count_target=None,
            development_goal="Test goal",
            created_by=admin_id
        )

        target_plan_id = uuid.UUID(target_plan.id) if isinstance(target_plan.id, str) else target_plan.id
        TargetService.update_target_achievement(
            db=db,
            target_plan_id=target_plan_id,
            achieved_performance=Decimal("150000.00")  # 150% achievement
        )

        db.refresh(target_plan)

        result = TargetService.calculate_completion_percentage(target_plan)

        assert result["performance"] == 150.0


# =============================================================================
# Calculate Channel Completion Percentage Tests
# =============================================================================

@pytest.mark.unit
class TestCalculateChannelCompletionPercentage:
    """Test TargetService.calculate_channel_completion_percentage"""

    def test_calculate_channel_completion_multiple_targets(self, db: Session, test_channel: Channel, test_admin: User):
        """Test calculating overall channel completion with multiple targets"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create multiple target plans
        for quarter in [1, 2]:
            target_plan = TargetService.create_target_plan(
                db=db,
                channel_id=channel_id,
                year=2027,
                quarter=quarter,
                performance_target=Decimal("100000.00"),
                opportunity_target=Decimal("50000.00"),
                project_count_target=10,
                development_goal="Test goal",
                created_by=admin_id
            )

            # Update achievements to 50%
            target_plan_id = uuid.UUID(target_plan.id) if isinstance(target_plan.id, str) else target_plan.id
            TargetService.update_target_achievement(
                db=db,
                target_plan_id=target_plan_id,
                achieved_performance=Decimal("50000.00"),
                achieved_opportunity=Decimal("25000.00"),
                achieved_project_count=5
            )

        result = TargetService.calculate_channel_completion_percentage(db, channel_id)

        assert result["overall_completion"] == 50.0
        assert result["metric_completions"]["performance"] == 50.0
        assert result["metric_completions"]["opportunity"] == 50.0
        assert result["metric_completions"]["project_count"] == 50.0
        assert len(result["target_breakdown"]) >= 2

    def test_calculate_channel_completion_no_targets(self, db: Session, test_channel: Channel):
        """Test calculating completion for channel with no targets"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id

        result = TargetService.calculate_channel_completion_percentage(db, channel_id)

        assert result["overall_completion"] == 0.0
        assert result["target_breakdown"] == []
