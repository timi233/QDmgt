from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from enum import Enum as PyEnum
from ..database import Base, GUID


class PermissionLevel(PyEnum):
    """Permission levels for channel access"""
    read = "read"
    write = "write"
    admin = "admin"


class ChannelAssignment(Base):
    __tablename__ = "channel_assignments"
    __table_args__ = (
        UniqueConstraint('user_id', 'channel_id', name='uix_user_channel'),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id"), nullable=False, index=True)
    channel_id = Column(GUID, ForeignKey("channels.id"), nullable=False, index=True)
    permission_level = Column(Enum(PermissionLevel), nullable=False, index=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    assigned_by = Column(GUID, ForeignKey("users.id"), nullable=False, index=True)
    target_responsibility = Column(Boolean, nullable=False, default=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="channel_assignments")
    channel = relationship("Channel", backref="assignments")
    assigner = relationship("User", foreign_keys=[assigned_by])
    
    def __repr__(self):
        return f"<ChannelAssignment(id={self.id}, user_id={self.user_id}, channel_id={self.channel_id}, permission_level='{self.permission_level}')>"