"""
Unit Tests for AssignmentService

This module tests the assignment service business logic.
"""

import pytest
from sqlalchemy.orm import Session
import uuid

from backend.src.services.assignment_service import AssignmentService
from backend.src.models.assignment import ChannelAssignment, PermissionLevel
from backend.src.models.channel import Channel
from backend.src.models.user import User
from backend.src.utils.exceptions import NotFoundError, ConflictError


# =============================================================================
# Create Assignment Tests
# =============================================================================

@pytest.mark.unit
class TestCreateAssignment:
    """Test AssignmentService.create_assignment"""

    def test_create_assignment_success(self, db: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test successful assignment creation"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        assignment = AssignmentService.create_assignment(
            db=db,
            user_id=user_id,
            channel_id=channel_id,
            permission_level=PermissionLevel.read,
            assigned_by=admin_id,
            target_responsibility=False
        )

        assert assignment.id is not None
        assert assignment.user_id == user_id
        assert assignment.channel_id == channel_id
        assert assignment.permission_level == PermissionLevel.read
        assert assignment.assigned_by == admin_id
        assert assignment.target_responsibility is False

    def test_create_assignment_with_write_permission(self, db: Session, test_manager: User, test_channel: Channel, test_admin: User):
        """Test creating assignment with write permission"""
        manager_id = uuid.UUID(test_manager.id) if isinstance(test_manager.id, str) else test_manager.id
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        assignment = AssignmentService.create_assignment(
            db=db,
            user_id=manager_id,
            channel_id=channel_id,
            permission_level=PermissionLevel.write,
            assigned_by=admin_id,
            target_responsibility=True
        )

        assert assignment.permission_level == PermissionLevel.write
        assert assignment.target_responsibility is True

    def test_create_assignment_user_not_found(self, db: Session, test_channel: Channel, test_admin: User):
        """Test creating assignment with non-existent user fails"""
        non_existent_user_id = uuid.uuid4()
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        with pytest.raises(NotFoundError) as exc_info:
            AssignmentService.create_assignment(
                db=db,
                user_id=non_existent_user_id,
                channel_id=channel_id,
                permission_level=PermissionLevel.read,
                assigned_by=admin_id,
                target_responsibility=False
            )

        assert "not found" in exc_info.value.detail.lower()

    def test_create_assignment_channel_not_found(self, db: Session, test_user: User, test_admin: User):
        """Test creating assignment with non-existent channel fails"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        non_existent_channel_id = uuid.uuid4()
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        with pytest.raises(NotFoundError) as exc_info:
            AssignmentService.create_assignment(
                db=db,
                user_id=user_id,
                channel_id=non_existent_channel_id,
                permission_level=PermissionLevel.read,
                assigned_by=admin_id,
                target_responsibility=False
            )

        assert "not found" in exc_info.value.detail.lower()

    def test_create_assignment_duplicate(self, db: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test creating duplicate assignment fails"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create first assignment
        AssignmentService.create_assignment(
            db=db,
            user_id=user_id,
            channel_id=channel_id,
            permission_level=PermissionLevel.read,
            assigned_by=admin_id,
            target_responsibility=False
        )

        # Try to create duplicate
        with pytest.raises(ConflictError) as exc_info:
            AssignmentService.create_assignment(
                db=db,
                user_id=user_id,
                channel_id=channel_id,
                permission_level=PermissionLevel.write,
                assigned_by=admin_id,
                target_responsibility=True
            )

        assert "already assigned" in exc_info.value.detail.lower()


# =============================================================================
# Get Assignment Tests
# =============================================================================

@pytest.mark.unit
class TestGetAssignment:
    """Test AssignmentService.get_assignment_by_id"""

    def test_get_assignment_success(self, db: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test getting existing assignment"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create an assignment
        created = AssignmentService.create_assignment(
            db=db,
            user_id=user_id,
            channel_id=channel_id,
            permission_level=PermissionLevel.read,
            assigned_by=admin_id,
            target_responsibility=False
        )

        # Get the assignment
        assignment_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        retrieved = AssignmentService.get_assignment_by_id(db, assignment_id)

        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.user_id == created.user_id
        assert retrieved.channel_id == created.channel_id

    def test_get_assignment_not_found(self, db: Session):
        """Test getting non-existent assignment returns None"""
        non_existent_id = uuid.uuid4()
        result = AssignmentService.get_assignment_by_id(db, non_existent_id)

        assert result is None


# =============================================================================
# Get Assignments by User Tests
# =============================================================================

@pytest.mark.unit
class TestGetAssignmentsByUser:
    """Test AssignmentService.get_assignments_by_user"""

    def test_get_assignments_by_user_no_pagination(self, db: Session, test_user: User, test_admin: User):
        """Test getting all assignments for a user"""
        from backend.src.services.channel_service import ChannelService
        from backend.src.models.channel import ChannelStatus, BusinessType

        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create multiple channels and assign them to the user
        for i in range(3):
            channel = ChannelService.create_channel(
                db=db,
                name=f"User Assignment Test Channel {i}",
                description=f"Test channel {i}",
                status=ChannelStatus.active,
                business_type=BusinessType.basic,
                contact_person=None,
                contact_email=None,
                contact_phone=None,
                created_by=admin_id
            )

            channel_id = uuid.UUID(channel.id) if isinstance(channel.id, str) else channel.id
            AssignmentService.create_assignment(
                db=db,
                user_id=user_id,
                channel_id=channel_id,
                permission_level=PermissionLevel.read,
                assigned_by=admin_id,
                target_responsibility=False
            )

        result = AssignmentService.get_assignments_by_user(db, user_id, skip=0, limit=100)

        assert result["total"] >= 3
        assert len(result["assignments"]) >= 3
        assert all(a.user_id == user_id for a in result["assignments"])

    def test_get_assignments_by_user_with_pagination(self, db: Session, test_manager: User, test_admin: User):
        """Test pagination works correctly"""
        from backend.src.services.channel_service import ChannelService
        from backend.src.models.channel import ChannelStatus, BusinessType

        manager_id = uuid.UUID(test_manager.id) if isinstance(test_manager.id, str) else test_manager.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create 5 channels and assign them
        for i in range(5):
            channel = ChannelService.create_channel(
                db=db,
                name=f"Pagination Test Channel {i}",
                description=f"Test channel {i}",
                status=ChannelStatus.active,
                business_type=BusinessType.basic,
                contact_person=None,
                contact_email=None,
                contact_phone=None,
                created_by=admin_id
            )

            channel_id = uuid.UUID(channel.id) if isinstance(channel.id, str) else channel.id
            AssignmentService.create_assignment(
                db=db,
                user_id=manager_id,
                channel_id=channel_id,
                permission_level=PermissionLevel.write,
                assigned_by=admin_id,
                target_responsibility=False
            )

        # Get first page
        result1 = AssignmentService.get_assignments_by_user(db, manager_id, skip=0, limit=2)
        assert len(result1["assignments"]) == 2
        assert result1["total"] >= 5

        # Get second page
        result2 = AssignmentService.get_assignments_by_user(db, manager_id, skip=2, limit=2)
        assert len(result2["assignments"]) == 2


# =============================================================================
# Get Assignments by Channel Tests
# =============================================================================

@pytest.mark.unit
class TestGetAssignmentsByChannel:
    """Test AssignmentService.get_assignments_by_channel"""

    def test_get_assignments_by_channel(self, db: Session, test_channel: Channel, test_user: User, test_manager: User, test_admin: User):
        """Test getting all assignments for a channel"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Assign multiple users to the same channel
        for user in [test_user, test_manager]:
            user_id = uuid.UUID(user.id) if isinstance(user.id, str) else user.id
            AssignmentService.create_assignment(
                db=db,
                user_id=user_id,
                channel_id=channel_id,
                permission_level=PermissionLevel.read,
                assigned_by=admin_id,
                target_responsibility=False
            )

        result = AssignmentService.get_assignments_by_channel(db, channel_id, skip=0, limit=100)

        assert result["total"] >= 2
        assert len(result["assignments"]) >= 2
        assert all(a.channel_id == channel_id for a in result["assignments"])


