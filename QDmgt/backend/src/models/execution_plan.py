from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from enum import Enum as PyEnum
from ..database import Base, GUID

class PlanType(PyEnum):
    monthly = "monthly"
    weekly = "weekly"

class ExecutionStatus(PyEnum):
    planned = "planned"
    in_progress = "in-progress"
    completed = "completed"
    archived = "archived"

class ExecutionPlan(Base):
    __tablename__ = "execution_plans"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    channel_id = Column(GUID, ForeignKey("channels.id"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id"), nullable=False, index=True)
    plan_type = Column(Enum(PlanType), nullable=False, index=True)
    plan_period = Column(String(20), nullable=False, index=True)  # Format: YYYY-MM for monthly, YYYY-WW for weekly
    plan_content = Column(Text, nullable=False)
    execution_status = Column(Text, nullable=True)  # For weekly tracking
    key_obstacles = Column(Text, nullable=True)  # For weekly tracking
    next_steps = Column(Text, nullable=True)  # For weekly tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    status = Column(Enum(ExecutionStatus), nullable=False, default=ExecutionStatus.planned, index=True)
    
    # Relationships
    channel = relationship("Channel", backref="execution_plans")
    user = relationship("User", backref="execution_plans")
    
    def __repr__(self):
        return f"<ExecutionPlan(id={self.id}, channel_id={self.channel_id}, user_id={self.user_id}, plan_type='{self.plan_type}', plan_period='{self.plan_period}')>"