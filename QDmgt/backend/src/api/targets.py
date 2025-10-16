from __future__ import annotations

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth.auth_service import get_current_user
from ..database import get_db
from ..models.channel_target import PeriodType, TargetType, UnifiedTarget
from ..services.unified_target_service import UnifiedTargetService
from ..utils.exceptions import ConflictError, NotFoundError, ValidationError
from ..utils.logger import logger


router = APIRouter(prefix="/targets", tags=["targets"])


class TargetPlanCreateRequest(BaseModel):
    channel_id: UUID
    year: int
    quarter: int
    performance_target: Optional[Decimal] = None
    opportunity_target: Optional[Decimal] = None
    project_count_target: Optional[int] = None
    development_goal: Optional[str] = None
    month: Optional[int] = None


class TargetPlanUpdateRequest(BaseModel):
    performance_target: Optional[Decimal] = None
    opportunity_target: Optional[Decimal] = None
    project_count_target: Optional[int] = None
    development_goal: Optional[str] = None


class TargetPlanUpdateAchievementRequest(BaseModel):
    achieved_performance: Optional[Decimal] = None
    achieved_opportunity: Optional[Decimal] = None
    achieved_project_count: Optional[int] = None


class TargetPlanResponse(BaseModel):
    id: UUID
    channel_id: UUID
    year: int
    quarter: int
    month: Optional[int]
    performance_target: Optional[Decimal]
    opportunity_target: Optional[Decimal]
    project_count_target: Optional[int]
    development_goal: Optional[str]
    achieved_performance: Decimal
    achieved_opportunity: Decimal
    achieved_project_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: UUID

    class Config:
        from_attributes = True


class TargetAchievementResponse(BaseModel):
    channel_id: UUID
    channel_name: str
    time_period: dict
    target_achievement: dict
    period_completion: str


def _handle_known_exception(error: Exception) -> None:
    if isinstance(error, (ValidationError, NotFoundError, ConflictError)):
        raise HTTPException(status_code=error.status_code, detail=error.detail)


def _coerce_decimal_to_int(value: Optional[Decimal]) -> int:
    if value is None:
        return 0
    quantized = value.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(quantized)


def _coerce_optional_decimal_to_int(value: Optional[Decimal]) -> Optional[int]:
    if value is None:
        return None
    return _coerce_decimal_to_int(value)


def _map_int_to_decimal(value: Optional[int]) -> Optional[Decimal]:
    if value is None:
        return None
    # Preserve .00 format for legacy API compatibility
    return Decimal(value).quantize(Decimal("0.01"))


def _map_int_to_decimal_required(value: Optional[int]) -> Decimal:
    # Preserve .00 format for legacy API compatibility
    return Decimal(value or 0).quantize(Decimal("0.01"))


def _resolve_user_id(current_user: Dict[str, Any]) -> UUID:
    try:
        raw_id = current_user["sub"]
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user payload missing subject",
        ) from exc

    try:
        return UUID(str(raw_id))
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user identifier is invalid",
        ) from exc


def _map_unified_to_response(target: UnifiedTarget) -> TargetPlanResponse:
    return TargetPlanResponse(
        id=UUID(str(target.id)),
        channel_id=UUID(str(target.target_id)),
        year=target.year,
        quarter=target.quarter,
        month=target.month,
        performance_target=_map_int_to_decimal(target.core_performance_target),
        opportunity_target=_map_int_to_decimal(target.core_opportunity_target),
        project_count_target=target.new_signing_target,
        development_goal=target.notes,
        achieved_performance=_map_int_to_decimal_required(target.core_performance_achieved),
        achieved_opportunity=_map_int_to_decimal_required(target.core_opportunity_achieved),
        achieved_project_count=target.new_signing_achieved or 0,
        created_at=target.created_at,
        updated_at=target.updated_at,
        created_by=UUID(str(target.created_by)),
    )


