"""
Integration Tests for Targets API

This module tests the targets API endpoints end-to-end.
"""

import pytest
from fastapi.testclient import TestClient
import uuid

from backend.src.models.channel import Channel


# =============================================================================
# Create Target Plan Tests
# =============================================================================

@pytest.mark.integration
class TestCreateTargetPlanAPI:
    """Test POST /targets endpoint"""

    def test_create_target_plan_success(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
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
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 200
        data = response.json()
        assert data["channel_id"] == str(test_channel.id)
        assert data["year"] == 2024
        assert data["quarter"] == 1
        assert data["performance_target"] == "100000.00"
        assert "id" in data
        assert "created_at" in data

    def test_create_target_plan_with_month(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
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
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 200
        data = response.json()
        assert data["month"] == 6
        assert data["quarter"] == 2

    def test_create_target_plan_invalid_quarter(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test creating target plan with invalid quarter fails"""
        response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 5,  # Invalid: must be 1-4
                "performance_target": "100000.00"
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 422
        assert "Quarter must be between 1 and 4" in response.json()["detail"]

    def test_create_target_plan_invalid_month(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test creating target plan with invalid month fails"""
        response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 1,
                "month": 13,  # Invalid: must be 1-12
                "performance_target": "100000.00"
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 422
        assert "Month must be between 1 and 12" in response.json()["detail"]

    def test_create_target_plan_duplicate(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test creating duplicate target plan fails"""
        # Create first target plan
        first_response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 3,
                "performance_target": "100000.00"
            },
            headers=auth_headers_admin
        )
        assert first_response.status_code == 200

        # Try to create duplicate
        response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 3,
                "performance_target": "200000.00"
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]


# =============================================================================
# Get Target Plan Tests
# =============================================================================

@pytest.mark.integration
class TestGetTargetPlanAPI:
    """Test GET /targets/{id} endpoint"""

    def test_get_target_plan_success(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test getting existing target plan"""
        create_response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 1,
                "performance_target": "100000.00",
                "opportunity_target": "50000.00",
                "project_count_target": 10,
                "development_goal": "Test goal"
            },
            headers=auth_headers_admin
        )
        assert create_response.status_code == 200
        target_plan = create_response.json()

        response = client.get(f"/api/v1/targets/{target_plan['id']}", headers=auth_headers_admin)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == target_plan["id"]
        assert data["channel_id"] == str(test_channel.id)
        assert data["year"] == 2024
        assert data["quarter"] == 1

    def test_get_target_plan_not_found(self, client: TestClient, auth_headers_admin: dict):
        """Test getting non-existent target plan"""
        non_existent_id = str(uuid.uuid4())
        response = client.get(
            f"/api/v1/targets/{non_existent_id}",
            headers=auth_headers_admin
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_get_target_plan_invalid_uuid(self, client: TestClient, auth_headers_admin: dict):
        """Test getting target plan with invalid UUID"""
        response = client.get(
            "/api/v1/targets/not-a-uuid",
            headers=auth_headers_admin
        )

        assert response.status_code == 422


# =============================================================================
# Get Target Plans by Channel Tests
# =============================================================================

@pytest.mark.integration
class TestGetTargetPlansByChannelAPI:
    """Test GET /targets/channel/{channel_id} endpoint"""

    def test_get_target_plans_by_channel_no_filters(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test getting all target plans for a channel"""
        # Create multiple target plans via API
        for quarter in [1, 2]:
            response = client.post(
                "/api/v1/targets/",
                json={
                    "channel_id": str(test_channel.id),
                    "year": 2024,
                    "quarter": quarter,
                    "performance_target": "100000.00"
                },
                headers=auth_headers_admin
            )
            assert response.status_code == 200

        response = client.get(f"/api/v1/targets/channel/{test_channel.id}", headers=auth_headers_admin)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        assert all(tp["channel_id"] == str(test_channel.id) for tp in data)

    def test_get_target_plans_by_channel_filter_year(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test filtering target plans by year"""
        # Create target plans for different years via API
        response_2023 = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2023,
                "quarter": 4,
                "performance_target": "50000.00"
            },
            headers=auth_headers_admin
        )
        assert response_2023.status_code == 200

        response_2024 = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 1,
                "performance_target": "100000.00"
            },
            headers=auth_headers_admin
        )
        assert response_2024.status_code == 200

        response = client.get(
            f"/api/v1/targets/channel/{test_channel.id}?year=2024",
            headers=auth_headers_admin
        )

        assert response.status_code == 200
        data = response.json()
        assert all(tp["year"] == 2024 for tp in data)

    def test_get_target_plans_by_channel_filter_quarter(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test filtering target plans by quarter"""
        # Create target plans for different quarters via API
        for quarter in [1, 2, 3]:
            response = client.post(
                "/api/v1/targets/",
                json={
                    "channel_id": str(test_channel.id),
                    "year": 2024,
                    "quarter": quarter,
                    "performance_target": "100000.00"
                },
                headers=auth_headers_admin
            )
            assert response.status_code == 200

        response = client.get(
            f"/api/v1/targets/channel/{test_channel.id}?quarter=2",
            headers=auth_headers_admin
        )

        assert response.status_code == 200
        data = response.json()
        assert all(tp["quarter"] == 2 for tp in data)


# =============================================================================
# Update Target Plan Tests
# =============================================================================

@pytest.mark.integration
class TestUpdateTargetPlanAPI:
    """Test PUT /targets/{id} endpoint"""

    def test_update_target_plan_success(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test successful target plan update"""
        create_response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 1,
                "performance_target": "100000.00",
                "opportunity_target": "50000.00",
                "project_count_target": 10,
                "development_goal": "Original goal"
            },
            headers=auth_headers_admin
        )
        assert create_response.status_code == 200
        target_plan = create_response.json()

        response = client.put(
            f"/api/v1/targets/{target_plan['id']}",
            json={
                "performance_target": "150000.00",
                "development_goal": "Updated goal"
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 200
        data = response.json()
        assert data["performance_target"] == "150000.00"
        assert data["development_goal"] == "Updated goal"

    def test_update_target_plan_partial(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test partial target plan update"""
        create_response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 2,
                "performance_target": "100000.00",
                "opportunity_target": "50000.00",
                "project_count_target": 10,
                "development_goal": "Original goal"
            },
            headers=auth_headers_admin
        )
        assert create_response.status_code == 200
        target_plan = create_response.json()

        response = client.put(
            f"/api/v1/targets/{target_plan['id']}",
            json={
                "development_goal": "Only goal updated"
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 200
        data = response.json()
        assert data["performance_target"] == target_plan["performance_target"]
        assert data["development_goal"] == "Only goal updated"

    def test_update_target_plan_not_found(self, client: TestClient, auth_headers_admin: dict):
        """Test updating non-existent target plan"""
        non_existent_id = str(uuid.uuid4())

        response = client.put(
            f"/api/v1/targets/{non_existent_id}",
            json={"performance_target": "100000.00"},
            headers=auth_headers_admin
        )

        assert response.status_code == 404


# =============================================================================
# Update Target Achievement Tests
# =============================================================================

@pytest.mark.integration
class TestUpdateTargetAchievementAPI:
    """Test PATCH /targets/{id}/achievement endpoint"""

    def test_update_target_achievement_success(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test successful achievement update"""
        create_response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 1,
                "performance_target": "100000.00",
                "opportunity_target": "50000.00",
                "project_count_target": 10,
                "development_goal": "Test goal"
            },
            headers=auth_headers_admin
        )
        assert create_response.status_code == 200
        target_plan = create_response.json()

        response = client.patch(
            f"/api/v1/targets/{target_plan['id']}/achievement",
            json={
                "achieved_performance": "75000.00",
                "achieved_opportunity": "30000.00",
                "achieved_project_count": 7
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 200
        data = response.json()
        assert data["achieved_performance"] == "75000.00"
        assert data["achieved_opportunity"] == "30000.00"
        assert data["achieved_project_count"] == 7

    def test_update_target_achievement_partial(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test partial achievement update"""
        create_response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 2,
                "performance_target": "100000.00",
                "opportunity_target": "50000.00",
                "project_count_target": 10,
                "development_goal": "Test goal"
            },
            headers=auth_headers_admin
        )
        assert create_response.status_code == 200
        target_plan = create_response.json()

        response = client.patch(
            f"/api/v1/targets/{target_plan['id']}/achievement",
            json={
                "achieved_performance": "50000.00"
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 200
        data = response.json()
        assert data["achieved_performance"] == "50000.00"

    def test_update_target_achievement_not_found(self, client: TestClient, auth_headers_admin: dict):
        """Test updating achievement for non-existent target plan"""
        non_existent_id = str(uuid.uuid4())

        response = client.patch(
            f"/api/v1/targets/{non_existent_id}/achievement",
            json={"achieved_performance": "50000.00"},
            headers=auth_headers_admin
        )

        assert response.status_code == 404


# =============================================================================
# Get Completion Percentage Tests
# =============================================================================

@pytest.mark.integration
class TestGetCompletionPercentageAPI:
    """Test GET /targets/{id}/completion endpoint"""

    def test_get_completion_percentage_success(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test getting completion percentage"""
        # Create target plan with targets
        create_response = client.post(
            "/api/v1/targets/",
            json={
                "channel_id": str(test_channel.id),
                "year": 2024,
                "quarter": 1,
                "performance_target": "100000.00",
                "opportunity_target": "50000.00",
                "project_count_target": 10,
                "development_goal": "Test goal"
            },
            headers=auth_headers_admin
        )
        assert create_response.status_code == 200
        target_plan = create_response.json()

        # Update achievements via API
        achievement_response = client.patch(
            f"/api/v1/targets/{target_plan['id']}/achievement",
            json={
                "achieved_performance": "50000.00",
                "achieved_opportunity": "25000.00",
                "achieved_project_count": 5
            },
            headers=auth_headers_admin
        )
        assert achievement_response.status_code == 200

        response = client.get(f"/api/v1/targets/{target_plan['id']}/completion", headers=auth_headers_admin)

        assert response.status_code == 200
        data = response.json()
        assert "target_plan_id" in data
        assert "completion_percentages" in data
        completion = data["completion_percentages"]
        assert completion["core_performance"] == 50.0
        assert completion["core_opportunity"] == 50.0
        assert completion["new_signing"] == 50.0
        assert completion["high_value_performance"] == 0.0
        assert completion["high_value_opportunity"] == 0.0
        assert completion["overall"] == 50.0

    def test_get_completion_percentage_not_found(self, client: TestClient, auth_headers_admin: dict):
        """Test getting completion for non-existent target plan"""
        non_existent_id = str(uuid.uuid4())

        response = client.get(
            f"/api/v1/targets/{non_existent_id}/completion",
            headers=auth_headers_admin
        )

        assert response.status_code == 404
