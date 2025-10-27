"""
Integration Tests for Channels API

This module tests the channels API endpoints end-to-end.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from backend.src.models.channel import Channel, ChannelStatus, BusinessType
from backend.src.models.user import User


# =============================================================================
# Create Channel Tests
# =============================================================================

@pytest.mark.integration
class TestCreateChannelAPI:
    """Test POST /channels endpoint"""

    def test_create_channel_success(self, client: TestClient, auth_headers_admin: dict):
        """Test successful channel creation"""
        response = client.post(
            "/api/v1/channels/",
            json={
                "name": "New API Channel",
                "description": "Created via API",
                "status": "active",
                "business_type": "basic",
                "contact_email": "api@example.com",
                "contact_phone": "+1234567890"
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New API Channel"
        assert data["description"] == "Created via API"
        assert data["status"] == "active"
        assert data["business_type"] == "basic"
        assert "id" in data
        assert "created_at" in data

    def test_create_channel_minimal_fields(self, client: TestClient, auth_headers_admin: dict):
        """Test channel creation with minimal required fields"""
        response = client.post(
            "/api/v1/channels/",
            json={
                "name": "Minimal Channel",
                "status": "active",
                "business_type": "basic"
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Minimal Channel"
        assert data["description"] is None
        assert data["contact_email"] is None

    def test_create_channel_duplicate_name(self, client: TestClient, auth_headers_admin: dict, test_channel: Channel):
        """Test creating channel with duplicate name fails"""
        response = client.post(
            "/api/v1/channels/",
            json={
                "name": test_channel.name,
                "status": "active",
                "business_type": "basic"
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    def test_create_channel_invalid_email(self, client: TestClient, auth_headers_admin: dict):
        """Test creating channel with invalid email fails"""
        response = client.post(
            "/api/v1/channels/",
            json={
                "name": "Invalid Email Channel",
                "status": "active",
                "business_type": "basic",
                "contact_email": "not-an-email"
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 422

    def test_create_channel_unauthorized(self, client: TestClient):
        """Test channel creation without authentication fails"""
        response = client.post(
            "/api/v1/channels/",
            json={
                "name": "Unauthorized Channel",
                "status": "active",
                "business_type": "basic"
            }
        )

        assert response.status_code == 401  # No auth token = 401 Unauthorized


# =============================================================================
# Get Channel Tests
# =============================================================================

@pytest.mark.integration
class TestGetChannelAPI:
    """Test GET /channels/{id} endpoint"""

    def test_get_channel_success(self, client: TestClient, test_channel: Channel):
        """Test getting existing channel"""
        response = client.get(f"/api/v1/channels/{test_channel.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_channel.id)
        assert data["name"] == test_channel.name
        assert data["status"] == test_channel.status.value

    def test_get_channel_not_found(self, client: TestClient):
        """Test getting non-existent channel"""
        non_existent_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/channels/{non_existent_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_get_channel_invalid_uuid(self, client: TestClient):
        """Test getting channel with invalid UUID"""
        response = client.get("/api/v1/channels/not-a-uuid")

        assert response.status_code == 422


# =============================================================================
# List Channels Tests
# =============================================================================

@pytest.mark.integration
class TestListChannelsAPI:
    """Test GET /channels endpoint"""

    def test_list_channels_no_filters(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test listing all channels"""
        response = client.get("/api/v1/channels/", headers=auth_headers_admin)

        assert response.status_code == 200
        data = response.json()
        assert "channels" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        assert "pages" in data
        assert data["total"] >= 1
        assert len(data["channels"]) >= 1

    def test_list_channels_with_pagination(self, client: TestClient, db_session: Session, test_admin: User, auth_headers_admin: dict):
        """Test pagination works correctly"""
        # Create multiple channels
        from backend.src.services.channel_service import ChannelService

        for i in range(5):
            ChannelService.create_channel(
                db=db_session,
                name=f"Pagination Channel {i}",
                description=f"Description {i}",
                status=ChannelStatus.active,
                business_type=BusinessType.basic,
                contact_person=None,
                contact_email=None,
                contact_phone=None,
                created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
            )

        # Get first page
        response = client.get("/api/v1/channels/?skip=0&limit=2", headers=auth_headers_admin)
        assert response.status_code == 200
        data = response.json()
        assert len(data["channels"]) == 2
        assert data["total"] >= 5

        # Get second page
        response = client.get("/api/v1/channels/?skip=2&limit=2", headers=auth_headers_admin)
        assert response.status_code == 200
        data = response.json()
        assert len(data["channels"]) == 2

    def test_list_channels_filter_by_status(self, client: TestClient, db_session: Session, test_admin: User, auth_headers_admin: dict):
        """Test filtering channels by status"""
        from backend.src.services.channel_service import ChannelService

        # Create channels with different statuses
        ChannelService.create_channel(
            db=db_session,
            name="Active Filter Channel",
            description="Test",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            contact_person=None,
            contact_email=None,
            contact_phone=None,
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )
        ChannelService.create_channel(
            db=db_session,
            name="Inactive Filter Channel",
            description="Test",
            status=ChannelStatus.inactive,
            business_type=BusinessType.basic,
            contact_person=None,
            contact_email=None,
            contact_phone=None,
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        # Filter by active
        response = client.get("/api/v1/channels/?status=active", headers=auth_headers_admin)
        assert response.status_code == 200
        data = response.json()
        assert all(c["status"] == "active" for c in data["channels"])

    def test_list_channels_search(self, client: TestClient, db_session: Session, test_admin: User, auth_headers_admin: dict):
        """Test searching channels by name"""
        from backend.src.services.channel_service import ChannelService

        ChannelService.create_channel(
            db=db_session,
            name="Apple Store Search",
            description="Fruit store",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            contact_person=None,
            contact_email=None,
            contact_phone=None,
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        response = client.get("/api/v1/channels/?search=Apple", headers=auth_headers_admin)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert any("Apple" in c["name"] for c in data["channels"])


# =============================================================================
# Update Channel Tests
# =============================================================================

@pytest.mark.integration
class TestUpdateChannelAPI:
    """Test PUT /channels/{id} endpoint"""

    def test_update_channel_success(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test successful channel update"""
        response = client.put(
            f"/api/v1/channels/{test_channel.id}",
            json={
                "name": "Updated Channel Name",
                "description": "Updated description",
                "status": "inactive"
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Channel Name"
        assert data["description"] == "Updated description"
        assert data["status"] == "inactive"

    def test_update_channel_partial(self, client: TestClient, test_channel: Channel, auth_headers_admin: dict):
        """Test partial channel update"""
        original_name = test_channel.name

        response = client.put(
            f"/api/v1/channels/{test_channel.id}",
            json={
                "description": "Only description updated"
            },
            headers=auth_headers_admin
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == original_name
        assert data["description"] == "Only description updated"

    def test_update_channel_not_found(self, client: TestClient, auth_headers_admin: dict):
        """Test updating non-existent channel"""
        non_existent_id = str(uuid.uuid4())

        response = client.put(
            f"/api/v1/channels/{non_existent_id}",
            json={"name": "Updated Name"},
            headers=auth_headers_admin
        )

        assert response.status_code == 404

    def test_update_channel_unauthorized(self, client: TestClient, test_channel: Channel):
        """Test channel update without authentication fails"""
        response = client.put(
            f"/api/v1/channels/{test_channel.id}",
            json={"name": "Unauthorized Update"}
        )

        assert response.status_code == 401  # No auth token = 401 Unauthorized


# =============================================================================
# Delete Channel Tests
# =============================================================================

@pytest.mark.integration
class TestDeleteChannelAPI:
    """Test DELETE /channels/{id} endpoint"""

    def test_delete_channel_success(self, client: TestClient, db_session: Session, test_admin: User, auth_headers_admin: dict):
        """Test successful channel deletion"""
        from backend.src.services.channel_service import ChannelService

        # Create a channel to delete
        channel = ChannelService.create_channel(
            db=db_session,
            name="To Delete Channel",
            description="Will be deleted",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            contact_person=None,
            contact_email=None,
            contact_phone=None,
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )
        channel_id = channel.id  # Save ID before deletion to avoid DetachedInstanceError

        response = client.delete(f"/api/v1/channels/{channel_id}", headers=auth_headers_admin)

        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

        # Verify channel is deleted
        verify_response = client.get(f"/api/v1/channels/{channel_id}", headers=auth_headers_admin)
        assert verify_response.status_code == 404

    def test_delete_channel_not_found(self, client: TestClient, auth_headers_admin: dict):
        """Test deleting non-existent channel"""
        non_existent_id = str(uuid.uuid4())

        response = client.delete(f"/api/v1/channels/{non_existent_id}", headers=auth_headers_admin)

        assert response.status_code == 404
