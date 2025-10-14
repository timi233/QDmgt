from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, DECIMAL, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from enum import Enum as PyEnum
from ..database import Base, GUID

class TargetPlan(Base):
    __tablename__ = "channel_targets"
    __table_args__ = (
        UniqueConstraint('channel_id', 'year', 'quarter', 'month', name='uix_channel_period'),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    channel_id = Column(GUID, ForeignKey("channels.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    quarter = Column(Integer, nullable=False, index=True)  # 1-4
    month = Column(Integer, nullable=True, index=True)  # 1-12, optional
    performance_target = Column(DECIMAL(10, 2), nullable=True)  # in W (tens of thousands)
    opportunity_target = Column(DECIMAL(10, 2), nullable=True)  # in W (tens of thousands)
    project_count_target = Column(Integer, nullable=True)
    development_goal = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    
    # Achievement tracking
    achieved_performance = Column(DECIMAL(10, 2), default=0)  # in W (tens of thousands)
    achieved_opportunity = Column(DECIMAL(10, 2), default=0)  # in W (tens of thousands)
    achieved_project_count = Column(Integer, default=0)
    
    # Relationships
    channel = relationship("Channel", backref="targets")
    creator = relationship("User", backref="created_targets")
    
    def __repr__(self):
        return f"<TargetPlan(id={self.id}, channel_id={self.channel_id}, year={self.year}, quarter={self.quarter})>"