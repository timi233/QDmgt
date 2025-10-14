from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from enum import Enum as PyEnum
from ..database import Base, GUID


class ChannelStatus(PyEnum):
    """Channel status values"""
    active = "active"
    inactive = "inactive"
    suspended = "suspended"


class BusinessType(PyEnum):
    """Business type categories"""
    basic = "basic"
    high_value = "high-value"
    pending_signup = "pending-signup"


class Channel(Base):
    __tablename__ = "channels"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(Enum(ChannelStatus), nullable=False, default=ChannelStatus.active, index=True)
    business_type = Column(Enum(BusinessType), nullable=False, default=BusinessType.basic, index=True)
    contact_person = Column(String(100), nullable=True)
    contact_email = Column(String(255), nullable=True)  # Validated at application level
    contact_phone = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    last_modified_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    last_modifier = relationship("User", foreign_keys=[last_modified_by])
    
    def __repr__(self):
        return f"<Channel(id={self.id}, name='{self.name}', status='{self.status}')>"