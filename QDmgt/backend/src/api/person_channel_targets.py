from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from ..database import get_db
from ..models.channel_target import PersonChannelTarget, TargetType
from ..models.user import UserRole
from ..services.person_channel_target_service import PersonChannelTargetService
from ..utils.exceptions import ValidationError, NotFoundError, ConflictError
from ..auth.auth_service import get_current_user
from pydantic import BaseModel
from enum import Enum


router = APIRouter(prefix="/person-channel-targets", tags=["person-channel-targets"])


# Pydantic models for request/response
class TargetTypeEnum(str, Enum):
    person = "person"
    channel = "channel"


class QuarterTargetData(BaseModel):
    """季度目标数据"""
    new_signing: int = 0
    core_opportunity: int = 0
    core_performance: int = 0
    high_value_opportunity: int = 0
    high_value_performance: int = 0


class MonthTargetData(BaseModel):
    """月度目标数据"""
    new_signing: int = 0
    core_opportunity: int = 0
    core_performance: int = 0
    high_value_opportunity: int = 0
    high_value_performance: int = 0


class TargetCreateRequest(BaseModel):
    """创建目标请求"""
    target_type: TargetTypeEnum
    target_id: UUID
    year: int
    quarter: int
    quarter_target: QuarterTargetData
    month_targets: Dict[str, MonthTargetData]  # {"1": {...}, "2": {...}, "3": {...}}


class TargetUpdateRequest(BaseModel):
    """更新目标请求"""
    quarter_target: Optional[QuarterTargetData] = None
    month_targets: Optional[Dict[str, MonthTargetData]] = None


class TargetResponse(BaseModel):
    """目标响应"""
    id: UUID
    target_type: str
    target_id: UUID
    year: int
    quarter: int
    quarter_new_signing: int
    quarter_core_opportunity: int
    quarter_core_performance: int
    quarter_high_value_opportunity: int
    quarter_high_value_performance: int
    month_targets: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: UUID
    last_modified_by: UUID

    class Config:
        from_attributes = True


class TargetListResponse(BaseModel):
    """目标列表响应"""
    targets: List[TargetResponse]
    total: int
    skip: int
    limit: int


def _resolve_user_id(current_user: Dict[str, Any]) -> UUID:
    """解析当前用户ID"""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    return UUID(user_id) if isinstance(user_id, str) else user_id


def _resolve_user_role(current_user: Dict[str, Any]) -> UserRole:
    """解析当前用户角色"""
    role_str = current_user.get("role")
    if not role_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User role not found in token"
        )
    try:
        return UserRole(role_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid user role: {role_str}"
        )


@router.post("/", response_model=TargetResponse, status_code=status.HTTP_201_CREATED)
def create_target(
    target_data: TargetCreateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    创建目标

    需要管理员或经理权限
    """
    try:
        user_role = _resolve_user_role(current_user)
        if user_role not in {UserRole.admin, UserRole.manager}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators or managers can create targets"
            )

        user_id = _resolve_user_id(current_user)

        # 将quarter_target和month_targets转换为字典
        quarter_targets_dict = target_data.quarter_target.model_dump()
        month_targets_dict = {
            month: data.model_dump()
            for month, data in target_data.month_targets.items()
        }

        target = PersonChannelTargetService.create_target(
            db=db,
            target_type=TargetType(target_data.target_type),
            target_id=target_data.target_id,
            year=target_data.year,
            quarter=target_data.quarter,
            quarter_targets=quarter_targets_dict,
            month_targets=month_targets_dict,
            created_by=user_id
        )

        return target

    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create target: {str(e)}"
        )


@router.get("/", response_model=TargetListResponse)
def get_targets(
    target_type: Optional[TargetTypeEnum] = Query(None, description="Filter by target type"),
    target_id: Optional[UUID] = Query(None, description="Filter by target ID"),
    year: Optional[int] = Query(None, description="Filter by year"),
    quarter: Optional[int] = Query(None, description="Filter by quarter"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    获取目标列表

    可选择按目标类型、目标ID、年份、季度筛选
    """
    try:
        target_type_enum = TargetType(target_type) if target_type else None

        targets, total = PersonChannelTargetService.get_targets(
            db=db,
            target_type=target_type_enum,
            target_id=target_id,
            year=year,
            quarter=quarter,
            skip=skip,
            limit=limit
        )

        return TargetListResponse(
            targets=targets,
            total=total,
            skip=skip,
            limit=limit
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve targets: {str(e)}"
        )


@router.get("/{target_id}", response_model=TargetResponse)
def get_target(
    target_id: UUID,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """根据ID获取目标详情"""
    try:
        target = PersonChannelTargetService.get_target_by_id(db, target_id)
        return target

    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve target: {str(e)}"
        )


@router.put("/{target_id}", response_model=TargetResponse)
def update_target(
    target_id: UUID,
    target_data: TargetUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    更新目标

    需要管理员或经理权限
    """
    try:
        user_role = _resolve_user_role(current_user)
        if user_role not in {UserRole.admin, UserRole.manager}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators or managers can update targets"
            )

        user_id = _resolve_user_id(current_user)

        # 将数据转换为字典
        quarter_targets_dict = target_data.quarter_target.model_dump() if target_data.quarter_target else None
        month_targets_dict = None
        if target_data.month_targets:
            month_targets_dict = {
                month: data.model_dump()
                for month, data in target_data.month_targets.items()
            }

        target = PersonChannelTargetService.update_target(
            db=db,
            target_id=target_id,
            quarter_targets=quarter_targets_dict,
            month_targets=month_targets_dict,
            modified_by=user_id
        )

        return target

    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update target: {str(e)}"
        )


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_target(
    target_id: UUID,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    删除目标

    需要管理员或经理权限
    """
    try:
        user_role = _resolve_user_role(current_user)
        if user_role not in {UserRole.admin, UserRole.manager}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators or managers can delete targets"
            )

        PersonChannelTargetService.delete_target(db, target_id)

    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete target: {str(e)}"
        )
