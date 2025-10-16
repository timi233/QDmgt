"""
Pytest Configuration and Fixtures for Channel Management System Tests

This module provides shared test fixtures and configuration for all test suites.
"""

import pytest
from typing import Generator, Dict, Any
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from fastapi.testclient import TestClient
import uuid

# Import application modules
from ..database import Base, get_db
from ..main import create_app
from ..models.user import User, UserRole
from ..models.channel import Channel, ChannelStatus, BusinessType
from ..auth.auth_service import AuthService, AuthManager, get_current_user
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import HTTPException, status, Depends, Request


# =============================================================================
# SQLite UUID Type Support
# =============================================================================

class UUID(TypeDecorator):
    """
    Platform-independent UUID type.
    Uses PostgreSQL's UUID type when available, otherwise uses CHAR(36) for SQLite.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID())
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if isinstance(value, uuid.UUID):
                return value
            return uuid.UUID(value)


# =============================================================================
# Database Fixtures
# =============================================================================

@pytest.fixture(scope="session")
def test_engine():
    """
    Create a SQLite in-memory database engine for testing

    Scope: session - shared across all tests in the session
    """
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
    from sqlalchemy import String

    # Create an in-memory SQLite database for testing
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False  # Set to True for SQL debugging
    )

    # Replace UUID columns with String for SQLite compatibility
    @event.listens_for(Base.metadata, "before_create")
    def replace_uuid_with_string(target, connection, **kw):
        """Replace PostgreSQL UUID columns with String for SQLite"""
        for table in target.tables.values():
            for column in table.columns:
                if isinstance(column.type, PG_UUID):
                    column.type = String(36)

    # Create all tables
    Base.metadata.create_all(bind=engine)

    yield engine

    # Cleanup: drop all tables after tests
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(test_engine) -> Generator[Session, None, None]:
    """
    Create a new database session for a test

    Scope: function - new session for each test
    Automatically rolls back changes after each test
    """
    # Create a new session factory
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine
    )

    # Create a new session
    session = TestingSessionLocal()

    # Start a transaction
    connection = test_engine.connect()
    transaction = connection.begin()

    # Bind the session to the connection
    session = TestingSessionLocal(bind=connection)

    yield session

    # Rollback the transaction after the test
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def db(db_session: Session) -> Session:
    """
    Alias for db_session fixture for shorter name
    """
    return db_session


# =============================================================================
# FastAPI Test Client Fixtures
# =============================================================================

def make_current_user_override(auth_manager: AuthManager):
    """
    Create a synchronous version of get_current_user for TestClient compatibility.

    TestClient is based on requests library and doesn't support async dependencies.
    This override provides a synchronous authentication dependency for tests.

    It parses the Authorization header manually to avoid async dependency issues.
    """
    def get_current_user_sync(request: Request) -> Dict[str, Any]:
        """Synchronous dependency to get current authenticated user from request"""
        # Manually parse Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authorization header",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Expect "Bearer <token>" format
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header format",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = parts[1]

        try:
            # Use auth_manager's synchronous verify_token method
            payload = auth_manager.verify_token(token)

            if payload is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            return payload

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication error: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return get_current_user_sync


@pytest.fixture(scope="function")
def client(db_session: Session, auth_manager: AuthManager) -> TestClient:
    """
    Create a FastAPI test client with database and auth overrides

    Scope: function - new client for each test

    Overrides:
    - get_db: Use test database session
    - get_current_user: Use synchronous version for TestClient compatibility
    """
    app = create_app()

    # Override the get_db dependency to use test database
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    # Override async get_current_user with synchronous version for TestClient
    app.dependency_overrides[get_current_user] = make_current_user_override(auth_manager)

    with TestClient(app) as test_client:
        yield test_client

    # Clean up
    app.dependency_overrides.clear()


# =============================================================================
# User Fixtures
# =============================================================================

@pytest.fixture(scope="function")
def auth_manager() -> AuthManager:
    """
    Create an AuthManager instance for testing
    """
    return AuthManager()


@pytest.fixture(scope="function")
def test_user_data() -> Dict[str, Any]:
    """
    Provide test user data
    """
    return {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "TestPass123!",
        "full_name": "Test User",
        "role": UserRole.user
    }


@pytest.fixture(scope="function")
def test_admin_data() -> Dict[str, Any]:
    """
    Provide test admin user data
    """
    return {
        "username": "admin",
        "email": "admin@example.com",
        "password": "AdminPass123!",
        "full_name": "Admin User",
        "role": UserRole.admin
    }


@pytest.fixture(scope="function")
def test_manager_data() -> Dict[str, Any]:
    """
    Provide test manager user data
    """
    return {
        "username": "manager",
        "email": "manager@example.com",
        "password": "ManagerPass123!",
        "full_name": "Manager User",
        "role": UserRole.manager
    }


@pytest.fixture(scope="function")
def test_user(db_session: Session, test_user_data: Dict[str, Any], auth_manager: AuthManager) -> User:
    """
    Create a test user in the database
    """
    user = User(
        id=str(uuid.uuid4()),  # Convert UUID to string for SQLite
        username=test_user_data["username"],
        email=test_user_data["email"],
        hashed_password=auth_manager.hash_password(test_user_data["password"]),
        full_name=test_user_data["full_name"],
        role=test_user_data["role"],
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_admin(db_session: Session, test_admin_data: Dict[str, Any], auth_manager: AuthManager) -> User:
    """
    Create a test admin user in the database
    """
    admin = User(
        id=str(uuid.uuid4()),  # Convert UUID to string for SQLite
        username=test_admin_data["username"],
        email=test_admin_data["email"],
        hashed_password=auth_manager.hash_password(test_admin_data["password"]),
        full_name=test_admin_data["full_name"],
        role=test_admin_data["role"],
        is_active=True
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture(scope="function")
def test_manager(db_session: Session, test_manager_data: Dict[str, Any], auth_manager: AuthManager) -> User:
    """
    Create a test manager user in the database
    """
    manager = User(
        id=str(uuid.uuid4()),  # Convert UUID to string for SQLite
        username=test_manager_data["username"],
        email=test_manager_data["email"],
        hashed_password=auth_manager.hash_password(test_manager_data["password"]),
        full_name=test_manager_data["full_name"],
        role=test_manager_data["role"],
        is_active=True
    )
    db_session.add(manager)
    db_session.commit()
    db_session.refresh(manager)
    return manager


# =============================================================================
# Authentication Token Fixtures
# =============================================================================

@pytest.fixture(scope="function")
def user_token(test_user: User, auth_manager: AuthManager) -> str:
    """
    Generate an access token for test user
    """
    return auth_manager.create_access_token(data={
        "sub": str(test_user.id),  # Convert UUID to string for JSON serialization
        "username": test_user.username,
        "email": test_user.email,
        "role": test_user.role.value  # Convert enum to string value
    })


@pytest.fixture(scope="function")
def admin_token(test_admin: User, auth_manager: AuthManager) -> str:
    """
    Generate an access token for test admin
    """
    return auth_manager.create_access_token(data={
        "sub": str(test_admin.id),  # Convert UUID to string for JSON serialization
        "username": test_admin.username,
        "email": test_admin.email,
        "role": test_admin.role.value  # Convert enum to string value
    })


@pytest.fixture(scope="function")
def manager_token(test_manager: User, auth_manager: AuthManager) -> str:
    """
    Generate an access token for test manager
    """
    return auth_manager.create_access_token(data={
        "sub": str(test_manager.id),  # Convert UUID to string for JSON serialization
        "username": test_manager.username,
        "email": test_manager.email,
        "role": test_manager.role.value  # Convert enum to string value
    })


@pytest.fixture(scope="function")
def auth_headers_user(user_token: str) -> Dict[str, str]:
    """
    Generate authorization headers for test user
    """
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture(scope="function")
def auth_headers_admin(admin_token: str) -> Dict[str, str]:
    """
    Generate authorization headers for test admin
    """
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="function")
def auth_headers_manager(manager_token: str) -> Dict[str, str]:
    """
    Generate authorization headers for test manager
    """
    return {"Authorization": f"Bearer {manager_token}"}


# =============================================================================
# Channel Fixtures
# =============================================================================

@pytest.fixture(scope="function")
def test_channel_data() -> Dict[str, Any]:
    """
    Provide test channel data
    """
    return {
        "name": "Test Channel",
        "description": "Test channel description",
        "status": ChannelStatus.active,
        "business_type": BusinessType.basic,
        "contact_email": "channel@example.com",
        "contact_phone": "+1234567890"
    }


@pytest.fixture(scope="function")
def test_channel(db_session: Session, test_channel_data: Dict[str, Any], test_admin: User) -> Channel:
    """
    Create a test channel in the database
    """
    channel = Channel(
        id=str(uuid.uuid4()),  # Convert UUID to string for SQLite
        name=test_channel_data["name"],
        description=test_channel_data["description"],
        status=test_channel_data["status"],
        business_type=test_channel_data["business_type"],
        contact_email=test_channel_data["contact_email"],
        contact_phone=test_channel_data["contact_phone"],
        created_by=test_admin.id,
        last_modified_by=test_admin.id
    )
    db_session.add(channel)
    db_session.commit()
    db_session.refresh(channel)
    return channel


# =============================================================================
# Pytest Configuration
# =============================================================================

def pytest_configure(config):
    """
    Custom pytest configuration
    """
    # Add custom markers
    config.addinivalue_line("markers", "unit: mark test as a unit test")
    config.addinivalue_line("markers", "integration: mark test as an integration test")
    config.addinivalue_line("markers", "slow: mark test as slow running")
    config.addinivalue_line("markers", "security: mark test as a security test")
    config.addinivalue_line("markers", "cli: mark test as a CLI test")
