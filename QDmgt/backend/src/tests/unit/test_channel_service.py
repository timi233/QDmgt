"""
Unit Tests for ChannelService

This module tests the ChannelService business logic layer.
"""

import pytest
from sqlalchemy.orm import Session
import uuid

from backend.src.services.channel_service import ChannelService
from backend.src.models.channel import Channel, ChannelStatus, BusinessType
from backend.src.models.user import User
from backend.src.utils.exceptions import ValidationError, NotFoundError, ConflictError


# =============================================================================
# Create Channel Tests
# =============================================================================

@pytest.mark.unit
class TestCreateChannel:
    """Test create_channel method"""

    def test_create_channel_success(self, db_session: Session, test_admin: User):
        """Test successful channel creation"""
        # Convert ID to UUID object
        admin_uuid = uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id

        channel = ChannelService.create_channel(
            db=db_session,
            name="Test Channel",
            description="Test description",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            contact_person=None,
            contact_email="test@example.com",
            contact_phone="+1234567890",
            created_by=admin_uuid
        )

        assert channel is not None
        assert channel.name == "Test Channel"
        assert channel.description == "Test description"
        assert channel.status == ChannelStatus.active
        assert channel.business_type == BusinessType.basic
        assert channel.contact_email == "test@example.com"
        assert channel.created_by == test_admin.id

    def test_create_channel_duplicate_name(self, db_session: Session, test_admin: User, test_channel: Channel):
        """Test creating channel with duplicate name raises ConflictError"""
        with pytest.raises(ConflictError) as exc_info:
            ChannelService.create_channel(
                db=db_session,
                name=test_channel.name,  # Duplicate name
                description="Another description",
                status=ChannelStatus.active,
                business_type=BusinessType.basic,
                contact_person=None,
                contact_email="another@example.com",
                contact_phone="+0987654321",
                created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
            )

        assert "already exists" in str(exc_info.value)

    def test_create_channel_invalid_email(self, db_session: Session, test_admin: User):
        """Test creating channel with invalid email raises ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            ChannelService.create_channel(
                db=db_session,
                name="Invalid Email Channel",
                description="Test",
                status=ChannelStatus.active,
                business_type=BusinessType.basic,
                contact_person=None,
                contact_email="invalid-email",  # Invalid email
                contact_phone="+1234567890",
                created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
            )

        assert "Invalid email format" in str(exc_info.value)

    def test_create_channel_minimal_fields(self, db_session: Session, test_admin: User):
        """Test creating channel with minimal required fields"""
        channel = ChannelService.create_channel(
            db=db_session,
            name="Minimal Channel",
            description=None,
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            contact_person=None,
            contact_email=None,
            contact_phone=None,
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        assert channel is not None
        assert channel.name == "Minimal Channel"
        assert channel.description is None
        assert channel.contact_email is None


# =============================================================================
# Get Channel Tests
# =============================================================================

@pytest.mark.unit
class TestGetChannel:
    """Test get_channel methods"""

    def test_get_channel_by_id_found(self, db_session: Session, test_channel: Channel):
        """Test getting channel by ID when it exists"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        channel = ChannelService.get_channel_by_id(db=db_session, channel_id=channel_id)

        assert channel is not None
        assert channel.id == test_channel.id
        assert channel.name == test_channel.name

    def test_get_channel_by_id_not_found(self, db_session: Session):
        """Test getting channel by ID when it doesn't exist"""
        non_existent_id = uuid.uuid4()
        channel = ChannelService.get_channel_by_id(db=db_session, channel_id=non_existent_id)

        assert channel is None

    def test_get_channel_by_name_found(self, db_session: Session, test_channel: Channel):
        """Test getting channel by name when it exists"""
        channel = ChannelService.get_channel_by_name(db=db_session, name=test_channel.name)

        assert channel is not None
        assert channel.id == test_channel.id
        assert channel.name == test_channel.name

    def test_get_channel_by_name_not_found(self, db_session: Session):
        """Test getting channel by name when it doesn't exist"""
        channel = ChannelService.get_channel_by_name(db=db_session, name="Non-Existent Channel")

        assert channel is None


# =============================================================================
# List/Get Channels Tests
# =============================================================================

