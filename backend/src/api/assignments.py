from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from ..database import get_db
from ..models.assignment import ChannelAssignment, PermissionLevel
from ..models.user import User
from ..models.channel import Channel
from ..services.assignment_service import AssignmentService
from ..utils.exceptions import ValidationError, NotFoundError, ConflictError
from ..utils.logger import logger
from ..auth.auth_service import get_current_user
from pydantic import BaseModel
from enum import Enum


router = APIRouter(prefix="/assignments", tags=["assignments"])


# Pydantic models for request/response
class PermissionLevelEnum(str, Enum):
    read = "read"
    write = "write"
    admin = "admin"

class AssignmentCreateRequest(BaseModel):
    user_id: UUID
    channel_id: UUID
    permission_level: PermissionLevelEnum = PermissionLevelEnum.read
    target_responsibility: bool = False

class AssignmentUpdateRequest(BaseModel):
    permission_level: Optional[PermissionLevelEnum] = None
    target_responsibility: Optional[bool] = None

class AssignmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    channel_id: UUID
    permission_level: str
    assigned_at: datetime
    assigned_by: UUID
    target_responsibility: bool
    updated_at: Optional[datetime] = None
    created_at: Optional[datetime] = None  # Alias for assigned_at (computed in response)

    class Config:
        from_attributes = True

    def __init__(self, **data):
        super().__init__(**data)
        # Set created_at from assigned_at if not provided
        if self.created_at is None and self.assigned_at:
            object.__setattr__(self, 'created_at', self.assigned_at)

class AssignmentListResponse(BaseModel):
    assignments: List[AssignmentResponse]
    total: int
    skip: int
    limit: int
    pages: int

    class Config:
        from_attributes = True


@router.post("/", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
    assignment_data: AssignmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        # Get current user ID from authenticated user
        logger.debug(f"Current user data: {current_user}")
        user_id_str = current_user.get("sub")
        if not user_id_str:
            logger.error("No user ID found in current_user token", extra={"current_user": current_user})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token - no user ID found"
            )
        try:
            current_user_id = UUID(user_id_str)
        except ValueError as e:
            logger.error(f"Invalid UUID format in user token: {user_id_str}", extra={"error": str(e)})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user ID format in authentication token"
            )

        # Validate permission level for regular users
        user = db.query(User).filter(User.id == str(assignment_data.user_id)).first()
        if user and user.role == "user" and assignment_data.permission_level == "admin":
            logger.warning("Attempted to assign admin permission to regular user", extra={
                "user_id": str(assignment_data.user_id),
                "user_role": user.role
            })
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="普通用户只能被分配只读或编辑权限"
            )

        logger.info("Creating new channel assignment", extra={
            "user_id": str(assignment_data.user_id),
            "channel_id": str(assignment_data.channel_id),
            "permission_level": assignment_data.permission_level,
            "assigned_by": str(current_user_id)
        })

        assignment = AssignmentService.create_assignment(
            db=db,
            user_id=assignment_data.user_id,
            channel_id=assignment_data.channel_id,
            permission_level=PermissionLevel(assignment_data.permission_level),
            assigned_by=current_user_id,
            target_responsibility=assignment_data.target_responsibility
        )

        logger.info("Channel assignment created successfully", extra={
            "assignment_id": str(assignment.id),
            "user_id": str(assignment.user_id),
            "channel_id": str(assignment.channel_id)
        })

        return assignment
    except ValidationError as e:
        logger.warning("Validation error creating assignment", extra={
            "error": e.detail,
            "user_id": str(assignment_data.user_id),
            "channel_id": str(assignment_data.channel_id)
        })
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.detail
        )
    except NotFoundError as e:
        logger.warning("User or channel not found when creating assignment", extra={
            "error": e.detail,
            "user_id": str(assignment_data.user_id),
            "channel_id": str(assignment_data.channel_id)
        })
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.detail
        )
    except ConflictError as e:
        logger.warning("Conflict error creating assignment", extra={
            "error": e.detail,
            "user_id": str(assignment_data.user_id),
            "channel_id": str(assignment_data.channel_id)
        })
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.detail
        )
    except Exception as e:
        logger.error("Unexpected error creating assignment", extra={
            "error": str(e),
            "user_id": str(assignment_data.user_id),
            "channel_id": str(assignment_data.channel_id)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )


@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db)
):
    logger.debug("Fetching assignment by ID", extra={"assignment_id": str(assignment_id)})
    
    assignment = AssignmentService.get_assignment_by_id(db, assignment_id)
    if not assignment:
        logger.warning("Assignment not found", extra={"assignment_id": str(assignment_id)})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    logger.info("Assignment retrieved successfully", extra={"assignment_id": str(assignment_id)})
    return assignment


