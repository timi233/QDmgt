"""
Person/Channel Target Service

Service for managing quarterly/monthly targets for persons or channels.
"""

import uuid
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import and_
from ..models.channel_target import PersonChannelTarget, TargetType
from ..models.user import User
from ..models.channel import Channel
from ..utils.exceptions import ValidationError, NotFoundError, ConflictError
from ..utils.logger import logger


class PersonChannelTargetService:
    """
    Service for Person/Channel Target management.

    Handles CRUD operations for quarterly and monthly targets.
    """

    @staticmethod
    def create_target(
        db: Session,
        target_type: TargetType,
        target_id: uuid.UUID,
        year: int,
        quarter: int,
        quarter_targets: Dict[str, int],
        month_targets: Dict[str, Dict[str, int]],
        created_by: uuid.UUID
    ) -> PersonChannelTarget:
        """
        Create a new target.

        Args:
            db: Database session
            target_type: Type of target (person or channel)
            target_id: ID of the person (user) or channel
            year: Target year
            quarter: Target quarter (1-4)
            quarter_targets: Quarterly target data
            month_targets: Monthly target data
            created_by: User ID who creates the target

        Returns:
            Created target

        Raises:
            ValidationError: If validation fails
            NotFoundError: If target person/channel not found
            ConflictError: If target already exists for this period
        """
        try:
            # Validate year and quarter
            if not (2000 <= year <= 2100):
                raise ValidationError("Year must be between 2000 and 2100")

            if not (1 <= quarter <= 4):
                raise ValidationError("Quarter must be between 1 and 4")

            # Validate target_id exists
            if target_type == TargetType.person:
                user = db.query(User).filter(User.id == target_id).first()
                if not user:
                    raise NotFoundError(f"User not found: {target_id}")
            else:
                channel = db.query(Channel).filter(Channel.id == target_id).first()
                if not channel:
                    raise NotFoundError(f"Channel not found: {target_id}")

            # Check if target already exists
            existing = db.query(PersonChannelTarget).filter(
                and_(
                    PersonChannelTarget.target_type == target_type,
                    PersonChannelTarget.target_id == target_id,
                    PersonChannelTarget.year == year,
                    PersonChannelTarget.quarter == quarter
                )
            ).first()

            if existing:
                raise ConflictError(
                    f"Target already exists for {target_type.value} {target_id} "
                    f"in Q{quarter} {year}"
                )

            # Create target
            target = PersonChannelTarget(
                target_type=target_type,
                target_id=target_id,
                year=year,
                quarter=quarter,
                quarter_new_signing=quarter_targets.get('new_signing', 0),
                quarter_core_opportunity=quarter_targets.get('core_opportunity', 0),
                quarter_core_performance=quarter_targets.get('core_performance', 0),
                quarter_high_value_opportunity=quarter_targets.get('high_value_opportunity', 0),
                quarter_high_value_performance=quarter_targets.get('high_value_performance', 0),
                month_targets=month_targets,
                created_by=created_by,
                last_modified_by=created_by
            )

            db.add(target)
            db.commit()
            db.refresh(target)

            logger.info(
                f"Created target for {target_type.value} {target_id} "
                f"in Q{quarter} {year} by user {created_by}"
            )

            return target

        except (ValidationError, NotFoundError, ConflictError):
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create target: {str(e)}")
            raise

    @staticmethod
    def get_targets(
        db: Session,
        target_type: Optional[TargetType] = None,
        target_id: Optional[uuid.UUID] = None,
        year: Optional[int] = None,
        quarter: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[PersonChannelTarget], int]:
        """
        Get targets with optional filtering.

        Args:
            db: Database session
            target_type: Filter by target type
            target_id: Filter by target ID
            year: Filter by year
            quarter: Filter by quarter
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            Tuple of (targets list, total count)
        """
        try:
            query = db.query(PersonChannelTarget)

            # Apply filters
            if target_type:
                query = query.filter(PersonChannelTarget.target_type == target_type)
            if target_id:
                query = query.filter(PersonChannelTarget.target_id == target_id)
            if year:
                query = query.filter(PersonChannelTarget.year == year)
            if quarter:
                query = query.filter(PersonChannelTarget.quarter == quarter)

            # Get total count
            total = query.count()

            # Apply pagination and sorting
            targets = query.order_by(
                PersonChannelTarget.year.desc(),
                PersonChannelTarget.quarter.desc(),
                PersonChannelTarget.created_at.desc()
            ).offset(skip).limit(limit).all()

            return targets, total

        except Exception as e:
            logger.error(f"Failed to retrieve targets: {str(e)}")
            raise

    @staticmethod
    def get_target_by_id(db: Session, target_id: uuid.UUID) -> PersonChannelTarget:
        """
        Get a target by its ID.

        Args:
            db: Database session
            target_id: Target ID

        Returns:
            Target

        Raises:
            NotFoundError: If target not found
        """
        try:
            target = db.query(PersonChannelTarget).filter(
                PersonChannelTarget.id == target_id
            ).first()

            if not target:
                raise NotFoundError(f"Target not found: {target_id}")

            return target

        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to retrieve target {target_id}: {str(e)}")
            raise

    @staticmethod
    def update_target(
        db: Session,
        target_id: uuid.UUID,
        quarter_targets: Optional[Dict[str, int]] = None,
        month_targets: Optional[Dict[str, Dict[str, int]]] = None,
        modified_by: uuid.UUID = None
    ) -> PersonChannelTarget:
        """
        Update a target.

        Args:
            db: Database session
            target_id: Target ID
            quarter_targets: New quarterly target data (optional)
            month_targets: New monthly target data (optional)
            modified_by: User ID who modifies the target

        Returns:
            Updated target

        Raises:
            NotFoundError: If target not found
        """
        try:
            target = PersonChannelTargetService.get_target_by_id(db, target_id)

            # Update quarterly targets
            if quarter_targets:
                target.quarter_new_signing = quarter_targets.get('new_signing', target.quarter_new_signing)
                target.quarter_core_opportunity = quarter_targets.get('core_opportunity', target.quarter_core_opportunity)
                target.quarter_core_performance = quarter_targets.get('core_performance', target.quarter_core_performance)
                target.quarter_high_value_opportunity = quarter_targets.get('high_value_opportunity', target.quarter_high_value_opportunity)
                target.quarter_high_value_performance = quarter_targets.get('high_value_performance', target.quarter_high_value_performance)

            # Update monthly targets
            if month_targets:
                target.month_targets = month_targets

            # Update modifier
            if modified_by:
                target.last_modified_by = modified_by

            db.commit()
            db.refresh(target)

            logger.info(f"Updated target {target_id} by user {modified_by}")

            return target

        except NotFoundError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to update target {target_id}: {str(e)}")
            raise

    @staticmethod
    def delete_target(db: Session, target_id: uuid.UUID) -> None:
        """
        Delete a target.

        Args:
            db: Database session
            target_id: Target ID

        Raises:
            NotFoundError: If target not found
        """
        try:
            target = PersonChannelTargetService.get_target_by_id(db, target_id)

            db.delete(target)
            db.commit()

            logger.info(f"Deleted target {target_id}")

        except NotFoundError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to delete target {target_id}: {str(e)}")
            raise