@pytest.mark.unit
class TestGetChannels:
    """Test get_channels method with pagination and filtering"""

    def test_get_channels_no_filters(self, db_session: Session, test_channel: Channel):
        """Test getting all channels without filters"""
        result = ChannelService.get_channels(db=db_session)

        assert "channels" in result
        assert "total" in result
        assert "skip" in result
        assert "limit" in result
        assert "pages" in result
        assert result["total"] >= 1
        assert len(result["channels"]) >= 1

    def test_get_channels_with_pagination(self, db_session: Session, test_admin: User):
        """Test pagination works correctly"""
        # Create multiple channels
        for i in range(5):
            ChannelService.create_channel(
                db=db_session,
                name=f"Channel {i}",
                description=f"Description {i}",
                status=ChannelStatus.active,
                business_type=BusinessType.basic,
                contact_person=None,
                contact_email=None,
                contact_phone=None,
                created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
            )

        # Get first page
        result = ChannelService.get_channels(db=db_session, skip=0, limit=2)
        assert len(result["channels"]) == 2
        assert result["total"] >= 5

        # Get second page
        result = ChannelService.get_channels(db=db_session, skip=2, limit=2)
        assert len(result["channels"]) == 2

    def test_get_channels_filter_by_status(self, db_session: Session, test_admin: User):
        """Test filtering channels by status"""
        # Create channels with different statuses
        ChannelService.create_channel(
            db=db_session,
            name="Active Channel",
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
            name="Inactive Channel",
            description="Test",
            status=ChannelStatus.inactive,
            business_type=BusinessType.basic,
            contact_person=None,
            contact_email=None,
            contact_phone=None,
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        # Filter by active status
        result = ChannelService.get_channels(db=db_session, status=ChannelStatus.active)
        assert all(c.status == ChannelStatus.active for c in result["channels"])

        # Filter by inactive status
        result = ChannelService.get_channels(db=db_session, status=ChannelStatus.inactive)
        assert all(c.status == ChannelStatus.inactive for c in result["channels"])

    def test_get_channels_filter_by_business_type(self, db_session: Session, test_admin: User):
        """Test filtering channels by business type"""
        # Create channels with different business types
        ChannelService.create_channel(
            db=db_session,
            name="Basic Type Channel",
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
            name="High Value Channel",
            description="Test",
            status=ChannelStatus.active,
            business_type=BusinessType.high_value,
            contact_person=None,
            contact_email=None,
            contact_phone=None,
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        # Filter by basic type
        result = ChannelService.get_channels(db=db_session, business_type=BusinessType.basic)
        assert all(c.business_type == BusinessType.basic for c in result["channels"])

        # Filter by high value type
        result = ChannelService.get_channels(db=db_session, business_type=BusinessType.high_value)
        assert all(c.business_type == BusinessType.high_value for c in result["channels"])

    def test_get_channels_search(self, db_session: Session, test_admin: User):
        """Test searching channels by name or description"""
        # Create channels with distinct names
        ChannelService.create_channel(
            db=db_session,
            name="Apple Store",
            description="Fruit store",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            contact_person=None,
            contact_email=None,
            contact_phone=None,
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )
        ChannelService.create_channel(
            db=db_session,
            name="Orange Market",
            description="Fruit market",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            contact_person=None,
            contact_email=None,
            contact_phone=None,
            created_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        # Search by name
        result = ChannelService.get_channels(db=db_session, search="Apple")
        assert result["total"] >= 1
        assert any("Apple" in c.name for c in result["channels"])

        # Search by description
        result = ChannelService.get_channels(db=db_session, search="market")
        assert result["total"] >= 1


# =============================================================================
# Update Channel Tests
# =============================================================================

@pytest.mark.unit
class TestUpdateChannel:
    """Test update_channel method"""

    def test_update_channel_success(self, db_session: Session, test_channel: Channel, test_admin: User):
        """Test successful channel update"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id

        updated_channel = ChannelService.update_channel(
            db=db_session,
            channel_id=channel_id,
            name="Updated Name",
            description="Updated description",
            status=ChannelStatus.inactive,
            business_type=BusinessType.high_value,
            contact_email="updated@example.com",
            contact_phone="+9999999999",
            last_modified_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        assert updated_channel is not None
        assert updated_channel.name == "Updated Name"
        assert updated_channel.description == "Updated description"
        assert updated_channel.status == ChannelStatus.inactive
        assert updated_channel.business_type == BusinessType.high_value
        assert updated_channel.contact_email == "updated@example.com"

    def test_update_channel_not_found(self, db_session: Session, test_admin: User):
        """Test updating non-existent channel returns None"""
        non_existent_id = uuid.uuid4()

        result = ChannelService.update_channel(
            db=db_session,
            channel_id=non_existent_id,
            name="Updated Name",
            description=None,
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            contact_email=None,
            contact_phone=None,
            last_modified_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        assert result is None

    def test_update_channel_partial(self, db_session: Session, test_channel: Channel, test_admin: User):
        """Test partial channel update"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id
        original_name = test_channel.name

        # Only update description
        updated_channel = ChannelService.update_channel(
            db=db_session,
            channel_id=channel_id,
            name=test_channel.name,
            description="New description only",
            status=test_channel.status,
            business_type=test_channel.business_type,
            contact_email=test_channel.contact_email,
            contact_phone=test_channel.contact_phone,
            last_modified_by=uuid.UUID(test_admin.id) if isinstance(test_admin.id, str) else test_admin.id
        )

        assert updated_channel.name == original_name
        assert updated_channel.description == "New description only"


# =============================================================================
# Delete Channel Tests
# =============================================================================

@pytest.mark.unit
class TestDeleteChannel:
    """Test delete_channel method"""

    def test_delete_channel_success(self, db_session: Session, test_channel: Channel):
        """Test successful channel deletion"""
        channel_id = uuid.UUID(test_channel.id) if isinstance(test_channel.id, str) else test_channel.id

        result = ChannelService.delete_channel(db=db_session, channel_id=channel_id)

        assert result is True

        # Verify channel is deleted
        deleted_channel = ChannelService.get_channel_by_id(db=db_session, channel_id=channel_id)
        assert deleted_channel is None

    def test_delete_channel_not_found(self, db_session: Session):
        """Test deleting non-existent channel returns False"""
        non_existent_id = uuid.uuid4()

        result = ChannelService.delete_channel(db=db_session, channel_id=non_existent_id)

        assert result is False