@router.post("/", response_model=TargetPlanResponse)
def create_target_plan(
    target_data: TargetPlanCreateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    creator_id = _resolve_user_id(current_user)

    period_type = PeriodType.month if target_data.month else PeriodType.quarter

    try:
        unified_target = UnifiedTargetService.create_target(
            db=db,
            target_type=TargetType.channel,
            target_id=target_data.channel_id,
            period_type=period_type,
            year=target_data.year,
            quarter=target_data.quarter,
            month=target_data.month,
            new_signing_target=target_data.project_count_target or 0,
            core_opportunity_target=_coerce_decimal_to_int(target_data.opportunity_target),
            core_performance_target=_coerce_decimal_to_int(target_data.performance_target),
            high_value_opportunity_target=0,
            high_value_performance_target=0,
            notes=target_data.development_goal,
            created_by=creator_id,
        )
        logger.info(
            "Unified target created from legacy API",
            extra={"target_id": str(unified_target.id), "channel_id": str(unified_target.target_id)},
        )
        return _map_unified_to_response(unified_target)
    except (ValidationError, ConflictError) as error:
        logger.warning("Failed to create unified target via legacy API: %s", error)
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error("Unexpected error creating unified target from legacy API: %s", error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create target plan",
        ) from error


@router.get("/{target_plan_id}", response_model=TargetPlanResponse)
def get_target_plan(
    target_plan_id: UUID,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        unified_target = UnifiedTargetService.get_target_by_id(db, target_plan_id)
        return _map_unified_to_response(unified_target)
    except (ValidationError, NotFoundError) as error:
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error("Unexpected error fetching unified target %s: %s", target_plan_id, error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch target plan",
        ) from error


@router.get("/channel/{channel_id}", response_model=List[TargetPlanResponse])
def get_target_plans_by_channel(
    channel_id: UUID,
    year: Optional[int] = None,
    quarter: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        targets, _ = UnifiedTargetService.get_targets(
            db=db,
            target_type=TargetType.channel,
            target_id=channel_id,
            year=year,
            quarter=quarter,
        )
        return [_map_unified_to_response(target) for target in targets]
    except ValidationError as error:
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error(
            "Unexpected error listing unified targets for channel %s: %s",
            channel_id,
            error,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch target plans",
        ) from error


@router.put("/{target_plan_id}", response_model=TargetPlanResponse)
def update_target_plan(
    target_plan_id: UUID,
    target_data: TargetPlanUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    modifier_id = _resolve_user_id(current_user)

    try:
        unified_target = UnifiedTargetService.update_target(
            db=db,
            target_id=target_plan_id,
            new_signing_target=target_data.project_count_target,
            core_opportunity_target=_coerce_optional_decimal_to_int(target_data.opportunity_target),
            core_performance_target=_coerce_optional_decimal_to_int(target_data.performance_target),
            high_value_opportunity_target=None,
            high_value_performance_target=None,
            notes=target_data.development_goal,
            modified_by=modifier_id,
        )
        logger.info("Unified target updated via legacy API", extra={"target_id": str(target_plan_id)})
        return _map_unified_to_response(unified_target)
    except (ValidationError, NotFoundError) as error:
        logger.warning("Failed to update unified target %s via legacy API: %s", target_plan_id, error)
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error("Unexpected error updating unified target %s: %s", target_plan_id, error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update target plan",
        ) from error


@router.patch("/{target_plan_id}/achievement", response_model=TargetPlanResponse)
def update_target_achievement(
    target_plan_id: UUID,
    achievement_data: TargetPlanUpdateAchievementRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    modifier_id = _resolve_user_id(current_user)

    try:
        unified_target = UnifiedTargetService.update_achievement(
            db=db,
            target_id=target_plan_id,
            new_signing_achieved=achievement_data.achieved_project_count,
            core_opportunity_achieved=_coerce_optional_decimal_to_int(achievement_data.achieved_opportunity),
            core_performance_achieved=_coerce_optional_decimal_to_int(achievement_data.achieved_performance),
            high_value_opportunity_achieved=None,
            high_value_performance_achieved=None,
            modified_by=modifier_id,
        )
        logger.info(
            "Unified target achievement updated via legacy API",
            extra={"target_id": str(target_plan_id)},
        )
        return _map_unified_to_response(unified_target)
    except (ValidationError, NotFoundError) as error:
        logger.warning(
            "Failed to update unified target achievement %s via legacy API: %s",
            target_plan_id,
            error,
        )
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error(
            "Unexpected error updating unified target achievement %s: %s",
            target_plan_id,
            error,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update target achievement",
        ) from error


@router.get("/{target_plan_id}/completion", response_model=dict)
def get_completion_percentage(
    target_plan_id: UUID,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        unified_target = UnifiedTargetService.get_target_by_id(db, target_plan_id)
        completion = UnifiedTargetService.calculate_completion(unified_target)
        return {
            "target_plan_id": target_plan_id,
            "completion_percentages": completion,
        }
    except (ValidationError, NotFoundError) as error:
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error(
            "Unexpected error calculating completion for unified target %s: %s",
            target_plan_id,
            error,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate completion",
        ) from error
