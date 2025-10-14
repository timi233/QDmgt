from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from ..database import get_db
from ..models.execution_plan import ExecutionPlan, PlanType, ExecutionStatus
from ..services.execution_service import ExecutionPlanService
from ..utils.exceptions import ValidationError, NotFoundError, ConflictError
from pydantic import BaseModel
from enum import Enum


router = APIRouter(prefix="/execution-plans", tags=["execution-plans"])


# Pydantic models for request/response
class PlanTypeEnum(str, Enum):
    monthly = "monthly"
    weekly = "weekly"

class ExecutionStatusEnum(str, Enum):
    planned = "planned"
    in_progress = "in-progress"
    completed = "completed"
    archived = "archived"

class ExecutionPlanCreateRequest(BaseModel):
    channel_id: UUID
    user_id: UUID
    plan_type: PlanTypeEnum
    plan_period: str  # Format: YYYY-MM for monthly, YYYY-WW for weekly
    plan_content: str
    execution_status: Optional[str] = None
    key_obstacles: Optional[str] = None
    next_steps: Optional[str] = None


class ExecutionPlanUpdateRequest(BaseModel):
    plan_content: Optional[str] = None
    execution_status: Optional[str] = None
    key_obstacles: Optional[str] = None
    next_steps: Optional[str] = None
    status: Optional[ExecutionStatusEnum] = None


class ExecutionPlanUpdateStatusRequest(BaseModel):
    execution_status: str
    key_obstacles: Optional[str] = None
    next_steps: Optional[str] = None


class ExecutionPlanResponse(BaseModel):
    id: UUID
    channel_id: UUID
    user_id: UUID
    plan_type: str
    plan_period: str
    plan_content: str
    execution_status: Optional[str]
    key_obstacles: Optional[str]
    next_steps: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    status: str

    class Config:
        from_attributes = True


@router.post("/", response_model=ExecutionPlanResponse)
def create_execution_plan(
    plan_data: ExecutionPlanCreateRequest,
    db: Session = Depends(get_db)
):
    try:
        plan = ExecutionPlanService.create_execution_plan(
            db=db,
            channel_id=plan_data.channel_id,
            user_id=plan_data.user_id,
            plan_type=PlanType(plan_data.plan_type),
            plan_period=plan_data.plan_period,
            plan_content=plan_data.plan_content,
            execution_status=plan_data.execution_status,
            key_obstacles=plan_data.key_obstacles,
            next_steps=plan_data.next_steps
        )
        
        return plan
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.detail
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.detail
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.detail
        )


@router.get("/{plan_id}", response_model=ExecutionPlanResponse)
def get_execution_plan(
    plan_id: UUID,
    db: Session = Depends(get_db)
):
    plan = ExecutionPlanService.get_execution_plan_by_id(db, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution plan not found"
        )
    
    return plan


@router.get("/channel/{channel_id}", response_model=List[ExecutionPlanResponse])
def get_execution_plans_by_channel(
    channel_id: UUID,
    plan_type: Optional[str] = None,
    status: Optional[str] = None,
    plan_period: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        type_enum = PlanType(plan_type) if plan_type else None
        status_enum = ExecutionStatus(status) if status else None
        
        plans = ExecutionPlanService.get_execution_plans_by_channel(
            db,
            channel_id,
            plan_type=type_enum,
            status=status_enum,
            plan_period=plan_period
        )
        
        return plans
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid plan type or status"
        )


@router.get("/user/{user_id}", response_model=List[ExecutionPlanResponse])
def get_execution_plans_by_user(
    user_id: UUID,
    plan_type: Optional[str] = None,
    status: Optional[str] = None,
    plan_period: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        type_enum = PlanType(plan_type) if plan_type else None
        status_enum = ExecutionStatus(status) if status else None
        
        plans = ExecutionPlanService.get_execution_plans_by_user(
            db,
            user_id,
            plan_type=type_enum,
            status=status_enum,
            plan_period=plan_period
        )
        
        return plans
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid plan type or status"
        )


@router.put("/{plan_id}", response_model=ExecutionPlanResponse)
def update_execution_plan(
    plan_id: UUID,
    plan_data: ExecutionPlanUpdateRequest,
    db: Session = Depends(get_db)
):
    try:
        plan = ExecutionPlanService.update_execution_plan(
            db=db,
            execution_plan_id=plan_id,
            plan_content=plan_data.plan_content,
            execution_status=plan_data.execution_status,
            key_obstacles=plan_data.key_obstacles,
            next_steps=plan_data.next_steps,
            status=ExecutionStatus(plan_data.status) if plan_data.status else None
        )
        
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Execution plan not found"
            )
        
        return plan
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.detail
        )


@router.patch("/{plan_id}/status", response_model=ExecutionPlanResponse)
def update_execution_plan_status(
    plan_id: UUID,
    status_data: ExecutionPlanUpdateStatusRequest,
    db: Session = Depends(get_db)
):
    try:
        plan = ExecutionPlanService.update_execution_plan(
            db=db,
            execution_plan_id=plan_id,
            execution_status=status_data.execution_status,
            key_obstacles=status_data.key_obstacles,
            next_steps=status_data.next_steps
        )

        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Execution plan not found"
            )

        return plan
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.detail
        )


@router.delete("/{plan_id}")
def delete_execution_plan(
    plan_id: UUID,
    db: Session = Depends(get_db)
):
    success = ExecutionPlanService.delete_execution_plan(db, plan_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution plan not found"
        )
    
    return {"message": "Execution plan deleted successfully"}