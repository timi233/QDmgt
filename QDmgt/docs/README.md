# Channel Management System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Quick Start](#quick-start)
5. [API Reference](#api-reference)
6. [CLI Guide](#cli-guide)
7. [Deployment](#deployment)
8. [Security](#security)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

## Overview

The Channel Management System is a comprehensive solution for managing sales channels, setting and tracking targets, and monitoring execution progress. The system provides a web-based interface with RESTful APIs and CLI tools for administrators and managers.

### Key Features

- **Channel Management**: Create, read, update, and delete channel records
- **Target Planning**: Set quarterly and monthly targets for performance metrics
- **Assignment Management**: Assign channels to users with specific permissions
- **Execution Tracking**: Track monthly and weekly execution progress
- **Search and Filtering**: Advanced search and filtering capabilities
- **Data Visualization**: Charts and dashboards for target tracking
- **Role-Based Access Control**: Fine-grained permissions for different user roles

### System Components

1. **Backend API**: FastAPI-based RESTful API with PostgreSQL database
2. **Frontend UI**: React-based web interface
3. **CLI Tools**: Command-line interface for administration tasks
4. **Database**: PostgreSQL with SQLAlchemy ORM
5. **Authentication**: JWT-based authentication with role-based access control

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   Backend API   │    │   PostgreSQL    │
│   (React.js)    │◄──►│  (FastAPI)      │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   CLI Tools     │
                    │  (Python)       │
                    └─────────────────┘
```

### Backend Architecture

```
backend/src/
├── api/                 # API endpoints and routers
├── auth/                # Authentication and authorization
├── cli/                 # Command-line interface tools
├── config/              # Configuration management
├── database/            # Database connection and migrations
├── middleware/          # Middleware components
├── models/              # Data models and entities
├── security/            # Security utilities and hardening
├── services/            # Business logic services
├── tests/              # Unit and integration tests
└── utils/              # Utility functions and helpers
```

### Frontend Architecture

```
frontend/src/
├── components/         # Reusable UI components
├── features/            # Feature-specific components
├── hooks/               # Custom React hooks
├── pages/               # Page components
├── services/            # API service clients
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

## Installation

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 13+
- Docker (optional, for containerization)

### Backend Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourorg/channel-management-system.git
   cd channel-management-system
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Run database migrations:
   ```bash
   alembic upgrade head
   ```

### Frontend Installation

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Build the frontend:
   ```bash
   npm run build
   # or
   yarn build
   ```

### CLI Installation

Install the CLI tools globally:
```bash
pip install -e .
```

Or run directly with Python:
```bash
python backend/src/cli/main.py --help
```

## Quick Start

### Running the Development Server

1. Start the backend API:
   ```bash
   uvicorn backend.src.main:app --reload
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   # or
   yarn start
   ```

3. Access the application:
   - Backend API: http://localhost:8000
   - Frontend UI: http://localhost:3000
   - API Documentation: http://localhost:8000/docs

### Using the CLI

Initialize the database:
```bash
channel-mgmt init-db
```

Create an admin user:
```bash
channel-mgmt create-user \
  --username admin \
  --email admin@example.com \
  --password "secure-password" \
  --role admin
```

## API Reference

### Authentication Endpoints

#### POST /api/auth/login

Login to the system and receive JWT tokens.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer"
}
```

#### POST /api/auth/register

Register a new user account.

**Request:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string"
}
```

#### POST /api/auth/refresh

Refresh the access token using a refresh token.

**Request:**
```json
{
  "refresh_token": "string"
}
```

### Channel Endpoints

#### GET /api/channels

List channels with optional filtering and pagination.

**Query Parameters:**
- `skip`: int (default: 0)
- `limit`: int (default: 100)
- `search`: string (optional)
- `status`: string (optional)
- `business_type`: string (optional)

#### POST /api/channels

Create a new channel.

**Request:**
```json
{
  "name": "string",
  "description": "string",
  "status": "active|inactive|suspended",
  "business_type": "basic|high-value|pending-signup",
  "contact_email": "string",
  "contact_phone": "string"
}
```

#### GET /api/channels/{channel_id}

Get a specific channel by ID.

#### PUT /api/channels/{channel_id}

Update a specific channel.

#### DELETE /api/channels/{channel_id}

Delete a specific channel.

### Target Endpoints

#### POST /api/targets

Create a new target plan for a channel.

**Request:**
```json
{
  "channel_id": "uuid",
  "year": "integer",
  "quarter": "integer",
  "month": "integer",
  "performance_target": "decimal",
  "opportunity_target": "decimal",
  "project_count_target": "integer",
  "development_goal": "string"
}
```

#### GET /api/targets/{target_id}

Get a specific target plan by ID.

#### PUT /api/targets/{target_id}

Update a specific target plan.

#### PATCH /api/targets/{target_id}/achievement

Update target achievement metrics.

### Assignment Endpoints

#### POST /api/assignments

Create a new channel assignment.

**Request:**
```json
{
  "user_id": "uuid",
  "channel_id": "uuid",
  "permission_level": "read|write|admin",
  "target_responsibility": "boolean"
}
```

#### GET /api/assignments/{assignment_id}

Get a specific assignment by ID.

#### PUT /api/assignments/{assignment_id}

Update a specific assignment.

#### DELETE /api/assignments/{assignment_id}

Delete a specific assignment.

### Execution Plan Endpoints

#### POST /api/execution-plans

Create a new execution plan.

**Request:**
```json
{
  "channel_id": "uuid",
  "user_id": "uuid",
  "plan_type": "monthly|weekly",
  "plan_period": "string",
  "plan_content": "string",
  "execution_status": "string",
  "key_obstacles": "string",
  "next_steps": "string"
}
```

#### GET /api/execution-plans/{plan_id}

Get a specific execution plan by ID.

#### PUT /api/execution-plans/{plan_id}

Update a specific execution plan.

#### DELETE /api/execution-plans/{plan_id}

Delete a specific execution plan.

## CLI Guide

### Available Commands

#### `channel-mgmt init-db`

Initialize database tables.

```bash
channel-mgmt init-db
```

#### `channel-mgmt create-user`

Create a new user account.

```bash
channel-mgmt create-user \
  --username "admin" \
  --email "admin@example.com" \
  --password "secure-password" \
  --role "admin" \
  --full-name "System Administrator"
```

#### `channel-mgmt create-channel`

Create a new channel.

```bash
channel-mgmt create-channel \
  --name "New Channel" \
  --description "Description of the channel" \
  --status "active" \
  --business-type "basic" \
  --contact-email "contact@example.com" \
  --contact-phone "+1234567890" \
  --creator-id "uuid"
```

#### `channel-mgmt list-channels`

List all channels.

```bash
channel-mgmt list-channels \
  --status "active" \
  --business-type "basic" \
  --format "table"
```

#### `channel-mgmt assign-channel`

Assign a channel to a user.

```bash
channel-mgmt assign-channel \
  --channel-id "uuid" \
  --user-id "uuid" \
  --permission-level "admin" \
  --target-responsibility \
  --assigned-by "uuid"
```

#### `channel-mgmt create-target`

Create a channel target.

```bash
channel-mgmt create-target \
  --channel-id "uuid" \
  --year 2025 \
  --quarter 1 \
  --month 1 \
  --performance-target 100.5 \
  --opportunity-target 80.25 \
  --project-count-target 15 \
  --development-goal "Expand market share" \
  --created-by "uuid"
```

#### `channel-mgmt health`

Check system health.

```bash
channel-mgmt health
```

## Deployment

### Production Deployment

#### Using Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/channel_management
      - JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=channel_management
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Start the services:
```bash
docker-compose up -d
```

#### Manual Deployment

1. Install dependencies on production server
2. Configure environment variables
3. Run database migrations
4. Start backend API server
5. Build and serve frontend application
6. Configure reverse proxy (nginx, Apache, etc.)

### Environment Configuration

Set the following environment variables for production:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Security
SECURITY_ENVIRONMENT=production
SECURITY_DEBUG=false

# Logging
LOG_LEVEL=WARNING
LOG_FILE=/var/log/channel-management-system.log
```

## Security

### Authentication and Authorization

The system uses JWT-based authentication with role-based access control. Users are assigned roles that determine their permissions within the system.

#### Roles

1. **Admin**: Full access to all features
2. **Manager**: Access to channel management and target setting
3. **User**: Limited access to assigned channels

#### Permissions

- **Read**: View channel information and targets
- **Write**: Create, update, and delete channels and targets
- **Admin**: Manage user assignments and system settings

### Data Protection

#### Encryption

- Passwords are hashed using PBKDF2 with SHA-256
- Sensitive data is encrypted at rest using AES-256
- All communications use HTTPS/TLS encryption

#### Access Control

- Role-based access control (RBAC)
- Fine-grained permissions for each feature
- Audit logging for all user actions

### Security Hardening

#### Input Validation

All user inputs are validated and sanitized to prevent:
- SQL injection attacks
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Path traversal attacks

#### Rate Limiting

Rate limiting is implemented to prevent:
- Brute force attacks
- Denial of service (DoS) attacks
- API abuse

#### Security Headers

The system adds security headers to all HTTP responses:
- Content Security Policy (CSP)
- XSS Protection
- Frame Options
- Content Type Options

### Audit Logging

All security-relevant events are logged including:
- Login attempts (successful and failed)
- User creation and modification
- Channel creation, modification, and deletion
- Target setting and achievement updates
- Permission changes
- System configuration changes

## Troubleshooting

### Common Issues

#### Database Connection Failed

**Error**: `ConnectionRefusedError: [Errno 111] Connection refused`

**Solution**: 
1. Ensure PostgreSQL is running
2. Check database credentials in `.env` file
3. Verify database URL format: `postgresql://user:password@host:port/database`

#### JWT Token Expired

**Error**: `401 Unauthorized: Token has expired`

**Solution**:
1. Refresh the access token using the refresh token
2. Re-login if refresh token has also expired

#### Permission Denied

**Error**: `403 Forbidden: Insufficient permissions`

**Solution**:
1. Ensure user has appropriate role for requested action
2. Contact system administrator to update user permissions

#### Frontend Not Loading

**Error**: Blank page or loading spinner indefinitely

**Solution**:
1. Check browser console for JavaScript errors
2. Verify backend API is running and accessible
3. Check network tab for failed API requests

### Debugging Tips

1. Enable debug logging by setting `LOG_LEVEL=DEBUG` in environment variables
2. Use browser developer tools to inspect network requests and console errors
3. Check application logs for detailed error messages
4. Verify all required environment variables are set correctly

## Contributing

### Development Setup

1. Fork the repository
2. Clone your fork
3. Create a new branch for your feature
4. Install dependencies as described in [Installation](#installation)
5. Make your changes
6. Write tests for new functionality
7. Run tests to ensure everything works
8. Submit a pull request

### Code Style

Follow the existing code style in the project:
- Python: PEP 8 with Black formatting
- JavaScript/TypeScript: ESLint with Prettier
- CSS: BEM methodology

### Testing

All code changes should include appropriate tests:
- Unit tests for individual functions and components
- Integration tests for API endpoints
- End-to-end tests for user workflows

Run tests with:
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
# or
yarn test
```

### Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a build
2. Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters
3. Increase the version numbers in any examples files and the README.md to the new version that this Pull Request would represent
4. You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you

### Reporting Issues

Use the issue tracker to report bugs or request features:
1. Check if the issue already exists
2. Provide a clear title and description
3. Include steps to reproduce for bugs
4. Add relevant labels (bug, enhancement, question, etc.)
5. Assign to appropriate milestone if applicable

### Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.