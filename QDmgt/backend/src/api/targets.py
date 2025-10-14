from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from ..database import get_db
from ..models.channel_target import TargetPlan
from ..services.target_service import TargetService
from ..utils.exceptions import ValidationError, NotFoundError, ConflictError
from pydantic import BaseModel
from decimal import Decimal


router = APIRouter(prefix="/targets", tags=["targets"])


# Pydantic models for request/response
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


@router.post("/", response_model=TargetPlanResponse)
def create_target_plan(
    target_data: TargetPlanCreateRequest,
    db: Session = Depends(get_db)
):
    try:
        # For demonstration, using a mock user ID
        # In real implementation, this would come from auth context
        mock_user_id = UUID("12345678-1234-5678-1234-123456789012")
        
        target_plan = TargetService.create_target_plan(
            db=db,
            channel_id=target_data.channel_id,
            year=target_data.year,
            quarter=target_data.quarter,
            performance_target=target_data.performance_target,
            opportunity_target=target_data.opportunity_target,
            project_count_target=target_data.project_count_target,
            development_goal=target_data.development_goal,
            created_by=mock_user_id,
            month=target_data.month
        )
        
        return target_plan
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.detail
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.detail
        )


@router.get("/{target_plan_id}", response_model=TargetPlanResponse)
def get_target_plan(
    target_plan_id: UUID,
    db: Session = Depends(get_db)
):
    target_plan = TargetService.get_target_plan_by_id(db, target_plan_id)
    if not target_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target plan not found"
        )
    
    return target_plan


@router.get("/channel/{channel_id}", response_model=List[TargetPlanResponse])
def get_target_plans_by_channel(
    channel_id: UUID,
    year: Optional[int] = None,
    quarter: Optional[int] = None,
    db: Session = Depends(get_db)
):
    target_plans = TargetService.get_target_plans_by_channel(
        db,
        channel_id,
        year=year,
        quarter=quarter
    )
    
    return target_plans


@router.put("/{target_plan_id}", response_model=TargetPlanResponse)
def update_target_plan(
    target_plan_id: UUID,
    target_data: TargetPlanUpdateRequest,
    db: Session = Depends(get_db)
):
    try:
        target_plan = TargetService.update_target_plan(
            db=db,
            target_plan_id=target_plan_id,
            performance_target=target_data.performance_target,
            opportunity_target=target_data.opportunity_target,
            project_count_target=target_data.project_count_target,
            development_goal=target_data.development_goal
        )
        
        if not target_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target plan not found"
            )
        
        return target_plan
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.detail
        )


@router.patch("/{target_plan_id}/achievement", response_model=TargetPlanResponse)
def update_target_achievement(
    target_plan_id: UUID,
    achievement_data: TargetPlanUpdateAchievementRequest,
    db: Session = Depends(get_db)
):
    try:
        target_plan = TargetService.update_target_achievement(
            db=db,
            target_plan_id=target_plan_id,
            achieved_performance=achievement_data.achieved_performance,
            achieved_opportunity=achievement_data.achieved_opportunity,
            achieved_project_count=achievement_data.achieved_project_count
        )
        
        if not target_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target plan not found"
            )
        
        return target_plan
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.detail
        )


@router.get("/{target_plan_id}/completion", response_model=dict)
def get_completion_percentage(
    target_plan_id: UUID,
    db: Session = Depends(get_db)
):
    target_plan = TargetService.get_target_plan_by_id(db, target_plan_id)
    if not target_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target plan not found"
        )
    
    completion_data = TargetService.calculate_completion_percentage(target_plan)
    return {
        "target_plan_id": target_plan_id,
        "completion_percentages": completion_data
    }