"""
Integration Tests for Targets API

This module tests the targets API endpoints end-to-end.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid
from decimal import Decimal

from backend.src.models.channel import Channel
from backend.src.models.channel_target import TargetPlan
from backend.src.models.user import User


# =============================================================================
# Create Target Plan Tests
# =============================================================================

@pytest.mark.integration
class TestCreateTargetPlanAPI:
    """Test POST /targets endpoint"""

    def test_create_target_plan_success(self, client: TestClient, test_channel: Channel):
        """Test successful target plan creation"""
        response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 1,
                "performance_target": "100000.00",
                "opportunity_target": "50000.00",
                "project_count_target": 10,
                "development_goal": "Expand market share"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["channel_id"] == str(test_channel.id)
        assert data["year"] == 2024
        assert data["quarter"] == 1
        assert data["performance_target"] == "100000.00"
        assert "id" in data
        assert "created_at" in data

    def test_create_target_plan_with_month(self, client: TestClient, test_channel: Channel):
        """Test creating target plan with specific month"""
        response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 2,
                "month": 6,
                "performance_target": "25000.00",
                "project_count_target": 3
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["month"] == 6
        assert data["quarter"] == 2

    def test_create_target_plan_invalid_quarter(self, client: TestClient, test_channel: Channel):
        """Test creating target plan with invalid quarter fails"""
        response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 5,  # Invalid: must be 1-4
                "performance_target": "100000.00"
            }
        )

        assert response.status_code == 422
        assert "Quarter must be between 1 and 4" in response.json()["detail"]

    def test_create_target_plan_invalid_month(self, client: TestClient, test_channel: Channel):
        """Test creating target plan with invalid month fails"""
        response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 1,
                "month": 13,  # Invalid: must be 1-12
                "performance_target": "100000.00"
            }
        )

        assert response.status_code == 422
        assert "Month must be between 1 and 12" in response.json()["detail"]

    def test_create_target_plan_duplicate(self, client: TestClient, test_channel: Channel):
        """Test creating duplicate target plan fails"""
        # Create first target plan
        client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 3,
                "performance_target": "100000.00"
            }
        )

        # Try to create duplicate
        response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 3,
                "performance_target": "200000.00"
            }
        )

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]


# =============================================================================
# Get Target Plan Tests
# =============================================================================

@pytest.mark.integration
class TestGetTargetPlanAPI:
    """Test GET /targets/{id} endpoint"""

    def test_get_target_plan_success(self, client: TestClient, db_session: Session, test_channel: Channel, test_admin: User):
        """Test getting existing target plan"""
        from backend.src.services.target_service import TargetService

        # Create a target plan
        target_plan = TargetService.create_target_plan(
            db=db_session,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            year=2024,
            quarter=1,
            performance_target=Decimal("100000.00"),
            opportunity_target=Decimal("50000.00"),
            project_count_target=10,
            development_goal="Test goal",
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        response = client.get(f"/api/v1/targets/{target_plan.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(target_plan.id)
        assert data["channel_id"] == str(test_channel.id)
        assert data["year"] == 2024
        assert data["quarter"] == 1

    def test_get_target_plan_not_found(self, client: TestClient):
        """Test getting non-existent target plan"""
        non_existent_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/targets/{non_existent_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_get_target_plan_invalid_uuid(self, client: TestClient):
        """Test getting target plan with invalid UUID"""
        response = client.get("/api/v1/targets/not-a-uuid")

        assert response.status_code == 422


# =============================================================================
# Get Target Plans by Channel Tests
# =============================================================================

@pytest.mark.integration
class TestGetTargetPlansByChannelAPI:
    """Test GET /targets/channel/{channel_id} endpoint"""

    def test_get_target_plans_by_channel_no_filters(self, client: TestClient, db_session: Session, test_channel: Channel, test_admin: User):
        """Test getting all target plans for a channel"""
        from backend.src.services.target_service import TargetService

        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create multiple target plans
        for quarter in [1, 2]:
            TargetService.create_target_plan(
                db=db_session,
                channel_id=channel_id,
                year=2024,
                quarter=quarter,
                performance_target=Decimal("100000.00"),
                opportunity_target=None,
                project_count_target=None,
                development_goal=None,
                created_by=admin_id
            )

        response = client.get(f"/api/v1/targets/channel/{test_channel.id}")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        assert all(tp["channel_id"] == str(test_channel.id) for tp in data)

    def test_get_target_plans_by_channel_filter_year(self, client: TestClient, db_session: Session, test_channel: Channel, test_admin: User):
        """Test filtering target plans by year"""
        from backend.src.services.target_service import TargetService

        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create target plans for different years
        TargetService.create_target_plan(
            db=db_session,
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
            db=db_session,
            channel_id=channel_id,
            year=2024,
            quarter=1,
            performance_target=Decimal("100000.00"),
            opportunity_target=None,
            project_count_target=None,
            development_goal=None,
            created_by=admin_id
        )

        response = client.get(f"/api/v1/targets/channel/{test_channel.id}?year=2024")

        assert response.status_code == 200
        data = response.json()
        assert all(tp["year"] == 2024 for tp in data)

    def test_get_target_plans_by_channel_filter_quarter(self, client: TestClient, db_session: Session, test_channel: Channel, test_admin: User):
        """Test filtering target plans by quarter"""
        from backend.src.services.target_service import TargetService

        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create target plans for different quarters
        for quarter in [1, 2, 3]:
            TargetService.create_target_plan(
                db=db_session,
                channel_id=channel_id,
                year=2024,
                quarter=quarter,
                performance_target=Decimal("100000.00"),
                opportunity_target=None,
                project_count_target=None,
                development_goal=None,
                created_by=admin_id
            )

        response = client.get(f"/api/v1/targets/channel/{test_channel.id}?quarter=2")

        assert response.status_code == 200
        data = response.json()
        assert all(tp["quarter"] == 2 for tp in data)


# =============================================================================
# Update Target Plan Tests
# =============================================================================

@pytest.mark.integration
class TestUpdateTargetPlanAPI:
    """Test PUT /targets/{id} endpoint"""

    def test_update_target_plan_success(self, client: TestClient, db_session: Session, test_channel: Channel, test_admin: User):
        """Test successful target plan update"""
        from backend.src.services.target_service import TargetService

        # Create a target plan
        target_plan = TargetService.create_target_plan(
            db=db_session,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            year=2024,
            quarter=1,
            performance_target=Decimal("100000.00"),
            opportunity_target=Decimal("50000.00"),
            project_count_target=10,
            development_goal="Original goal",
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        response = client.put(
            f"/api/v1/targets/{target_plan.id}",
            json={
                "performance_target": "150000.00",
                "development_goal": "Updated goal"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["performance_target"] == "150000.00"
        assert data["development_goal"] == "Updated goal"

    def test_update_target_plan_partial(self, client: TestClient, db_session: Session, test_channel: Channel, test_admin: User):
        """Test partial target plan update"""
        from backend.src.services.target_service import TargetService

        target_plan = TargetService.create_target_plan(
            db=db_session,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            year=2024,
            quarter=2,
            performance_target=Decimal("100000.00"),
            opportunity_target=Decimal("50000.00"),
            project_count_target=10,
            development_goal="Original goal",
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        original_performance = target_plan.performance_target

        response = client.put(
            f"/api/v1/targets/{target_plan.id}",
            json={
                "development_goal": "Only goal updated"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["performance_target"] == str(original_performance)
        assert data["development_goal"] == "Only goal updated"

    def test_update_target_plan_not_found(self, client: TestClient):
        """Test updating non-existent target plan"""
        non_existent_id = str(uuid.uuid4())

        response = client.put(
            f"/api/v1/targets/{non_existent_id}",
            json={"performance_target": "100000.00"}
        )

        assert response.status_code == 404


# =============================================================================
# Update Target Achievement Tests
# =============================================================================

@pytest.mark.integration
class TestUpdateTargetAchievementAPI:
    """Test PATCH /targets/{id}/achievement endpoint"""

    def test_update_target_achievement_success(self, client: TestClient, db_session: Session, test_channel: Channel, test_admin: User):
        """Test successful achievement update"""
        from backend.src.services.target_service import TargetService

        target_plan = TargetService.create_target_plan(
            db=db_session,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            year=2024,
            quarter=1,
            performance_target=Decimal("100000.00"),
            opportunity_target=Decimal("50000.00"),
            project_count_target=10,
            development_goal="Test goal",
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        response = client.patch(
            f"/api/v1/targets/{target_plan.id}/achievement",
            json={
                "achieved_performance": "75000.00",
                "achieved_opportunity": "30000.00",
                "achieved_project_count": 7
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["achieved_performance"] == "75000.00"
        assert data["achieved_opportunity"] == "30000.00"
        assert data["achieved_project_count"] == 7

    def test_update_target_achievement_partial(self, client: TestClient, db_session: Session, test_channel: Channel, test_admin: User):
        """Test partial achievement update"""
        from backend.src.services.target_service import TargetService

        target_plan = TargetService.create_target_plan(
            db=db_session,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            year=2024,
            quarter=2,
            performance_target=Decimal("100000.00"),
            opportunity_target=Decimal("50000.00"),
            project_count_target=10,
            development_goal="Test goal",
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        response = client.patch(
            f"/api/v1/targets/{target_plan.id}/achievement",
            json={
                "achieved_performance": "50000.00"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["achieved_performance"] == "50000.00"

    def test_update_target_achievement_not_found(self, client: TestClient):
        """Test updating achievement for non-existent target plan"""
        non_existent_id = str(uuid.uuid4())

        response = client.patch(
            f"/api/v1/targets/{non_existent_id}/achievement",
            json={"achieved_performance": "50000.00"}
        )

        assert response.status_code == 404


# =============================================================================
# Get Completion Percentage Tests
# =============================================================================

@pytest.mark.integration
class TestGetCompletionPercentageAPI:
    """Test GET /targets/{id}/completion endpoint"""

    def test_get_completion_percentage_success(self, client: TestClient, db_session: Session, test_channel: Channel, test_admin: User):
        """Test getting completion percentage"""
        from backend.src.services.target_service import TargetService

        # Create target plan with targets and achievements
        target_plan = TargetService.create_target_plan(
            db=db_session,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            year=2024,
            quarter=1,
            performance_target=Decimal("100000.00"),
            opportunity_target=Decimal("50000.00"),
            project_count_target=10,
            development_goal="Test goal",
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        # Update achievements
        TargetService.update_target_achievement(
            db=db_session,
            target_plan_id=uuid.UUID(target_plan.id) if isinstance(target_plan.id, str) else target_plan.id,
            achieved_performance=Decimal("50000.00"),
            achieved_opportunity=Decimal("25000.00"),
            achieved_project_count=5
        )

        response = client.get(f"/api/v1/targets/{target_plan.id}/completion")

        assert response.status_code == 200
        data = response.json()
        assert "target_plan_id" in data
        assert "completion_percentages" in data
        completion = data["completion_percentages"]
        assert completion["performance"] == 50.0
        assert completion["opportunity"] == 50.0
        assert completion["project_count"] == 50.0
        assert completion["average"] == 50.0

    def test_get_completion_percentage_not_found(self, client: TestClient):
        """Test getting completion for non-existent target plan"""
        non_existent_id = str(uuid.uuid4())

        response = client.get(f"/api/v1/targets/{non_existent_id}/completion")

        assert response.status_code == 404
