from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from ..database import get_db
from ..models.channel import Channel, ChannelStatus, BusinessType
from ..models.assignment import ChannelAssignment
from ..models.user import UserRole
from ..services.channel_service import ChannelService
from ..utils.exceptions import ValidationError, ConflictError
from ..auth.auth_service import get_current_user
from pydantic import BaseModel, EmailStr
from enum import Enum


router = APIRouter(prefix="/channels", tags=["channels"])


# Pydantic models for request/response
class ChannelStatusEnum(str, Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"


class BusinessTypeEnum(str, Enum):
    basic = "basic"
    high_value = "high-value"
    pending_signup = "pending-signup"


class ChannelCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    status: ChannelStatusEnum
    business_type: BusinessTypeEnum
    contact_person: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None


class ChannelUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ChannelStatusEnum] = None
    business_type: Optional[BusinessTypeEnum] = None
    contact_person: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None


class ChannelResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    status: str
    business_type: str
    contact_person: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: UUID
    last_modified_by: UUID

    class Config:
        from_attributes = True


@router.post("/", response_model=ChannelResponse)
def create_channel(
    channel_data: ChannelCreateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new channel

    Requires authentication. The current user will be set as the creator.
    """
    try:
        user_role = _resolve_user_role(current_user)
        if user_role not in {UserRole.admin, UserRole.manager}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators or managers can create channels"
            )

        # Get user ID from authenticated user
        user_id = _resolve_user_id(current_user)

        channel = ChannelService.create_channel(
            db=db,
            name=channel_data.name,
            description=channel_data.description,
            status=ChannelStatus(channel_data.status),
            business_type=BusinessType(channel_data.business_type),
            contact_person=channel_data.contact_person,
            contact_email=channel_data.contact_email,
            contact_phone=channel_data.contact_phone,
            created_by=user_id
        )

        return channel
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


@router.get("/{channel_id}", response_model=ChannelResponse)
def get_channel(
    channel_id: UUID,
    db: Session = Depends(get_db)
):
    channel = ChannelService.get_channel_by_id(db, channel_id)
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    return channel


class ChannelListResponse(BaseModel):
    channels: List[ChannelResponse]
    total: int
    skip: int
    limit: int
    pages: int

    class Config:
        from_attributes = True


@router.get("/", response_model=ChannelListResponse)
def get_channels(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=1000),
    search: Optional[str] = Query(None),
    status: Optional[ChannelStatusEnum] = Query(None),
    business_type: Optional[BusinessTypeEnum] = Query(None),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_role = _resolve_user_role(current_user)

    user_id = _resolve_user_id(current_user)

    status_filter = ChannelStatus(status) if status else None
    business_type_filter = BusinessType(business_type) if business_type else None

    if user_role in {UserRole.admin, UserRole.manager}:
        result = ChannelService.get_channels(
            db,
            skip=skip,
            limit=limit,
            search=search,
            status=status_filter,
            business_type=business_type_filter
        )
    else:
        result = ChannelService.get_channels_for_user(
            db,
            user_id=user_id,
            skip=skip,
            limit=limit,
            search=search,
            status=status_filter,
            business_type=business_type_filter
        )

    return ChannelListResponse(**result)


@router.put("/{channel_id}", response_model=ChannelResponse)
def update_channel(
    channel_id: UUID,
    channel_data: ChannelUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update an existing channel

    Requires authentication. The current user will be set as the last modifier.
    """
    try:
        user_role = _resolve_user_role(current_user)

        user_id = _resolve_user_id(current_user)

        if user_role == UserRole.user:
            channel_id_str = str(channel_id)
            assignment = db.query(ChannelAssignment).filter(
                ChannelAssignment.user_id == str(user_id),
                ChannelAssignment.channel_id == channel_id_str
            ).first()

            if not assignment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to modify this channel"
                )

        channel = ChannelService.update_channel(
            db=db,
            channel_id=channel_id,
            name=channel_data.name,
            description=channel_data.description,
            status=ChannelStatus(channel_data.status) if channel_data.status else None,
            business_type=BusinessType(channel_data.business_type) if channel_data.business_type else None,
            contact_person=channel_data.contact_person,
            contact_email=channel_data.contact_email,
            contact_phone=channel_data.contact_phone,
            last_modified_by=user_id
        )

        if not channel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Channel not found"
            )

        return channel
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


@router.delete("/{channel_id}")
def delete_channel(
    channel_id: UUID,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_role = _resolve_user_role(current_user)
    if user_role not in {UserRole.admin, UserRole.manager}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or managers can delete channels"
        )

    success = ChannelService.delete_channel(db, channel_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    return {"message": "Channel deleted successfully"}


def _resolve_user_role(current_user: Dict[str, Any]) -> UserRole:
    role_value = current_user.get("role")
    if not role_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: role not found"
        )

    try:
        return UserRole(role_value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user role"
        )


def _resolve_user_id(current_user: Dict[str, Any]) -> UUID:
    user_id_value = current_user.get("sub")
    if not user_id_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user ID not found"
        )

    try:
        return UUID(user_id_value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
