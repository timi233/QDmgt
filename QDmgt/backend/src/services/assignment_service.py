from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from ..models.assignment import ChannelAssignment, PermissionLevel
from ..models.user import User
from ..models.channel import Channel
from ..utils.exceptions import ValidationError, NotFoundError, ConflictError
from ..utils.logger import logger
import uuid


class AssignmentService:
    @staticmethod
    def create_assignment(
        db: Session,
        user_id: uuid.UUID,
        channel_id: uuid.UUID,
        permission_level: PermissionLevel,
        assigned_by: uuid.UUID,
        target_responsibility: bool = False
    ) -> ChannelAssignment:
        logger.info("Creating new channel assignment", extra={
            "user_id": str(user_id),
            "channel_id": str(channel_id),
            "permission_level": permission_level.value,
            "assigned_by": str(assigned_by),
            "target_responsibility": target_responsibility
        })
        
        # Convert UUID to string for SQLite compatibility
        user_id_str = str(user_id) if isinstance(user_id, uuid.UUID) else user_id
        channel_id_str = str(channel_id) if isinstance(channel_id, uuid.UUID) else channel_id
        assigned_by_str = str(assigned_by) if isinstance(assigned_by, uuid.UUID) else assigned_by

        # Check if user exists
        user = db.query(User).filter(User.id == user_id_str).first()
        if not user:
            logger.warning("User not found when creating assignment", extra={"user_id": str(user_id)})
            raise NotFoundError(f"User with ID {user_id} not found")

        # Check if channel exists
        channel = db.query(Channel).filter(Channel.id == channel_id_str).first()
        if not channel:
            logger.warning("Channel not found when creating assignment", extra={"channel_id": str(channel_id)})
            raise NotFoundError(f"Channel with ID {channel_id} not found")

        # Check if assignment already exists
        existing_assignment = db.query(ChannelAssignment).filter(
            and_(
                ChannelAssignment.user_id == user_id_str,
                ChannelAssignment.channel_id == channel_id_str
            )
        ).first()

        if existing_assignment:
            logger.warning("Assignment already exists", extra={
                "user_id": str(user_id),
                "channel_id": str(channel_id)
            })
            raise ConflictError(f"User {user_id} is already assigned to channel {channel_id}")

        assignment = ChannelAssignment(
            id=str(uuid.uuid4()),  # Explicitly set ID as string
            user_id=user_id_str,
            channel_id=channel_id_str,
            permission_level=permission_level,
            assigned_by=assigned_by_str,
            target_responsibility=target_responsibility
        )
        
        try:
            db.add(assignment)
            db.commit()
            db.refresh(assignment)
            
            logger.info("Channel assignment created successfully", extra={
                "assignment_id": str(assignment.id),
                "user_id": str(user_id),
                "channel_id": str(channel_id)
            })
            
            return assignment
        except Exception as e:
            db.rollback()
            logger.error("Failed to create channel assignment", extra={
                "error": str(e),
                "user_id": str(user_id),
                "channel_id": str(channel_id)
            })
            raise

    @staticmethod
    def get_assignment_by_id(db: Session, assignment_id: uuid.UUID) -> Optional[ChannelAssignment]:
        logger.debug("Fetching assignment by ID", extra={"assignment_id": str(assignment_id)})

        assignment_id_str = str(assignment_id) if isinstance(assignment_id, uuid.UUID) else assignment_id
        assignment = db.query(ChannelAssignment).filter(ChannelAssignment.id == assignment_id_str).first()
        
        if assignment:
            logger.info("Assignment found", extra={"assignment_id": str(assignment_id)})
        else:
            logger.warning("Assignment not found", extra={"assignment_id": str(assignment_id)})
        
        return assignment

    @staticmethod
    def get_assignments_by_user(
        db: Session, 
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Get assignments for a user with pagination support.
        
        Returns:
            Dict containing assignments list, total count, and pagination info
        """
        logger.debug("Fetching assignments by user ID", extra={
            "user_id": str(user_id),
            "skip": skip,
            "limit": limit
        })
        
        user_id_str = str(user_id) if isinstance(user_id, uuid.UUID) else user_id
        query = db.query(ChannelAssignment).filter(ChannelAssignment.user_id == user_id_str)
        
        # Get total count before pagination
        total = query.count()
        
        # Apply pagination
        assignments = query.offset(skip).limit(limit).all()
        
        pages = (total + limit - 1) // limit if limit > 0 else 1
        
        logger.info("Retrieved assignments for user", extra={
            "user_id": str(user_id),
            "total_count": total,
            "returned_count": len(assignments),
            "skip": skip,
            "limit": limit
        })
        
        return {
            "assignments": assignments,
            "total": total,
            "skip": skip,
            "limit": limit,
            "pages": pages
        }

    @staticmethod
    def get_assignments_by_channel(
        db: Session, 
        channel_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Get assignments for a channel with pagination support.
        
        Returns:
            Dict containing assignments list, total count, and pagination info
        """
        logger.debug("Fetching assignments by channel ID", extra={
            "channel_id": str(channel_id),
            "skip": skip,
            "limit": limit
        })
        
        channel_id_str = str(channel_id) if isinstance(channel_id, uuid.UUID) else channel_id
        query = db.query(ChannelAssignment).filter(ChannelAssignment.channel_id == channel_id_str)
        
        # Get total count before pagination
        total = query.count()
        
        # Apply pagination
        assignments = query.offset(skip).limit(limit).all()
        
        pages = (total + limit - 1) // limit if limit > 0 else 1
        
        logger.info("Retrieved assignments for channel", extra={
            "channel_id": str(channel_id),
            "total_count": total,
            "returned_count": len(assignments),
            "skip": skip,
            "limit": limit
        })
        
        return {
            "assignments": assignments,
            "total": total,
            "skip": skip,
            "limit": limit,
            "pages": pages
        }

    @staticmethod
    def update_assignment(
        db: Session,
        assignment_id: uuid.UUID,
        permission_level: Optional[PermissionLevel] = None,
        target_responsibility: Optional[bool] = None
    ) -> Optional[ChannelAssignment]:
        logger.info("Updating assignment", extra={
            "assignment_id": str(assignment_id),
            "permission_level": permission_level.value if permission_level else None,
            "target_responsibility": target_responsibility
        })

        assignment_id_str = str(assignment_id) if isinstance(assignment_id, uuid.UUID) else assignment_id
        assignment = db.query(ChannelAssignment).filter(
            ChannelAssignment.id == assignment_id_str
        ).first()
        
        if not assignment:
            logger.warning("Assignment not found for update", extra={"assignment_id": str(assignment_id)})
            return None
        
        # Update fields if provided
        if permission_level is not None:
            assignment.permission_level = permission_level
        if target_responsibility is not None:
            assignment.target_responsibility = target_responsibility
        
        try:
            db.commit()
            db.refresh(assignment)
            
            logger.info("Assignment updated successfully", extra={"assignment_id": str(assignment_id)})
            
            return assignment
        except Exception as e:
            db.rollback()
            logger.error("Failed to update assignment", extra={
                "error": str(e),
                "assignment_id": str(assignment_id)
            })
            raise

    @staticmethod
    def delete_assignment(db: Session, assignment_id: uuid.UUID) -> bool:
        logger.info("Deleting assignment", extra={"assignment_id": str(assignment_id)})

        assignment_id_str = str(assignment_id) if isinstance(assignment_id, uuid.UUID) else assignment_id
        assignment = db.query(ChannelAssignment).filter(
            ChannelAssignment.id == assignment_id_str
        ).first()
        
        if not assignment:
            logger.warning("Assignment not found for deletion", extra={"assignment_id": str(assignment_id)})
            return False
        
        try:
            db.delete(assignment)
            db.commit()
            
            logger.info("Assignment deleted successfully", extra={"assignment_id": str(assignment_id)})
            
            return True
        except Exception as e:
            db.rollback()
            logger.error("Failed to delete assignment", extra={
                "error": str(e),
                "assignment_id": str(assignment_id)
            })
            raise

    @staticmethod
    def has_permission(db: Session, user_id: uuid.UUID, channel_id: uuid.UUID, 
                      required_permission: PermissionLevel) -> bool:
        """Check if user has required permission for a channel"""
        logger.debug("Checking user permission for channel", extra={
            "user_id": str(user_id),
            "channel_id": str(channel_id),
            "required_permission": required_permission.value
        })
        
        user_id_str = str(user_id) if isinstance(user_id, uuid.UUID) else user_id
        channel_id_str = str(channel_id) if isinstance(channel_id, uuid.UUID) else channel_id
        assignment = db.query(ChannelAssignment).filter(
            and_(
                ChannelAssignment.user_id == user_id_str,
                ChannelAssignment.channel_id == channel_id_str
            )
        ).first()
        
        if not assignment:
            logger.info("No assignment found for user and channel", extra={
                "user_id": str(user_id),
                "channel_id": str(channel_id)
            })
            return False
        
        # Map permission levels to numeric values for comparison
        permission_values = {
            PermissionLevel.read: 1,
            PermissionLevel.write: 2,
            PermissionLevel.admin: 3
        }
        
        required_value = permission_values[required_permission]
        user_value = permission_values[assignment.permission_level]
        
        has_permission = user_value >= required_value
        
        logger.info("Permission check result", extra={
            "user_id": str(user_id),
            "channel_id": str(channel_id),
            "user_permission": assignment.permission_level.value,
            "required_permission": required_permission.value,
            "has_permission": has_permission
        })
        
        return has_permission

    @staticmethod
    def get_user_channels_with_permission(
        db: Session, 
        user_id: uuid.UUID, 
        required_permission: PermissionLevel
    ) -> List[Channel]:
        """Get all channels a user has a certain permission level or higher for"""
        logger.debug("Fetching user channels with permission", extra={
            "user_id": str(user_id),
            "required_permission": required_permission.value
        })
        
        user_id_str = str(user_id) if isinstance(user_id, uuid.UUID) else user_id
        assignments = db.query(ChannelAssignment).filter(
            ChannelAssignment.user_id == user_id_str
        ).all()
        
        permission_values = {
            PermissionLevel.read: 1,
            PermissionLevel.write: 2,
            PermissionLevel.admin: 3
        }
        
        required_value = permission_values[required_permission]
        
        user_channels = []
        for assignment in assignments:
            assignment_value = permission_values[assignment.permission_level]
            if assignment_value >= required_value:
                # Get the full channel object
                channel = db.query(Channel).filter(Channel.id == assignment.channel_id).first()
                if channel:
                    user_channels.append(channel)
        
        logger.info("Retrieved user channels with permission", extra={
            "user_id": str(user_id),
            "required_permission": required_permission.value,
            "channel_count": len(user_channels)
        })
        
        return user_channels