# =============================================================================
# Update Assignment Tests
# =============================================================================

@pytest.mark.unit
class TestUpdateAssignment:
    """Test AssignmentService.update_assignment"""

    def test_update_assignment_success(self, db: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test successful assignment update"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create an assignment
        created = AssignmentService.create_assignment(
            db=db,
            user_id=user_id,
            channel_id=channel_id,
            permission_level=PermissionLevel.read,
            assigned_by=admin_id,
            target_responsibility=False
        )

        # Update the assignment
        assignment_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        updated = AssignmentService.update_assignment(
            db=db,
            assignment_id=assignment_id,
            permission_level=PermissionLevel.write,
            target_responsibility=True
        )

        assert updated is not None
        assert updated.permission_level == PermissionLevel.write
        assert updated.target_responsibility is True

    def test_update_assignment_partial(self, db: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test partial assignment update"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        created = AssignmentService.create_assignment(
            db=db,
            user_id=user_id,
            channel_id=channel_id,
            permission_level=PermissionLevel.read,
            assigned_by=admin_id,
            target_responsibility=False
        )

        assignment_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        updated = AssignmentService.update_assignment(
            db=db,
            assignment_id=assignment_id,
            target_responsibility=True
        )

        assert updated.permission_level == PermissionLevel.read  # Unchanged
        assert updated.target_responsibility is True

    def test_update_assignment_not_found(self, db: Session):
        """Test updating non-existent assignment returns None"""
        non_existent_id = uuid.uuid4()

        result = AssignmentService.update_assignment(
            db=db,
            assignment_id=non_existent_id,
            permission_level=PermissionLevel.admin
        )

        assert result is None


# =============================================================================
# Delete Assignment Tests
# =============================================================================

@pytest.mark.unit
class TestDeleteAssignment:
    """Test AssignmentService.delete_assignment"""

    def test_delete_assignment_success(self, db: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test successful assignment deletion"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create an assignment to delete
        created = AssignmentService.create_assignment(
            db=db,
            user_id=user_id,
            channel_id=channel_id,
            permission_level=PermissionLevel.read,
            assigned_by=admin_id,
            target_responsibility=False
        )

        assignment_id = uuid.UUID(created.id) if isinstance(created.id, str) else created.id
        success = AssignmentService.delete_assignment(db, assignment_id)

        assert success is True

        # Verify assignment is deleted
        result = AssignmentService.get_assignment_by_id(db, assignment_id)
        assert result is None

    def test_delete_assignment_not_found(self, db: Session):
        """Test deleting non-existent assignment returns False"""
        non_existent_id = uuid.uuid4()

        success = AssignmentService.delete_assignment(db, non_existent_id)

        assert success is False


# =============================================================================
# Has Permission Tests
# =============================================================================

@pytest.mark.unit
class TestHasPermission:
    """Test AssignmentService.has_permission"""

    def test_has_permission_exact_match(self, db: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test permission check with exact match"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        AssignmentService.create_assignment(
            db=db,
            user_id=user_id,
            channel_id=channel_id,
            permission_level=PermissionLevel.write,
            assigned_by=admin_id,
            target_responsibility=False
        )

        has_perm = AssignmentService.has_permission(
            db, user_id, channel_id, PermissionLevel.write
        )

        assert has_perm is True

    def test_has_permission_higher_level(self, db: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test permission check when user has higher permission"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        AssignmentService.create_assignment(
            db=db,
            user_id=user_id,
            channel_id=channel_id,
            permission_level=PermissionLevel.admin,
            assigned_by=admin_id,
            target_responsibility=False
        )

        # Admin should have read and write permissions
        assert AssignmentService.has_permission(db, user_id, channel_id, PermissionLevel.read) is True
        assert AssignmentService.has_permission(db, user_id, channel_id, PermissionLevel.write) is True
        assert AssignmentService.has_permission(db, user_id, channel_id, PermissionLevel.admin) is True

    def test_has_permission_insufficient(self, db: Session, test_user: User, test_channel: Channel, test_admin: User):
        """Test permission check when user doesn't have required permission"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        AssignmentService.create_assignment(
            db=db,
            user_id=user_id,
            channel_id=channel_id,
            permission_level=PermissionLevel.read,
            assigned_by=admin_id,
            target_responsibility=False
        )

        # Read permission should not grant write or admin
        has_write = AssignmentService.has_permission(db, user_id, channel_id, PermissionLevel.write)
        has_admin = AssignmentService.has_permission(db, user_id, channel_id, PermissionLevel.admin)

        assert has_write is False
        assert has_admin is False

    def test_has_permission_no_assignment(self, db: Session, test_user: User, test_channel: Channel):
        """Test permission check when no assignment exists"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id

        has_perm = AssignmentService.has_permission(
            db, user_id, channel_id, PermissionLevel.read
        )

        assert has_perm is False


# =============================================================================
# Get User Channels with Permission Tests
# =============================================================================

@pytest.mark.unit
class TestGetUserChannelsWithPermission:
    """Test AssignmentService.get_user_channels_with_permission"""

    def test_get_channels_with_exact_permission(self, db: Session, test_user: User, test_admin: User):
        """Test getting channels where user has exact permission"""
        from backend.src.services.channel_service import ChannelService
        from backend.src.models.channel import ChannelStatus, BusinessType

        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        # Create channels with different permissions
        read_channel = ChannelService.create_channel(
            db=db, name="Read Channel", description="Test",
            status=ChannelStatus.active, business_type=BusinessType.basic,
            contact_person=None,
            contact_email=None, contact_phone=None, created_by=admin_id
        )
        write_channel = ChannelService.create_channel(
            db=db, name="Write Channel", description="Test",
            status=ChannelStatus.active, business_type=BusinessType.basic,
            contact_person=None,
            contact_email=None, contact_phone=None, created_by=admin_id
        )

        read_channel_id = uuid.UUID(read_channel.id) if isinstance(read_channel.id, str) else read_channel.id
        write_channel_id = uuid.UUID(write_channel.id) if isinstance(write_channel.id, str) else write_channel.id

        AssignmentService.create_assignment(
            db=db, user_id=user_id, channel_id=read_channel_id,
            permission_level=PermissionLevel.read, assigned_by=admin_id,
            target_responsibility=False
        )
        AssignmentService.create_assignment(
            db=db, user_id=user_id, channel_id=write_channel_id,
            permission_level=PermissionLevel.write, assigned_by=admin_id,
            target_responsibility=False
        )

        # Get channels with write permission (should only return write_channel)
        write_channels = AssignmentService.get_user_channels_with_permission(
            db, user_id, PermissionLevel.write
        )

        assert len(write_channels) == 1
        assert write_channels[0].id == write_channel.id

    def test_get_channels_with_higher_permission(self, db: Session, test_user: User, test_admin: User):
        """Test getting channels where user has higher permission"""
        from backend.src.services.channel_service import ChannelService
        from backend.src.models.channel import ChannelStatus, BusinessType

        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id
        admin_id = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        admin_channel = ChannelService.create_channel(
            db=db, name="Admin Channel", description="Test",
            status=ChannelStatus.active, business_type=BusinessType.basic,
            contact_person=None,
            contact_email=None, contact_phone=None, created_by=admin_id
        )

        admin_channel_id = uuid.UUID(admin_channel.id) if isinstance(admin_channel.id, str) else admin_channel.id

        AssignmentService.create_assignment(
            db=db, user_id=user_id, channel_id=admin_channel_id,
            permission_level=PermissionLevel.admin, assigned_by=admin_id,
            target_responsibility=False
        )

        # Admin permission should grant read access
        read_channels = AssignmentService.get_user_channels_with_permission(
            db, user_id, PermissionLevel.read
        )

        assert len(read_channels) >= 1
        assert any(c.id == admin_channel.id for c in read_channels)

    def test_get_channels_no_matching_permission(self, db: Session, test_user: User):
        """Test getting channels when user has no matching permissions"""
        user_id = uuid.UUID(test_user.id) if isinstance(test_user.id, str) else test_user.id

        channels = AssignmentService.get_user_channels_with_permission(
            db, user_id, PermissionLevel.admin
        )

        assert len(channels) == 0
