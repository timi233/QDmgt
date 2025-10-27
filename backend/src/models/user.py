from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from enum import Enum as PyEnum
from ..database import Base, GUID


class UserRole(PyEnum):
    """User roles in the system"""
    admin = "admin"
    manager = "manager"
    user = "user"


class User(Base):
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    username = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.user)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}', role='{self.role.value}')>"