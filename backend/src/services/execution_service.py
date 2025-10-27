from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from ..models.execution_plan import ExecutionPlan, PlanType, ExecutionStatus
from ..models.user import User
from ..models.channel import Channel
from ..utils.exceptions import ValidationError, NotFoundError, ConflictError
from ..utils.validators import validate_plan_period
import uuid


class ExecutionPlanService:
    @staticmethod
    def create_execution_plan(
        db: Session,
        channel_id: uuid.UUID,
        user_id: uuid.UUID,
        plan_type: PlanType,
        plan_period: str,  # Format: YYYY-MM for monthly, YYYY-WW for weekly
        plan_content: str,
        execution_status: Optional[str] = None,
        key_obstacles: Optional[str] = None,
        next_steps: Optional[str] = None,
        created_by: uuid.UUID = None
    ) -> ExecutionPlan:
        # Validate plan period format
        validate_plan_period(plan_period, plan_type.value)
        
        # Convert UUID to string for SQLite compatibility
        user_id_str = str(user_id) if isinstance(user_id, uuid.UUID) else user_id
        channel_id_str = str(channel_id) if isinstance(channel_id, uuid.UUID) else channel_id

        # Check if user exists
        user = db.query(User).filter(User.id == user_id_str).first()
        if not user:
            raise NotFoundError(f"User with ID {user_id} not found")

        # Check if channel exists
        channel = db.query(Channel).filter(Channel.id == channel_id_str).first()
        if not channel:
            raise NotFoundError(f"Channel with ID {channel_id} not found")

        execution_plan = ExecutionPlan(
            id=str(uuid.uuid4()),  # Explicitly set ID as string
            channel_id=channel_id_str,
            user_id=user_id_str,
            plan_type=plan_type,
            plan_period=plan_period,
            plan_content=plan_content,
            execution_status=execution_status,
            key_obstacles=key_obstacles,
            next_steps=next_steps,
            status=ExecutionStatus.planned  # Default to planned
        )
        
        db.add(execution_plan)
        db.commit()
        db.refresh(execution_plan)
        
        return execution_plan

    @staticmethod
    def get_execution_plan_by_id(db: Session, execution_plan_id: uuid.UUID) -> Optional[ExecutionPlan]:
        # Convert UUID to string for SQLite compatibility
        execution_plan_id_str = str(execution_plan_id) if isinstance(execution_plan_id, uuid.UUID) else execution_plan_id
        return db.query(ExecutionPlan).filter(ExecutionPlan.id == execution_plan_id_str).first()

    @staticmethod
    def get_execution_plans_by_channel(
        db: Session,
        channel_id: uuid.UUID,
        plan_type: Optional[PlanType] = None,
        status: Optional[ExecutionStatus] = None,
        plan_period: Optional[str] = None
    ) -> List[ExecutionPlan]:
        # Convert UUID to string for SQLite compatibility
        channel_id_str = str(channel_id) if isinstance(channel_id, uuid.UUID) else channel_id
        query = db.query(ExecutionPlan).filter(ExecutionPlan.channel_id == channel_id_str)
        
        if plan_type:
            query = query.filter(ExecutionPlan.plan_type == plan_type)
        
        if status:
            query = query.filter(ExecutionPlan.status == status)
        
        if plan_period:
            query = query.filter(ExecutionPlan.plan_period == plan_period)
        
        return query.all()

    @staticmethod
    def get_execution_plans_by_user(
        db: Session,
        user_id: uuid.UUID,
        plan_type: Optional[PlanType] = None,
        status: Optional[ExecutionStatus] = None,
        plan_period: Optional[str] = None
    ) -> List[ExecutionPlan]:
        # Convert UUID to string for SQLite compatibility
        user_id_str = str(user_id) if isinstance(user_id, uuid.UUID) else user_id
        query = db.query(ExecutionPlan).filter(ExecutionPlan.user_id == user_id_str)
        
        if plan_type:
            query = query.filter(ExecutionPlan.plan_type == plan_type)
        
        if status:
            query = query.filter(ExecutionPlan.status == status)
        
        if plan_period:
            query = query.filter(ExecutionPlan.plan_period == plan_period)
        
        return query.all()

    @staticmethod
    def update_execution_plan(
        db: Session,
        execution_plan_id: uuid.UUID,
        plan_content: Optional[str] = None,
        execution_status: Optional[str] = None,
        key_obstacles: Optional[str] = None,
        next_steps: Optional[str] = None,
        status: Optional[ExecutionStatus] = None
    ) -> Optional[ExecutionPlan]:
        # Convert UUID to string for SQLite compatibility
        execution_plan_id_str = str(execution_plan_id) if isinstance(execution_plan_id, uuid.UUID) else execution_plan_id
        execution_plan = db.query(ExecutionPlan).filter(
            ExecutionPlan.id == execution_plan_id_str
        ).first()
        
        if not execution_plan:
            return None
        
        # Update fields if provided
        if plan_content is not None:
            execution_plan.plan_content = plan_content
        if execution_status is not None:
            execution_plan.execution_status = execution_status
        if key_obstacles is not None:
            execution_plan.key_obstacles = key_obstacles
        if next_steps is not None:
            execution_plan.next_steps = next_steps
        if status is not None:
            execution_plan.status = status
        
        db.commit()
        db.refresh(execution_plan)
        
        return execution_plan

    @staticmethod
    def delete_execution_plan(db: Session, execution_plan_id: uuid.UUID) -> bool:
        # Convert UUID to string for SQLite compatibility
        execution_plan_id_str = str(execution_plan_id) if isinstance(execution_plan_id, uuid.UUID) else execution_plan_id
        execution_plan = db.query(ExecutionPlan).filter(
            ExecutionPlan.id == execution_plan_id_str
        ).first()
        
        if not execution_plan:
            return False
        
        db.delete(execution_plan)
        db.commit()
        
        return True

    @staticmethod
    def update_execution_status(
        db: Session,
        execution_plan_id: uuid.UUID,
        status: ExecutionStatus,
        execution_status: Optional[str] = None,
        key_obstacles: Optional[str] = None,
        next_steps: Optional[str] = None
    ) -> Optional[ExecutionPlan]:
        # Convert UUID to string for SQLite compatibility
        execution_plan_id_str = str(execution_plan_id) if isinstance(execution_plan_id, uuid.UUID) else execution_plan_id
        execution_plan = db.query(ExecutionPlan).filter(
            ExecutionPlan.id == execution_plan_id_str
        ).first()

        if not execution_plan:
            return None

        # Update status enum
        execution_plan.status = status

        # Update optional text fields if provided
        if execution_status is not None:
            execution_plan.execution_status = execution_status
        if key_obstacles is not None:
            execution_plan.key_obstacles = key_obstacles
        if next_steps is not None:
            execution_plan.next_steps = next_steps

        db.commit()
        db.refresh(execution_plan)

        return execution_plan