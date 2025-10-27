"""Unified target service for managing person/channel quarterly and monthly targets."""

from __future__ import annotations

import uuid
from typing import Dict, List, Optional, Tuple, Union

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from ..models.channel_target import PeriodType, TargetType, UnifiedTarget
from ..utils.exceptions import ConflictError, NotFoundError, ValidationError
from ..utils.logger import logger
from ..utils.validators import validate_month, validate_quarter


class UnifiedTargetService:
    """Service layer for the unified target model."""

    @staticmethod
    def _coerce_target_type(target_type: Union[TargetType, str]) -> TargetType:
        """Convert incoming target type values to ``TargetType`` enum."""
        if isinstance(target_type, TargetType):
            return target_type
        try:
            return TargetType(target_type)
        except ValueError as exc:
            raise ValidationError(f"Unsupported target type: {target_type}") from exc

    @staticmethod
    def _coerce_period_type(period_type: Union[PeriodType, str]) -> PeriodType:
        """Convert incoming period type values to ``PeriodType`` enum."""
        if isinstance(period_type, PeriodType):
            return period_type
        try:
            return PeriodType(period_type)
        except ValueError as exc:
            raise ValidationError(f"Unsupported period type: {period_type}") from exc

    @staticmethod
    def _validate_period(period_type: PeriodType, quarter: int, month: Optional[int]) -> None:
        """Validate quarter/month consistency for the chosen period type."""
        validate_quarter(quarter)

        if period_type == PeriodType.quarter:
            if month is not None:
                raise ValidationError("Quarterly targets cannot specify a month.")
        else:
            if month is None:
                raise ValidationError("Monthly targets must include a month value.")
            validate_month(month)

    @staticmethod
    def create_target(
        db: Session,
        target_type: Union[TargetType, str],
        target_id: uuid.UUID,
        period_type: Union[PeriodType, str],
        year: int,
        quarter: int,
        month: Optional[int],
        new_signing_target: int,
        core_opportunity_target: int,
        core_performance_target: int,
        high_value_opportunity_target: int,
        high_value_performance_target: int,
        notes: Optional[str],
        created_by: uuid.UUID,
    ) -> UnifiedTarget:
        """Create a unified target for a person or channel.

        Args:
            db: Database session.
            target_type: Enum or value describing the target owner dimension.
            target_id: Person or channel identifier.
            period_type: Enum or value describing period granularity.
            year: Target year.
            quarter: Target quarter (1-4).
            month: Target month when ``period_type`` is ``month``.
            new_signing_target: Planned new signing volume.
            core_opportunity_target: Planned core opportunity count.
            core_performance_target: Planned core performance volume.
            high_value_opportunity_target: Planned high value opportunity count.
            high_value_performance_target: Planned high value performance volume.
            notes: Optional free form notes for the target.
            created_by: User who creates the target.

        Returns:
            Newly created ``UnifiedTarget`` instance.

        Raises:
            ValidationError: When provided data is inconsistent.
            ConflictError: When a target already exists for the same period.
        """
        coerced_target_type = UnifiedTargetService._coerce_target_type(target_type)
        coerced_period_type = UnifiedTargetService._coerce_period_type(period_type)
        UnifiedTargetService._validate_period(coerced_period_type, quarter, month)

        try:
            existing = db.query(UnifiedTarget).filter(
                and_(
                    UnifiedTarget.target_type == coerced_target_type,
                    UnifiedTarget.target_id == target_id,
                    UnifiedTarget.period_type == coerced_period_type,
                    UnifiedTarget.year == year,
                    UnifiedTarget.quarter == quarter,
                    UnifiedTarget.month == month,
                )
            ).first()

            if existing:
                raise ConflictError(
                    "Target already exists for the specified type, owner and period."
                )

            target = UnifiedTarget(
                target_type=coerced_target_type,
                target_id=target_id,
                period_type=coerced_period_type,
                year=year,
                quarter=quarter,
                month=month,
                new_signing_target=new_signing_target,
                core_opportunity_target=core_opportunity_target,
                core_performance_target=core_performance_target,
                high_value_opportunity_target=high_value_opportunity_target,
                high_value_performance_target=high_value_performance_target,
                notes=notes,
                created_by=created_by,
                last_modified_by=created_by,
            )

            db.add(target)
            db.commit()
            db.refresh(target)

            logger.info(
                "Created unified target %s for %s %s (%s %s %s)",
                target.id,
                coerced_target_type.value,
                target_id,
                year,
                f"Q{quarter}",
                f"month={month}" if month else "quarter",
            )

            return target
        except (ValidationError, ConflictError):
            db.rollback()
            raise
        except Exception as exc:  # pragma: no cover - safeguard logging
            db.rollback()
            logger.error("Failed to create unified target: %s", exc)
            raise

    @staticmethod
    def get_target_by_id(db: Session, target_id: uuid.UUID) -> UnifiedTarget:
        """Retrieve a unified target by primary key.

        Args:
            db: Database session.
            target_id: Target identifier.

        Returns:
            Requested ``UnifiedTarget`` instance.

        Raises:
            NotFoundError: When the target does not exist.
        """
        target = db.query(UnifiedTarget).filter(UnifiedTarget.id == target_id).first()
        if not target:
            raise NotFoundError(f"Unified target not found: {target_id}")
        return target

    @staticmethod
    def get_targets(
        db: Session,
        target_type: Optional[Union[TargetType, str]] = None,
        target_id: Optional[uuid.UUID] = None,
        period_type: Optional[Union[PeriodType, str]] = None,
        year: Optional[int] = None,
        quarter: Optional[int] = None,
        month: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[UnifiedTarget], int]:
        """List unified targets with optional filtering and pagination.

        Args:
            db: Database session.
            target_type: Optional dimension filter.
            target_id: Optional owner identifier filter.
            period_type: Optional period type filter.
            year: Optional year filter.
            quarter: Optional quarter filter.
            month: Optional month filter (only for monthly records).
            skip: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            Tuple containing the result list and total count.
        """
        query = db.query(UnifiedTarget)

        if target_type is not None:
            coerced_target_type = UnifiedTargetService._coerce_target_type(target_type)
            query = query.filter(UnifiedTarget.target_type == coerced_target_type)
        if target_id is not None:
            query = query.filter(UnifiedTarget.target_id == target_id)
        if period_type is not None:
            coerced_period_type = UnifiedTargetService._coerce_period_type(period_type)
            query = query.filter(UnifiedTarget.period_type == coerced_period_type)
        if year is not None:
            query = query.filter(UnifiedTarget.year == year)
        if quarter is not None:
            query = query.filter(UnifiedTarget.quarter == quarter)
        if month is not None:
            query = query.filter(UnifiedTarget.month == month)

        total = query.count()

        targets = (
            query.order_by(
                UnifiedTarget.year.desc(),
                UnifiedTarget.quarter.desc(),
                UnifiedTarget.month.desc().nullslast(),
                UnifiedTarget.created_at.desc(),
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

        return targets, total

    @staticmethod
    def update_target(
        db: Session,
        target_id: uuid.UUID,
        new_signing_target: Optional[int] = None,
        core_opportunity_target: Optional[int] = None,
        core_performance_target: Optional[int] = None,
        high_value_opportunity_target: Optional[int] = None,
        high_value_performance_target: Optional[int] = None,
        notes: Optional[str] = None,
        modified_by: Optional[uuid.UUID] = None,
    ) -> UnifiedTarget:
        """Update target values for the specified record.

        Args:
            db: Database session.
            target_id: Target identifier.
            new_signing_target: Optional new target amount.
            core_opportunity_target: Optional new target amount.
            core_performance_target: Optional new target amount.
            high_value_opportunity_target: Optional new target amount.
            high_value_performance_target: Optional new target amount.
            notes: Optional note update.
            modified_by: User performing the update.

        Returns:
            Updated ``UnifiedTarget`` instance.

        Raises:
            NotFoundError: When the target does not exist.
        """
        target = UnifiedTargetService.get_target_by_id(db, target_id)

        fields_updated = False

        if new_signing_target is not None:
            target.new_signing_target = new_signing_target
            fields_updated = True
        if core_opportunity_target is not None:
            target.core_opportunity_target = core_opportunity_target
            fields_updated = True
        if core_performance_target is not None:
            target.core_performance_target = core_performance_target
            fields_updated = True
        if high_value_opportunity_target is not None:
            target.high_value_opportunity_target = high_value_opportunity_target
            fields_updated = True
        if high_value_performance_target is not None:
            target.high_value_performance_target = high_value_performance_target
            fields_updated = True
        if notes is not None:
            target.notes = notes
            fields_updated = True

        if modified_by is not None:
            target.last_modified_by = modified_by

        if not fields_updated and modified_by is None:
            return target

        db.commit()
        db.refresh(target)
        return target

    @staticmethod
    def update_achievement(
        db: Session,
        target_id: uuid.UUID,
        new_signing_achieved: Optional[int] = None,
        core_opportunity_achieved: Optional[int] = None,
        core_performance_achieved: Optional[int] = None,
        high_value_opportunity_achieved: Optional[int] = None,
        high_value_performance_achieved: Optional[int] = None,
        modified_by: Optional[uuid.UUID] = None,
    ) -> UnifiedTarget:
        """Update achievement values for the specified target.

        Args:
            db: Database session.
            target_id: Target identifier.
            new_signing_achieved: Optional new achievement amount.
            core_opportunity_achieved: Optional new achievement amount.
            core_performance_achieved: Optional new achievement amount.
            high_value_opportunity_achieved: Optional new achievement amount.
            high_value_performance_achieved: Optional new achievement amount.
            modified_by: User performing the update.

        Returns:
            Updated ``UnifiedTarget`` instance.

        Raises:
            NotFoundError: When the target does not exist.
        """
        target = UnifiedTargetService.get_target_by_id(db, target_id)

        fields_updated = False

        if new_signing_achieved is not None:
            target.new_signing_achieved = new_signing_achieved
            fields_updated = True
        if core_opportunity_achieved is not None:
            target.core_opportunity_achieved = core_opportunity_achieved
            fields_updated = True
        if core_performance_achieved is not None:
            target.core_performance_achieved = core_performance_achieved
            fields_updated = True
        if high_value_opportunity_achieved is not None:
            target.high_value_opportunity_achieved = high_value_opportunity_achieved
            fields_updated = True
        if high_value_performance_achieved is not None:
            target.high_value_performance_achieved = high_value_performance_achieved
            fields_updated = True

        if modified_by is not None:
            target.last_modified_by = modified_by

        if not fields_updated and modified_by is None:
            return target

        db.commit()
        db.refresh(target)
        return target

    @staticmethod
    def calculate_completion(target: UnifiedTarget) -> Dict[str, float]:
        """Calculate completion percentages for a target.

        Args:
            target: Unified target instance.

        Returns:
            Dictionary with per-metric completion and overall percentage.
        """
        metrics = {
            "new_signing": (target.new_signing_target, target.new_signing_achieved),
            "core_opportunity": (
                target.core_opportunity_target,
                target.core_opportunity_achieved,
            ),
            "core_performance": (
                target.core_performance_target,
                target.core_performance_achieved,
            ),
            "high_value_opportunity": (
                target.high_value_opportunity_target,
                target.high_value_opportunity_achieved,
            ),
            "high_value_performance": (
                target.high_value_performance_target,
                target.high_value_performance_achieved,
            ),
        }

        totals = {"target": 0, "achieved": 0}
        result: Dict[str, float] = {}

        for name, (planned, achieved) in metrics.items():
            if planned and planned > 0:
                percentage = float(achieved or 0) / planned * 100
                totals["target"] += planned
                totals["achieved"] += achieved or 0
            else:
                percentage = 0.0
            result[name] = round(percentage, 2)

        if totals["target"] > 0:
            overall = totals["achieved"] / totals["target"] * 100
        else:
            overall = 0.0

        result["overall"] = round(overall, 2)
        return result

    @staticmethod
    def delete_target(db: Session, target_id: uuid.UUID) -> None:
        """Delete a unified target.

        Args:
            db: Database session.
            target_id: Target identifier.

        Raises:
            NotFoundError: When the target does not exist.
        """
        target = UnifiedTargetService.get_target_by_id(db, target_id)

        db.delete(target)
        db.commit()

    @staticmethod
    def get_quarter_targets(
        db: Session,
        target_type: Union[TargetType, str],
        target_id: uuid.UUID,
        year: int,
        quarter: int,
    ) -> Dict[str, Union[Optional[UnifiedTarget], List[UnifiedTarget]]]:
        """Fetch the quarter-level target alongside its monthly breakdown.

        Args:
            db: Database session.
            target_type: Enum or value describing the target owner dimension.
            target_id: Person or channel identifier.
            year: Target year.
            quarter: Target quarter (1-4).

        Returns:
            Dictionary containing the quarter target and list of month targets.
        """
        coerced_target_type = UnifiedTargetService._coerce_target_type(target_type)
        validate_quarter(quarter)

        quarter_target = (
            db.query(UnifiedTarget)
            .filter(
                and_(
                    UnifiedTarget.target_type == coerced_target_type,
                    UnifiedTarget.target_id == target_id,
                    UnifiedTarget.period_type == PeriodType.quarter,
                    UnifiedTarget.year == year,
                    UnifiedTarget.quarter == quarter,
                )
            )
            .first()
        )

        start_month = (quarter - 1) * 3 + 1
        end_month = start_month + 2

        month_targets = (
            db.query(UnifiedTarget)
            .filter(
                and_(
                    UnifiedTarget.target_type == coerced_target_type,
                    UnifiedTarget.target_id == target_id,
                    UnifiedTarget.period_type == PeriodType.month,
                    UnifiedTarget.year == year,
                    UnifiedTarget.quarter == quarter,
                    UnifiedTarget.month >= start_month,
                    UnifiedTarget.month <= end_month,
                )
            )
            .order_by(UnifiedTarget.month.asc())
            .all()
        )

        return {"quarter": quarter_target, "months": month_targets}

    @staticmethod
    def aggregate_achievement(
        db: Session,
        target_type: Union[TargetType, str],
        target_id: uuid.UUID,
        year: int,
        quarter: int,
    ) -> Dict[str, int]:
        """Aggregate monthly achievements into quarter totals.

        Args:
            db: Database session.
            target_type: Enum or value describing the target owner dimension.
            target_id: Person or channel identifier.
            year: Target year.
            quarter: Target quarter (1-4).

        Returns:
            Dictionary with aggregated achievement amounts for each metric.
        """
        coerced_target_type = UnifiedTargetService._coerce_target_type(target_type)
        validate_quarter(quarter)

        sums = (
            db.query(
                func.coalesce(func.sum(UnifiedTarget.new_signing_achieved), 0),
                func.coalesce(func.sum(UnifiedTarget.core_opportunity_achieved), 0),
                func.coalesce(func.sum(UnifiedTarget.core_performance_achieved), 0),
                func.coalesce(func.sum(UnifiedTarget.high_value_opportunity_achieved), 0),
                func.coalesce(func.sum(UnifiedTarget.high_value_performance_achieved), 0),
            )
            .filter(
                and_(
                    UnifiedTarget.target_type == coerced_target_type,
                    UnifiedTarget.target_id == target_id,
                    UnifiedTarget.period_type == PeriodType.month,
                    UnifiedTarget.year == year,
                    UnifiedTarget.quarter == quarter,
                )
            )
            .one()
        )

        return {
            "new_signing_achieved": int(sums[0] or 0),
            "core_opportunity_achieved": int(sums[1] or 0),
            "core_performance_achieved": int(sums[2] or 0),
            "high_value_opportunity_achieved": int(sums[3] or 0),
            "high_value_performance_achieved": int(sums[4] or 0),
        }
