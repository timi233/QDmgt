"""
Integration Tests for Assignments API

This module tests the assignments API endpoints end-to-end.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from backend.src.models.channel import Channel
from backend.src.models.user import User
from backend.src.models.assignment import ChannelAssignment, PermissionLevel


# =============================================================================
# Create Assignment Tests
# =============================================================================

@pytest.mark.integration
class TestCreateAssignmentAPI:
    """Test POST /assignments endpoint"""

    def test_create_assignment_success(self, client: TestClient, test_user: User, test_channel: Channel):
        """Test successful assignment creation"""
        response = client.post(
            "/api/v1/assignments/",
            json={
                "user_id": str(test_user.id),
                "channel_id": str(test_channel.id),
                "permission_level": "read",
                "target_responsibility": False
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == str(test_user.id)
        assert data["channel_id"] == str(test_channel.id)
        assert data["permission_level"] == "read"
        assert data["target_responsibility"] is False
        assert "id" in data
        assert "assigned_at" in data

    def test_create_assignment_with_write_permission(self, client: TestClient, test_manager: User, test_channel: Channel):
        """Test creating assignment with write permission"""
        response = client.post(
            "/api/v1/assignments/",
            json={
                "user_id": str(test_manager.id),
                "channel_id": str(test_channel.id),
                "permission_level": "write",
                "target_responsibility": True
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["permission_level"] == "write"
        assert data["target_responsibility"] is True

    def test_create_assignment_user_not_found(self, client: TestClient, test_channel: Channel):
        """Test creating assignment with non-existent user fails"""
        non_existent_user_id = str(uuid.uuid4())

        response = client.post(
            "/api/v1/assignments/",
            json={
                "user_id": non_existent_user_id,
                "channel_id": str(test_channel.id),
                "permission_level": "read",
                "target_responsibility": False
            }
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_create_assignment_channel_not_found(self, client: TestClient, test_user: User):
        """Test creating assignment with non-existent channel fails"""
        non_existent_channel_id = str(uuid.uuid4())

        response = client.post(
            "/api/v1/assignments/",
            json={
                "user_id": str(test_user.id),
                "channel_id": non_existent_channel_id,
                "permission_level": "read",
                "target_responsibility": False
            }
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_create_assignment_duplicate(self, client: TestClient, test_user: User, test_channel: Channel):
        """Test creating duplicate assignment fails"""
        # Create first assignment
        client.post(
            "/api/v1/assignments/",
            json={
                "user_id": str(test_user.id),
                "channel_id": str(test_channel.id),
                "permission_level": "read",
                "target_responsibility": False
            }
        )

        # Try to create duplicate
        response = client.post(
            "/api/v1/assignments/",
            json={
                "user_id": str(test_user.id),
                "channel_id": str(test_channel.id),
                "permission_level": "write",
                "target_responsibility": True
            }
        )

        assert response.status_code == 409
        assert "already assigned" in response.json()["detail"].lower()


# =============================================================================
# Get Assignment Tests
# =============================================================================

@pytest.mark.integration
class TestGetAssignmentAPI:
    """Test GET /assignments/{id} endpoint"""

    def test_get_assignment_success(self, client: TestClient, db_session: Session, test_user: User, test_channel: Channel):
        """Test getting existing assignment"""
        from backend.src.services.assignment_service import AssignmentService

        # Create an assignment
        assignment = AssignmentService.create_assignment(
            db=db_session,
            user_id=uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            permission_level=PermissionLevel.read,
            assigned_by=uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id,
            target_responsibility=False
        )

        response = client.get(f"/api/v1/assignments/{assignment.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(assignment.id)
        assert data["user_id"] == str(test_user.id)
        assert data["channel_id"] == str(test_channel.id)

    def test_get_assignment_not_found(self, client: TestClient):
        """Test getting non-existent assignment"""
        non_existent_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/assignments/{non_existent_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_get_assignment_invalid_uuid(self, client: TestClient):
        """Test getting assignment with invalid UUID"""
        response = client.get("/api/v1/assignments/not-a-uuid")

        assert response.status_code == 422


# =============================================================================
# Get Assignments by User Tests
# =============================================================================

@pytest.mark.integration
class TestGetAssignmentsByUserAPI:
    """Test GET /assignments/user/{user_id} endpoint"""

    def test_get_assignments_by_user_no_pagination(self, client: TestClient, db_session: Session, test_user: User, test_admin: User):
        """Test getting all assignments for a user"""
        from backend.src.services.assignment_service import AssignmentService
        from backend.src.services.channel_service import ChannelService
        from backend.src.models.channel import ChannelStatus, BusinessType

        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create multiple channels and assign them to the user
        for i in range(3):
            channel = ChannelService.create_channel(
                db=db_session,
                name=f"User Assignment Channel {i}",
                description=f"Test channel {i}",
                status=ChannelStatus.active,
                business_type=BusinessType.basic,
                contact_email=None,
                contact_phone=None,
                created_by=admin_id
            )

            AssignmentService.create_assignment(
                db=db_session,
                user_id=user_id,
                channel_id=uuid.UUID(channel.id) if isinstance(channel.id, str) else channel.id,
                permission_level=PermissionLevel.read,
                assigned_by=admin_id,
                target_responsibility=False
            )

        response = client.get(f"/api/v1/assignments/user/{test_user.id}")

        assert response.status_code == 200
        data = response.json()
        assert "assignments" in data
        assert "total" in data
        assert data["total"] >= 3
        assert len(data["assignments"]) >= 3

    def test_get_assignments_by_user_with_pagination(self, client: TestClient, db_session: Session, test_manager: User, test_admin: User):
        """Test pagination works correctly"""
        from backend.src.services.assignment_service import AssignmentService
        from backend.src.services.channel_service import ChannelService
        from backend.src.models.channel import ChannelStatus, BusinessType

        manager_id = uuid.UUID(test_manager.id) if isinstance(test_manager.id, str) else test_manager.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create 5 channels and assign them
        for i in range(5):
            channel = ChannelService.create_channel(
                db=db_session,
                name=f"Pagination Assignment Channel {i}",
                description=f"Test channel {i}",
                status=ChannelStatus.active,
                business_type=BusinessType.basic,
                contact_email=None,
                contact_phone=None,
                created_by=admin_id
            )

            AssignmentService.create_assignment(
                db=db_session,
                user_id=manager_id,
                channel_id=uuid.UUID(channel.id) if isinstance(channel.id, str) else channel.id,
                permission_level=PermissionLevel.write,
                assigned_by=admin_id,
                target_responsibility=False
            )

        # Get first page
        response = client.get(f"/api/v1/assignments/user/{test_manager.id}?skip=0&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["assignments"]) == 2
        assert data["total"] >= 5

        # Get second page
        response = client.get(f"/api/v1/assignments/user/{test_manager.id}?skip=2&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["assignments"]) == 2


# =============================================================================
# Get Assignments by Channel Tests
# =============================================================================

@pytest.mark.integration
class TestGetAssignmentsByChannelAPI:
    """Test GET /assignments/channel/{channel_id} endpoint"""

    def test_get_assignments_by_channel(self, client: TestClient, db_session: Session, test_channel: Channel, test_user: User, test_manager: User, test_admin: User):
        """Test getting all assignments for a channel"""
        from backend.src.services.assignment_service import AssignmentService

        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Assign multiple users to the same channel
        for user in [test_user, test_manager]:
            user_id = uuid.UUID(user.id) if isinstance(user.id, str) else user.id
            AssignmentService.create_assignment(
                db=db_session,
                user_id=user_id,
                channel_id=channel_id,
                permission_level=PermissionLevel.read,
                assigned_by=admin_id,
                target_responsibility=False
            )

        response = client.get(f"/api/v1/assignments/channel/{test_channel.id}")

        assert response.status_code == 200
        data = response.json()
        assert "assignments" in data
        assert data["total"] >= 2
        assert len(data["assignments"]) >= 2
        assert all(a["channel_id"] == str(test_channel.id) for a in data["assignments"])


# =============================================================================
# Update Assignment Tests
# =============================================================================

@pytest.mark.integration
class TestUpdateAssignmentAPI:
    """Test PUT /assignments/{id} endpoint"""

    def test_update_assignment_success(self, client: TestClient, db_session: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test successful assignment update"""
        from backend.src.services.assignment_service import AssignmentService

        # Create an assignment
        assignment = AssignmentService.create_assignment(
            db=db_session,
            user_id=uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            permission_level=PermissionLevel.read,
            assigned_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id,
            target_responsibility=False
        )

        response = client.put(
            f"/api/v1/assignments/{assignment.id}",
            json={
                "permission_level": "write",
                "target_responsibility": True
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["permission_level"] == "write"
        assert data["target_responsibility"] is True

    def test_update_assignment_partial(self, client: TestClient, db_session: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test partial assignment update"""
        from backend.src.services.assignment_service import AssignmentService

        assignment = AssignmentService.create_assignment(
            db=db_session,
            user_id=uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            permission_level=PermissionLevel.read,
            assigned_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id,
            target_responsibility=False
        )

        response = client.put(
            f"/api/v1/assignments/{assignment.id}",
            json={
                "target_responsibility": True
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["permission_level"] == "read"  # Unchanged
        assert data["target_responsibility"] is True

    def test_update_assignment_not_found(self, client: TestClient):
        """Test updating non-existent assignment"""
        non_existent_id = str(uuid.uuid4())

        response = client.put(
            f"/api/v1/assignments/{non_existent_id}",
            json={"permission_level": "admin"}
        )

        assert response.status_code == 404


# =============================================================================
# Delete Assignment Tests
# =============================================================================

@pytest.mark.integration
class TestDeleteAssignmentAPI:
    """Test DELETE /assignments/{id} endpoint"""

    def test_delete_assignment_success(self, client: TestClient, db_session: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test successful assignment deletion"""
        from backend.src.services.assignment_service import AssignmentService

        # Create an assignment to delete
        assignment = AssignmentService.create_assignment(
            db=db_session,
            user_id=uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            permission_level=PermissionLevel.read,
            assigned_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id,
            target_responsibility=False
        )

        response = client.delete(f"/api/v1/assignments/{assignment.id}")

        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

        # Verify assignment is deleted
        verify_response = client.get(f"/api/v1/assignments/{assignment.id}")
        assert verify_response.status_code == 404

    def test_delete_assignment_not_found(self, client: TestClient):
        """Test deleting non-existent assignment"""
        non_existent_id = str(uuid.uuid4())

        response = client.delete(f"/api/v1/assignments/{non_existent_id}")

        assert response.status_code == 404


# =============================================================================
# Permission Check Tests
# =============================================================================

@pytest.mark.integration
class TestPermissionCheckAPI:
    """Test GET /assignments/{id}/permission-check/{required_permission} endpoint"""

    def test_permission_check_has_permission(self, client: TestClient, db_session: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test permission check when user has required permission"""
        from backend.src.services.assignment_service import AssignmentService

        # Create assignment with write permission
        assignment = AssignmentService.create_assignment(
            db=db_session,
            user_id=uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            permission_level=PermissionLevel.write,
            assigned_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id,
            target_responsibility=False
        )

        # Check if user has read permission (should pass since write >= read)
        response = client.get(f"/api/v1/assignments/{assignment.id}/permission-check/read")

        assert response.status_code == 200
        data = response.json()
        assert data["has_permission"] is True
        assert data["user_permission"] == "write"

    def test_permission_check_no_permission(self, client: TestClient, db_session: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test permission check when user doesn't have required permission"""
        from backend.src.services.assignment_service import AssignmentService

        # Create assignment with read permission
        assignment = AssignmentService.create_assignment(
            db=db_session,
            user_id=uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            permission_level=PermissionLevel.read,
            assigned_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id,
            target_responsibility=False
        )

        # Check if user has admin permission (should fail since read < admin)
        response = client.get(f"/api/v1/assignments/{assignment.id}/permission-check/admin")

        assert response.status_code == 200
        data = response.json()
        assert data["has_permission"] is False
        assert data["user_permission"] == "read"

    def test_permission_check_assignment_not_found(self, client: TestClient):
        """Test permission check for non-existent assignment"""
        non_existent_id = str(uuid.uuid4())

        response = client.get(f"/api/v1/assignments/{non_existent_id}/permission-check/read")

        assert response.status_code == 404

    def test_permission_check_invalid_permission(self, client: TestClient, db_session: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test permission check with invalid permission level"""
        from backend.src.services.assignment_service import AssignmentService

        assignment = AssignmentService.create_assignment(
            db=db_session,
            user_id=uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id,
            channel_id=uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id,
            permission_level=PermissionLevel.read,
            assigned_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id,
            target_responsibility=False
        )

        response = client.get(f"/api/v1/assignments/{assignment.id}/permission-check/invalid")

        assert response.status_code == 422
