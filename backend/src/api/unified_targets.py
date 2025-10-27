from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..auth.auth_service import get_current_user
from ..database import get_db
from ..models.channel_target import PeriodType, TargetType
from ..models.user import UserRole
from ..services.unified_target_service import UnifiedTargetService
from ..utils.exceptions import ConflictError, NotFoundError, ValidationError
from ..utils.logger import logger
from pydantic import BaseModel


class TargetTypeEnum(str, Enum):
    person = "person"
    channel = "channel"


class PeriodTypeEnum(str, Enum):
    quarter = "quarter"
    month = "month"


class UnifiedTargetCreateRequest(BaseModel):
    target_type: TargetTypeEnum
    target_id: UUID
    period_type: PeriodTypeEnum
    year: int
    quarter: int
    month: Optional[int] = None
    new_signing_target: int
    core_opportunity_target: int
    core_performance_target: int
    high_value_opportunity_target: int
    high_value_performance_target: int
    notes: Optional[str] = None


class UnifiedTargetUpdateRequest(BaseModel):
    new_signing_target: Optional[int] = None
    core_opportunity_target: Optional[int] = None
    core_performance_target: Optional[int] = None
    high_value_opportunity_target: Optional[int] = None
    high_value_performance_target: Optional[int] = None
    notes: Optional[str] = None


class UnifiedTargetUpdateAchievementRequest(BaseModel):
    new_signing_achieved: Optional[int] = None
    core_opportunity_achieved: Optional[int] = None
    core_performance_achieved: Optional[int] = None
    high_value_opportunity_achieved: Optional[int] = None
    high_value_performance_achieved: Optional[int] = None


class UnifiedTargetResponse(BaseModel):
    id: UUID
    target_type: TargetTypeEnum
    target_id: UUID
    period_type: PeriodTypeEnum
    year: int
    quarter: int
    month: Optional[int]
    new_signing_target: int
    core_opportunity_target: int
    core_performance_target: int
    high_value_opportunity_target: int
    high_value_performance_target: int
    new_signing_achieved: int
    core_opportunity_achieved: int
    core_performance_achieved: int
    high_value_opportunity_achieved: int
    high_value_performance_achieved: int
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: UUID
    last_modified_by: UUID

    class Config:
        from_attributes = True


class UnifiedTargetListResponse(BaseModel):
    targets: List[UnifiedTargetResponse]
    total: int
    skip: int
    limit: int


class CompletionResponse(BaseModel):
    target_id: UUID
    completion: Dict[str, float]


class QuarterViewResponse(BaseModel):
    quarter: Optional[UnifiedTargetResponse]
    months: List[UnifiedTargetResponse]

    class Config:
        from_attributes = True


router = APIRouter(prefix="/unified-targets", tags=["unified-targets"])


def _resolve_user_id(current_user: Dict[str, Any]) -> UUID:
    user_id = current_user.get("sub")  # JWT standard: user ID in "sub" field
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
        )
    return UUID(user_id) if isinstance(user_id, str) else user_id


def _resolve_user_role(current_user: Dict[str, Any]) -> UserRole:
    role_value = current_user.get("role")
    if not role_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User role not found in token",
        )
    try:
        return UserRole(role_value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid user role: {role_value}",
        ) from exc


def _handle_known_exception(error: Exception) -> None:
    if isinstance(error, (ValidationError, NotFoundError, ConflictError)):
        raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.post("/", response_model=UnifiedTargetResponse, status_code=status.HTTP_201_CREATED)
def create_unified_target(
    target_data: UnifiedTargetCreateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        user_role = _resolve_user_role(current_user)
        if user_role not in {UserRole.admin, UserRole.manager}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators or managers can create targets",
            )

        created_by = _resolve_user_id(current_user)

        target = UnifiedTargetService.create_target(
            db=db,
            target_type=target_data.target_type.value,
            target_id=target_data.target_id,
            period_type=target_data.period_type.value,
            year=target_data.year,
            quarter=target_data.quarter,
            month=target_data.month,
            new_signing_target=target_data.new_signing_target,
            core_opportunity_target=target_data.core_opportunity_target,
            core_performance_target=target_data.core_performance_target,
            high_value_opportunity_target=target_data.high_value_opportunity_target,
            high_value_performance_target=target_data.high_value_performance_target,
            notes=target_data.notes,
            created_by=created_by,
        )

        logger.info(
            "Unified target created",
            extra={"target_id": str(target.id), "target_type": target.target_type.value},
        )
        return target
    except (ValidationError, NotFoundError, ConflictError) as error:
        logger.warning("Failed to create unified target: %s", error)
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error("Unexpected error creating unified target: %s", error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create unified target",
        ) from error


