# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Channel Management System - A comprehensive solution for managing sales channels, setting targets, tracking assignments, and monitoring execution progress. Built with FastAPI backend, React frontend, and PostgreSQL database.

## Development Commands

### Backend

**Start development server:**
```bash
cd backend
uvicorn src.main:app --reload
# API docs available at http://localhost:8000/docs
```

**Run tests:**
```bash
cd backend
python -m pytest src/tests/
# For specific test file:
python -m pytest src/tests/security_test.py
# With coverage:
python -m pytest --cov=src src/tests/
```

**Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

**Initialize database:**
```bash
python -m backend.src.cli.main init-db
```

### Frontend

**Start development server:**
```bash
cd frontend
npm start
# UI available at http://localhost:3000
```

**Build for production:**
```bash
cd frontend
npm run build
```

**Run tests:**
```bash
cd frontend
npm test
```

### CLI Tools

The system includes CLI tools accessible via `backend/src/cli/main.py`:
- `init-db`: Initialize database tables
- `create-user`: Create new users
- `create-channel`: Create channels
- `list-channels`: List channels with filtering
- `assign-channel`: Assign channels to users
- `create-target`: Create target plans
- `health`: System health check

## Architecture

### Core Structure

The application follows a library-first, CLI-driven architecture based on the project constitution (`.specify/memory/constitution.md`):

1. **Library-First**: Every feature starts as a standalone, testable library
2. **CLI Interface**: All functionality exposed via CLI with text in/out protocol
3. **Test-First (TDD)**: Tests must be written and approved before implementation
4. **Integration Testing**: Contract tests for library boundaries and service communication
5. **Observability**: Structured logging with MAJOR.MINOR.BUILD versioning

### Backend Architecture (`backend/src/`)

- `main.py`: FastAPI application entry point with route registration
- `database.py`: SQLAlchemy setup with `get_db()` dependency and `create_tables()`
- `models/`: SQLAlchemy ORM models
  - `user.py`: User model with roles (admin, manager, user)
  - `channel.py`: Channel model with status (active, inactive, suspended) and business_type enums
  - `channel_target.py`: Target planning for channels (quarterly/monthly)
  - `assignment.py`: User-channel assignments with permission levels
  - `execution_plan.py`: Monthly/weekly execution tracking
- `api/`: FastAPI routers for REST endpoints
  - `channels.py`, `targets.py`, `assignments.py`, `execution_plans.py`
- `services/`: Business logic layer
  - Service classes handle CRUD operations and business rules
- `auth/`: Authentication and authorization
  - JWT-based auth with role-based access control
- `security/`: Security hardening, audit logging, monitoring
- `middleware/`: Security middleware for headers, rate limiting, input validation
- `config/`: Application settings and configuration
- `cli/`: Command-line interface tools
- `tests/`: Pytest test suites including security and unit tests

### Frontend Architecture (`frontend/src/`)

- `components/`: Reusable UI components
- `features/`: Feature-specific components
- `pages/`: Page components for routing
- `services/`: API client services
- `hooks/`: Custom React hooks
- `utils/`: Utility functions

### Data Model Relationships

Key relationships (see `specs/001-channel-management/data-model.md`):
- Users create and manage Channels
- Channels have ChannelAssignments linking them to Users with permission levels
- Channels have ChannelTargets for quarterly/monthly planning
- ExecutionPlans track monthly/weekly execution for Channels

### Database

- PostgreSQL 13+ with SQLAlchemy ORM
- Models use UUID primary keys
- Enum types for status fields (ChannelStatus, BusinessType, permission levels)
- Timestamps use `server_default=func.now()` for created_at
- Foreign key relationships with explicit `relationship()` definitions

## Key Conventions

### Constitution Requirements (Non-Negotiable)

1. **TDD Mandatory**: Tests → User approval → Tests fail → Implementation (Red-Green-Refactor)
2. **Library-First**: Features must be standalone, independently testable libraries
3. **CLI Protocol**: stdin/args → stdout for results, stderr for errors
4. **Quality Gates**:
   - Unit test coverage >= 80%
   - Integration test coverage >= 70%
   - Security scans must pass
   - Performance benchmarks must meet standards

### Security Standards

- JWT authentication with role-based access control
- Password hashing with PBKDF2 or stronger
- Input validation for all user data (prevents SQL injection, XSS, CSRF)
- Rate limiting to prevent brute force attacks
- Security headers (CSP, XSS Protection, Frame Options)
- Audit logging for security events (see `security/audit.py`)

### Performance Standards

- API response time < 200ms p95
- Search performance < 2 seconds for 10,000 channels
- Memory usage < 100MB per service
- Support 1,000+ concurrent users

### Code Style

- Python: PEP 8 with Black formatting
- JavaScript/TypeScript: ESLint with Prettier
- All services follow service pattern with CRUD operations
- Use dependency injection via FastAPI's `Depends()`

## Common Patterns

### Adding a New API Endpoint

1. Define Pydantic schemas in `api/` router file
2. Implement service method in appropriate `services/` module
3. Add route handler in `api/` router
4. Register router in `main.py` via `app.include_router()`
5. Write tests in `tests/`

### Database Models

- Use UUID for primary keys: `Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)`
- Timestamps: `Column(DateTime(timezone=True), server_default=func.now())`
- Enums: Define Python enum class, use `Column(Enum(EnumClass))`
- Foreign keys: `Column(UUID(as_uuid=True), ForeignKey("table.id"))`
- Relationships: `relationship("Model", foreign_keys=[column])`

### Authentication

- JWT tokens created in `auth/auth_service.py`
- Protected routes use `Depends()` with auth middleware
- Roles: admin (full access), manager (channel management), user (assigned channels only)
- Permission levels: read, write, admin

### Error Handling

- Custom exceptions in `utils/exceptions.py`
- HTTP exceptions raised in API layer
- Business logic errors in service layer
- All errors logged with structured logging

## Important Files

- `.specify/memory/constitution.md`: Project development principles (supersedes all practices)
- `docs/README.md`: Comprehensive system documentation
- `backend/requirements.txt`: Python dependencies
- `frontend/package.json`: Node.js dependencies
- `.env`: Environment configuration (DATABASE_URL, JWT_SECRET_KEY, etc.)

## Environment Variables

Required variables in `.env`:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET_KEY`: Secret for JWT token signing
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration (default: 30)
- `SECURITY_ENVIRONMENT`: production/development
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)
