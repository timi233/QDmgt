from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from ..models.channel import Channel, ChannelStatus, BusinessType
from ..models.assignment import ChannelAssignment
from ..models.user import User
from ..utils.exceptions import ValidationError, NotFoundError, ConflictError
from ..utils.logger import logger
from ..utils.validators import validate_email
import uuid


class ChannelService:
    @staticmethod
    def create_channel(
        db: Session,
        name: str,
        description: Optional[str],
        status: ChannelStatus,
        business_type: BusinessType,
        contact_person: Optional[str],
        contact_email: Optional[str],
        contact_phone: Optional[str],
        created_by: uuid.UUID
    ) -> Channel:
        logger.info(f"Creating new channel: {name}", extra={
            "user_id": str(created_by),
            "channel_name": name,
            "business_type": business_type.value
        })
        
        # Check if channel with same name already exists
        existing_channel = db.query(Channel).filter(Channel.name == name).first()
        if existing_channel:
            logger.warning(f"Attempt to create channel with duplicate name: {name}", extra={
                "user_id": str(created_by),
                "channel_name": name
            })
            raise ConflictError(f"Channel with name '{name}' already exists")
        
        # Validate email format if provided
        if contact_email:
            try:
                validate_email(contact_email)
            except ValidationError as e:
                logger.warning(f"Invalid email format provided: {contact_email}", extra={
                    "user_id": str(created_by),
                    "channel_name": name,
                    "email": contact_email
                })
                raise
        
        channel = Channel(
            id=str(uuid.uuid4()),  # Explicitly set ID as string for SQLite compatibility
            name=name,
            description=description,
            status=status,
            business_type=business_type,
            contact_person=contact_person,
            contact_email=contact_email,
            contact_phone=contact_phone,
            created_by=str(created_by) if isinstance(created_by, uuid.UUID) else created_by,
            last_modified_by=str(created_by) if isinstance(created_by, uuid.UUID) else created_by
        )
        
        try:
            db.add(channel)
            db.commit()
            db.refresh(channel)
            
            logger.info(f"Channel created successfully: {channel.id}", extra={
                "channel_id": str(channel.id),
                "user_id": str(created_by)
            })
            
            return channel
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating channel: {str(e)}", extra={
                "user_id": str(created_by),
                "channel_name": name
            })
            raise

    @staticmethod
    def get_channel_by_id(db: Session, channel_id: uuid.UUID) -> Optional[Channel]:
        logger.info(f"Fetching channel by ID: {channel_id}", extra={
            "channel_id": str(channel_id)
        })

        # Convert UUID to string for SQLite compatibility
        channel_id_str = str(channel_id) if isinstance(channel_id, uuid.UUID) else channel_id
        channel = db.query(Channel).filter(Channel.id == channel_id_str).first()
        
        if channel:
            logger.info(f"Channel found: {channel.id}", extra={
                "channel_id": str(channel.id)
            })
        else:
            logger.info(f"Channel not found: {channel_id}", extra={
                "channel_id": str(channel_id)
            })
        
        return channel

    @staticmethod
    def get_channel_by_name(db: Session, name: str) -> Optional[Channel]:
        logger.info(f"Fetching channel by name: {name}", extra={
            "channel_name": name
        })
        
        channel = db.query(Channel).filter(Channel.name == name).first()
        
        if channel:
            logger.info(f"Channel found: {channel.id}", extra={
                "channel_id": str(channel.id),
                "channel_name": name
            })
        else:
            logger.info(f"Channel not found: {name}", extra={
                "channel_name": name
            })
        
        return channel

    @staticmethod
    def get_channels(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[ChannelStatus] = None,
        business_type: Optional[BusinessType] = None
    ) -> dict:
        """
        Get channels with pagination and filtering, returns dict with metadata

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Search term for name/description
            status: Filter by status
            business_type: Filter by business type

        Returns:
            Dictionary with channels, total count, and pagination info
        """
        logger.info("Getting channels with pagination", extra={
            "skip": skip,
            "limit": limit,
            "search": search,
            "status": status.value if status else None,
            "business_type": business_type.value if business_type else None
        })

        query = db.query(Channel)

        # Apply search filter if provided
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    Channel.name.ilike(search_filter),
                    Channel.description.ilike(search_filter)
                )
            )

        # Apply status filter if provided
        if status:
            query = query.filter(Channel.status == status)

        # Apply business type filter if provided
        if business_type:
            query = query.filter(Channel.business_type == business_type)

        # Get total count before pagination
        total = query.count()

        # Apply pagination
        channels = query.offset(skip).limit(limit).all()

        # Calculate pages
        pages = (total + limit - 1) // limit if limit > 0 else 1

        logger.info(f"Retrieved {len(channels)} channels out of {total} total", extra={
            "count": len(channels),
            "total": total,
            "skip": skip,
            "limit": limit
        })

        return {
            "channels": channels,
            "total": total,
            "skip": skip,
            "limit": limit,
            "pages": pages
        }

    @staticmethod
    def get_channels_for_user(
        db: Session,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[ChannelStatus] = None,
        business_type: Optional[BusinessType] = None
    ) -> dict:
        """Get channels assigned to a specific user"""
        user_id_str = str(user_id) if isinstance(user_id, uuid.UUID) else user_id

        logger.info("Getting channels for user", extra={
            "user_id": user_id_str,
            "skip": skip,
            "limit": limit,
            "search": search,
            "status": status.value if status else None,
            "business_type": business_type.value if business_type else None
        })

        query = db.query(Channel).join(
            ChannelAssignment, ChannelAssignment.channel_id == Channel.id
        ).filter(ChannelAssignment.user_id == user_id_str)

        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    Channel.name.ilike(search_filter),
                    Channel.description.ilike(search_filter)
                )
            )

        if status:
            query = query.filter(Channel.status == status)

        if business_type:
            query = query.filter(Channel.business_type == business_type)

        total = query.count()
        channels = query.offset(skip).limit(limit).all()
        pages = (total + limit - 1) // limit if limit > 0 else 1

        logger.info("Retrieved user channels", extra={
            "user_id": user_id_str,
            "count": len(channels),
            "total": total
        })

        return {
            "channels": channels,
            "total": total,
            "skip": skip,
            "limit": limit,
            "pages": pages
        }

    @staticmethod
    def update_channel(
        db: Session,
        channel_id: uuid.UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        status: Optional[ChannelStatus] = None,
        business_type: Optional[BusinessType] = None,
        contact_person: Optional[str] = None,
        contact_email: Optional[str] = None,
        contact_phone: Optional[str] = None,
        last_modified_by: uuid.UUID = None
    ) -> Optional[Channel]:
        logger.info(f"Updating channel: {channel_id}", extra={
            "channel_id": str(channel_id)
        })

        # Convert UUID to string for SQLite compatibility
        channel_id_str = str(channel_id) if isinstance(channel_id, uuid.UUID) else channel_id
        channel = db.query(Channel).filter(Channel.id == channel_id_str).first()
        
        if not channel:
            logger.info(f"Attempt to update non-existent channel: {channel_id}", extra={
                "channel_id": str(channel_id)
            })
            return None
        
        # Check if name is being changed and if it conflicts with existing channel
        if name and name != channel.name:
            existing_channel = db.query(Channel).filter(
                and_(Channel.name == name, Channel.id != channel_id_str)
            ).first()
            if existing_channel:
                logger.warning(f"Attempt to update channel to duplicate name: {name}", extra={
                    "channel_id": str(channel_id),
                    "new_name": name
                })
                raise ConflictError(f"Channel with name '{name}' already exists")
        
        # Validate email format if provided
        if contact_email:
            try:
                validate_email(contact_email)
            except ValidationError as e:
                logger.warning(f"Invalid email format provided: {contact_email}", extra={
                    "channel_id": str(channel_id),
                    "email": contact_email
                })
                raise
        
        # Update fields if provided
        if name is not None:
            channel.name = name
        if description is not None:
            channel.description = description
        if status is not None:
            channel.status = status
        if business_type is not None:
            channel.business_type = business_type
        if contact_person is not None:
            channel.contact_person = contact_person
        if contact_email is not None:
            channel.contact_email = contact_email
        if contact_phone is not None:
            channel.contact_phone = contact_phone
        if last_modified_by:
            channel.last_modified_by = str(last_modified_by) if isinstance(last_modified_by, uuid.UUID) else last_modified_by
        
        try:
            db.commit()
            db.refresh(channel)
            
            logger.info(f"Channel updated successfully: {channel.id}", extra={
                "channel_id": str(channel.id),
                "user_id": str(last_modified_by) if last_modified_by else None
            })
            
            return channel
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating channel: {str(e)}", extra={
                "channel_id": str(channel_id)
            })
            raise

    @staticmethod
    def delete_channel(db: Session, channel_id: uuid.UUID) -> bool:
        """
        Delete a channel after checking for dependencies

        Args:
            db: Database session
            channel_id: ID of channel to delete

        Returns:
            True if deleted successfully, False if not found

        Raises:
            ConflictError: If channel has active assignments or related data
        """
        from ..models.assignment import ChannelAssignment

        logger.info(f"Deleting channel: {channel_id}", extra={
            "channel_id": str(channel_id)
        })

        # Convert UUID to string for SQLite compatibility
        channel_id_str = str(channel_id) if isinstance(channel_id, uuid.UUID) else channel_id
        channel = db.query(Channel).filter(Channel.id == channel_id_str).first()

        if not channel:
            logger.info(f"Attempt to delete non-existent channel: {channel_id}", extra={
                "channel_id": str(channel_id)
            })
            return False

        # Check for active assignments
        active_assignments = db.query(ChannelAssignment).filter(
            ChannelAssignment.channel_id == channel_id_str
        ).first()

        if active_assignments:
            logger.warning(f"Cannot delete channel with active assignments: {channel_id}", extra={
                "channel_id": str(channel_id)
            })
            raise ConflictError("Cannot delete channel with active assignments. Please remove all assignments first.")

        # Check for active targets (using UnifiedTarget)
        from ..models.channel_target import UnifiedTarget, TargetType
        active_targets = db.query(UnifiedTarget).filter(
            UnifiedTarget.target_type == TargetType.channel,
            UnifiedTarget.target_id == channel.id
        ).first()

        if active_targets:
            logger.warning(f"Cannot delete channel with active targets: {channel_id}", extra={
                "channel_id": str(channel_id)
            })
            raise ConflictError("Cannot delete channel with active targets. Please remove all targets first.")

        try:
            db.delete(channel)
            db.commit()

            logger.info(f"Channel deleted successfully: {channel_id}", extra={
                "channel_id": str(channel_id)
            })

            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting channel: {str(e)}", extra={
                "channel_id": str(channel_id)
            })
            raise
