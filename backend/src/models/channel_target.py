from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, DECIMAL, UniqueConstraint, JSON, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from enum import Enum as PyEnum
from ..database import Base, GUID


class TargetType(PyEnum):
    """Target type: person or channel"""
    person = "person"
    channel = "channel"


class PeriodType(PyEnum):
    """Period granularity: quarter or month"""
    quarter = "quarter"
    month = "month"


class UnifiedTarget(Base):
    """Unified target model supporting person/channel and quarter/month periods."""

    __tablename__ = "unified_targets"
    __table_args__ = (
        UniqueConstraint(
            'target_type', 'target_id', 'period_type', 'year', 'quarter', 'month',
            name='uix_target_period'
        ),
        CheckConstraint(
            "(period_type = 'quarter' AND month IS NULL) OR (period_type = 'month' AND month IS NOT NULL)",
            name='chk_period_consistency'
        ),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)

    target_type = Column(Enum(TargetType), nullable=False, index=True)
    target_id = Column(GUID, nullable=False, index=True)

    period_type = Column(Enum(PeriodType), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    quarter = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=True, index=True)

    new_signing_target = Column(Integer, default=0, nullable=False)
    core_opportunity_target = Column(Integer, default=0, nullable=False)
    core_performance_target = Column(Integer, default=0, nullable=False)
    high_value_opportunity_target = Column(Integer, default=0, nullable=False)
    high_value_performance_target = Column(Integer, default=0, nullable=False)

    new_signing_achieved = Column(Integer, default=0, nullable=False)
    core_opportunity_achieved = Column(Integer, default=0, nullable=False)
    core_performance_achieved = Column(Integer, default=0, nullable=False)
    high_value_opportunity_achieved = Column(Integer, default=0, nullable=False)
    high_value_performance_achieved = Column(Integer, default=0, nullable=False)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    last_modified_by = Column(GUID, ForeignKey("users.id"), nullable=False)

    creator = relationship("User", foreign_keys=[created_by])
    last_modifier = relationship("User", foreign_keys=[last_modified_by])

    def __repr__(self):
        return (
            f"<UnifiedTarget(id={self.id}, target_type={self.target_type}, "
            f"target_id={self.target_id}, year={self.year}, quarter={self.quarter}, "
            f"month={self.month})>"
        )


# DEPRECATED: TargetPlan model is deprecated, use UnifiedTarget instead
# This model is kept only for historical compatibility.
# The 'channel_targets' table no longer exists in the database.
# All target management has been migrated to 'unified_targets' table.
# Planned removal date: 2025-04-16
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