@router.get("/", response_model=UnifiedTargetListResponse)
def list_unified_targets(
    target_type: Optional[TargetTypeEnum] = Query(None),
    target_id: Optional[UUID] = Query(None),
    period_type: Optional[PeriodTypeEnum] = Query(None),
    year: Optional[int] = Query(None),
    quarter: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        targets, total = UnifiedTargetService.get_targets(
            db=db,
            target_type=target_type.value if target_type else None,
            target_id=target_id,
            period_type=period_type.value if period_type else None,
            year=year,
            quarter=quarter,
            month=month,
            skip=skip,
            limit=limit,
        )

        logger.info(
            "Unified targets fetched",
            extra={"requested_by": current_user.get("id"), "count": len(targets)},
        )

        return UnifiedTargetListResponse(
            targets=targets,
            total=total,
            skip=skip,
            limit=limit,
        )
    except (ValidationError, NotFoundError, ConflictError) as error:
        logger.warning("Failed to fetch unified targets: %s", error)
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error("Unexpected error listing unified targets: %s", error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list unified targets",
        ) from error


@router.get("/quarter-view", response_model=QuarterViewResponse)
def get_quarter_view(
    target_type: TargetTypeEnum = Query(...),
    target_id: UUID = Query(...),
    year: int = Query(...),
    quarter: int = Query(...),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        result = UnifiedTargetService.get_quarter_targets(
            db=db,
            target_type=target_type.value,
            target_id=target_id,
            year=year,
            quarter=quarter,
        )

        logger.info(
            "Quarter view fetched",
            extra={
                "target_type": target_type.value,
                "target_id": str(target_id),
                "requested_by": current_user.get("id"),
            },
        )

        return QuarterViewResponse(
            quarter=result.get("quarter"),
            months=result.get("months", []),
        )
    except (ValidationError, NotFoundError, ConflictError) as error:
        logger.warning(
            "Failed to fetch quarter view for %s (%s): %s",
            target_id,
            target_type.value,
            error,
        )
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error(
            "Unexpected error fetching quarter view for %s (%s): %s",
            target_id,
            target_type.value,
            error,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch quarter view",
        ) from error


@router.get("/{target_id}", response_model=UnifiedTargetResponse)
def get_unified_target(
    target_id: UUID,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        target = UnifiedTargetService.get_target_by_id(db, target_id)
        logger.info(
            "Unified target retrieved",
            extra={"target_id": str(target_id), "requested_by": current_user.get("id")},
        )
        return target
    except (ValidationError, NotFoundError, ConflictError) as error:
        logger.warning("Failed to retrieve unified target %s: %s", target_id, error)
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error("Unexpected error retrieving unified target %s: %s", target_id, error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve unified target",
        ) from error


@router.put("/{target_id}", response_model=UnifiedTargetResponse)
def update_unified_target(
    target_id: UUID,
    update_data: UnifiedTargetUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        user_role = _resolve_user_role(current_user)
        if user_role not in {UserRole.admin, UserRole.manager}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators or managers can update targets",
            )

        modified_by = _resolve_user_id(current_user)

        target = UnifiedTargetService.update_target(
            db=db,
            target_id=target_id,
            new_signing_target=update_data.new_signing_target,
            core_opportunity_target=update_data.core_opportunity_target,
            core_performance_target=update_data.core_performance_target,
            high_value_opportunity_target=update_data.high_value_opportunity_target,
            high_value_performance_target=update_data.high_value_performance_target,
            notes=update_data.notes,
            modified_by=modified_by,
        )

        logger.info(
            "Unified target updated",
            extra={"target_id": str(target_id), "updated_by": current_user.get("id")},
        )
        return target
    except (ValidationError, NotFoundError, ConflictError) as error:
        logger.warning("Failed to update unified target %s: %s", target_id, error)
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error("Unexpected error updating unified target %s: %s", target_id, error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update unified target",
        ) from error


@router.patch("/{target_id}/achievement", response_model=UnifiedTargetResponse)
def update_unified_target_achievement(
    target_id: UUID,
    update_data: UnifiedTargetUpdateAchievementRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        user_role = _resolve_user_role(current_user)
        if user_role not in {UserRole.admin, UserRole.manager}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators or managers can update achievements",
            )

        modified_by = _resolve_user_id(current_user)

        target = UnifiedTargetService.update_achievement(
            db=db,
            target_id=target_id,
            new_signing_achieved=update_data.new_signing_achieved,
            core_opportunity_achieved=update_data.core_opportunity_achieved,
            core_performance_achieved=update_data.core_performance_achieved,
            high_value_opportunity_achieved=update_data.high_value_opportunity_achieved,
            high_value_performance_achieved=update_data.high_value_performance_achieved,
            modified_by=modified_by,
        )

        logger.info(
            "Unified target achievement updated",
            extra={"target_id": str(target_id), "updated_by": current_user.get("id")},
        )
        return target
    except (ValidationError, NotFoundError, ConflictError) as error:
        logger.warning(
            "Failed to update unified target achievement %s: %s", target_id, error
        )
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error(
            "Unexpected error updating unified target achievement %s: %s", target_id, error
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update unified target achievement",
        ) from error


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unified_target(
    target_id: UUID,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        user_role = _resolve_user_role(current_user)
        if user_role not in {UserRole.admin, UserRole.manager}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators or managers can delete targets",
            )

        UnifiedTargetService.delete_target(db=db, target_id=target_id)
        logger.info(
            "Unified target deleted",
            extra={"target_id": str(target_id), "deleted_by": current_user.get("id")},
        )
    except (ValidationError, NotFoundError, ConflictError) as error:
        logger.warning("Failed to delete unified target %s: %s", target_id, error)
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error("Unexpected error deleting unified target %s: %s", target_id, error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete unified target",
        ) from error


@router.get("/{target_id}/completion", response_model=CompletionResponse)
def get_unified_target_completion(
    target_id: UUID,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        target = UnifiedTargetService.get_target_by_id(db, target_id)
        completion = UnifiedTargetService.calculate_completion(target)
        logger.info(
            "Unified target completion calculated",
            extra={"target_id": str(target_id), "requested_by": current_user.get("id")},
        )
        return CompletionResponse(target_id=target_id, completion=completion)
    except (ValidationError, NotFoundError, ConflictError) as error:
        logger.warning("Failed to calculate completion for %s: %s", target_id, error)
        _handle_known_exception(error)
    except Exception as error:  # pragma: no cover - safeguard logging
        logger.error(
            "Unexpected error calculating completion for %s: %s", target_id, error
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate completion",
        ) from error