@router.get("/user/{user_id}", response_model=AssignmentListResponse)
def get_assignments_by_user(
    user_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    logger.debug("Fetching assignments by user ID", extra={"user_id": str(user_id)})

    # Get assignments with pagination from service
    result = AssignmentService.get_assignments_by_user(db, user_id, skip=skip, limit=limit)

    response = AssignmentListResponse(**result)

    logger.info("Assignments retrieved for user", extra={
        "user_id": str(user_id),
        "total_assignments": result["total"],
        "returned_count": len(result["assignments"])
    })

    return response


@router.get("/channel/{channel_id}", response_model=AssignmentListResponse)
def get_assignments_by_channel(
    channel_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    logger.debug("Fetching assignments by channel ID", extra={"channel_id": str(channel_id)})

    # Get assignments with pagination from service
    result = AssignmentService.get_assignments_by_channel(db, channel_id, skip=skip, limit=limit)

    response = AssignmentListResponse(**result)

    logger.info("Assignments retrieved for channel", extra={
        "channel_id": str(channel_id),
        "total_assignments": result["total"],
        "returned_count": len(result["assignments"])
    })

    return response


@router.put("/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(
    assignment_id: UUID,
    assignment_data: AssignmentUpdateRequest,
    db: Session = Depends(get_db)
):
    try:
        # Get existing assignment to validate user role
        existing_assignment = AssignmentService.get_assignment_by_id(db, assignment_id)
        if not existing_assignment:
            logger.warning("Assignment not found for update", extra={"assignment_id": str(assignment_id)})
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )

        # Validate permission level for regular users
        if assignment_data.permission_level:
            user = db.query(User).filter(User.id == str(existing_assignment.user_id)).first()
            if user and user.role == "user" and assignment_data.permission_level == "admin":
                logger.warning("Attempted to assign admin permission to regular user", extra={
                    "assignment_id": str(assignment_id),
                    "user_id": str(existing_assignment.user_id),
                    "user_role": user.role
                })
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="普通用户只能被分配只读或编辑权限"
                )

        logger.info("Updating assignment", extra={
            "assignment_id": str(assignment_id),
            "permission_level": assignment_data.permission_level,
            "target_responsibility": assignment_data.target_responsibility
        })

        assignment = AssignmentService.update_assignment(
            db=db,
            assignment_id=assignment_id,
            permission_level=PermissionLevel(assignment_data.permission_level)
                if assignment_data.permission_level else None,
            target_responsibility=assignment_data.target_responsibility
        )

        if not assignment:
            logger.warning("Assignment not found for update", extra={"assignment_id": str(assignment_id)})
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )

        logger.info("Assignment updated successfully", extra={"assignment_id": str(assignment_id)})
        return assignment
    except HTTPException:
        raise  # Re-raise HTTPException as-is
    except ValidationError as e:
        logger.warning("Validation error updating assignment", extra={
            "error": e.detail,
            "assignment_id": str(assignment_id)
        })
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.detail
        )
    except Exception as e:
        logger.error("Unexpected error updating assignment", extra={
            "error": str(e),
            "assignment_id": str(assignment_id)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db)
):
    logger.info("Deleting assignment", extra={"assignment_id": str(assignment_id)})
    
    success = AssignmentService.delete_assignment(db, assignment_id)
    if not success:
        logger.warning("Assignment not found for deletion", extra={"assignment_id": str(assignment_id)})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    logger.info("Assignment deleted successfully", extra={"assignment_id": str(assignment_id)})
    
    return {"message": "Assignment deleted successfully"}


@router.get("/{assignment_id}/permission-check/{required_permission}")
def check_user_permission(
    assignment_id: UUID,
    required_permission: str,
    db: Session = Depends(get_db)
):
    logger.debug("Checking user permission", extra={
        "assignment_id": str(assignment_id),
        "required_permission": required_permission
    })
    
    assignment = AssignmentService.get_assignment_by_id(db, assignment_id)
    if not assignment:
        logger.warning("Assignment not found for permission check", extra={"assignment_id": str(assignment_id)})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    try:
        required_perm = PermissionLevel(required_permission)

        # Map permission levels to numeric values for comparison
        permission_values = {
            PermissionLevel.read: 1,
            PermissionLevel.write: 2,
            PermissionLevel.admin: 3
        }

        user_value = permission_values[assignment.permission_level]
        required_value = permission_values[required_perm]

        has_perm = user_value >= required_value
        result = {"has_permission": has_perm, "user_permission": assignment.permission_level.value}
        
        logger.info("Permission check completed", extra={
            "assignment_id": str(assignment_id),
            "required_permission": required_permission,
            "has_permission": has_perm
        })
        
        return result
    except ValueError:
        logger.warning("Invalid permission level for check", extra={
            "assignment_id": str(assignment_id),
            "invalid_permission": required_permission
        })
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid permission level"
        )