# Data Model: Channel Management System

**Feature**: Channel Management System  
**Date**: 2025-10-11  
**Branch**: 001-channel-management-system

## Entities

### Channel

Represents a communication channel in the system with target planning capabilities.

**Attributes:**
- id: UUID (Primary Key)
- name: String (255 characters, unique, required)
- description: Text (optional)
- status: String (enum: active, inactive, suspended, required)
- business_type: String (enum: basic, high-value, pending-signup, required)
- contact_email: String (email format, optional)
- contact_phone: String (optional)
- created_at: DateTime (required, auto-generated)
- updated_at: DateTime (required, auto-generated)
- created_by: UUID (Foreign Key to User, required)
- last_modified_by: UUID (Foreign Key to User, required)

**Relationships:**
- One-to-Many: ChannelTarget (one channel can have many target plans)
- One-to-Many: ChannelAssignment (one channel can have many assignments)
- One-to-Many: ExecutionPlan (one channel can have many execution plans)
- Many-to-One: User (created_by, last_modified_by)

### User

Represents system users who can be assigned to channels.

**Attributes:**
- id: UUID (Primary Key)
- username: String (unique, required)
- email: String (unique, email format, required)
- full_name: String (optional)
- role: String (enum: admin, manager, user, required)
- created_at: DateTime (required, auto-generated)
- updated_at: DateTime (required, auto-generated)

**Relationships:**
- One-to-Many: ChannelAssignment (one user can have many channel assignments)
- One-to-Many: ExecutionPlan (one user can have many execution plans)
- One-to-Many: Channel (created channels, modified channels)

### ChannelAssignment

Represents the relationship between users and channels with target management responsibilities.

**Attributes:**
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to User, required)
- channel_id: UUID (Foreign Key to Channel, required)
- permission_level: String (enum: read, write, admin, required)
- assigned_at: DateTime (required, auto-generated)
- assigned_by: UUID (Foreign Key to User, required)
- target_responsibility: Boolean (required, default: false)

**Relationships:**
- Many-to-One: User
- Many-to-One: Channel

### ChannelTarget

Represents target planning for channels with time dimensions and metrics.

**Attributes:**
- id: UUID (Primary Key)
- channel_id: UUID (Foreign Key to Channel, required)
- year: Integer (required, e.g., 2025)
- quarter: Integer (enum: 1, 2, 3, 4, required)
- month: Integer (1-12, optional)
- performance_target: Decimal (in W, optional)
- opportunity_target: Decimal (in W, optional)
- project_count_target: Integer (optional)
- development_goal: Text (optional)
- created_at: DateTime (required, auto-generated)
- updated_at: DateTime (required, auto-generated)
- created_by: UUID (Foreign Key to User, required)
- achieved_performance: Decimal (in W, default: 0)
- achieved_opportunity: Decimal (in W, default: 0)
- achieved_project_count: Integer (default: 0)

**Relationships:**
- Many-to-One: Channel
- Many-to-One: User (created_by)

### ExecutionPlan

Represents monthly work plans and weekly execution tracking for channels.

**Attributes:**
- id: UUID (Primary Key)
- channel_id: UUID (Foreign Key to Channel, required)
- user_id: UUID (Foreign Key to User, required)
- plan_type: String (enum: monthly, weekly, required)
- plan_period: String (format: YYYY-MM or YYYY-WW, required)
- plan_content: Text (required)
- execution_status: Text (optional, for weekly tracking)
- key_obstacles: Text (optional, for weekly tracking)
- next_steps: Text (optional, for weekly tracking)
- created_at: DateTime (required, auto-generated)
- updated_at: DateTime (required, auto-generated)
- status: String (enum: planned, in-progress, completed, archived)

**Relationships:**
- Many-to-One: Channel
- Many-to-One: User

## Database Schema

```
users
├── id: UUID (PK)
├── username: VARCHAR(255) NOT NULL UNIQUE
├── email: VARCHAR(255) NOT NULL UNIQUE
├── full_name: VARCHAR(255)
├── role: VARCHAR(50) NOT NULL DEFAULT 'user'
├── created_at: TIMESTAMP NOT NULL
├── updated_at: TIMESTAMP NOT NULL
└── FOREIGN KEY (role) REFERENCES roles(name)

channels
├── id: UUID (PK)
├── name: VARCHAR(255) NOT NULL UNIQUE
├── description: TEXT
├── status: VARCHAR(50) NOT NULL DEFAULT 'active'
├── business_type: VARCHAR(50) NOT NULL DEFAULT 'basic'
├── contact_email: VARCHAR(255) CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
├── contact_phone: VARCHAR(50)
├── created_at: TIMESTAMP NOT NULL
├── updated_at: TIMESTAMP NOT NULL
├── created_by: UUID NOT NULL
├── last_modified_by: UUID NOT NULL
├── FOREIGN KEY (created_by) REFERENCES users(id)
├── FOREIGN KEY (last_modified_by) REFERENCES users(id)
└── CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended'))

channel_assignments
├── id: UUID (PK)
├── user_id: UUID NOT NULL
├── channel_id: UUID NOT NULL
├── permission_level: VARCHAR(50) NOT NULL
├── assigned_at: TIMESTAMP NOT NULL
├── assigned_by: UUID NOT NULL
├── target_responsibility: BOOLEAN NOT NULL DEFAULT FALSE
├── FOREIGN KEY (user_id) REFERENCES users(id)
├── FOREIGN KEY (channel_id) REFERENCES channels(id)
├── FOREIGN KEY (assigned_by) REFERENCES users(id)
├── UNIQUE (user_id, channel_id) -- Prevents duplicate assignments
└── CONSTRAINT valid_permission CHECK (permission_level IN ('read', 'write', 'admin'))

channel_targets
├── id: UUID (PK)
├── channel_id: UUID NOT NULL
├── year: INTEGER NOT NULL
├── quarter: INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4)
├── month: INTEGER CHECK (month >= 1 AND month <= 12)
├── performance_target: DECIMAL(10,2) -- in W (tens of thousands)
├── opportunity_target: DECIMAL(10,2) -- in W (tens of thousands)
├── project_count_target: INTEGER
├── development_goal: TEXT
├── created_at: TIMESTAMP NOT NULL
├── updated_at: TIMESTAMP NOT NULL
├── created_by: UUID NOT NULL
├── achieved_performance: DECIMAL(10,2) DEFAULT 0
├── achieved_opportunity: DECIMAL(10,2) DEFAULT 0
├── achieved_project_count: INTEGER DEFAULT 0
├── FOREIGN KEY (channel_id) REFERENCES channels(id)
├── FOREIGN KEY (created_by) REFERENCES users(id)
├── UNIQUE (channel_id, year, quarter, COALESCE(month, -1)) -- Prevents duplicate targets for same period
└── CONSTRAINT valid_quarter CHECK (quarter >= 1 AND quarter <= 4)

execution_plans
├── id: UUID (PK)
├── channel_id: UUID NOT NULL
├── user_id: UUID NOT NULL
├── plan_type: VARCHAR(50) NOT NULL
├── plan_period: VARCHAR(20) NOT NULL -- Format: YYYY-MM for monthly, YYYY-WW for weekly
├── plan_content: TEXT NOT NULL
├── execution_status: TEXT
├── key_obstacles: TEXT
├── next_steps: TEXT
├── created_at: TIMESTAMP NOT NULL
├── updated_at: TIMESTAMP NOT NULL
├── status: VARCHAR(50) NOT NULL DEFAULT 'planned'
├── FOREIGN KEY (channel_id) REFERENCES channels(id)
├── FOREIGN KEY (user_id) REFERENCES users(id)
└── CONSTRAINT valid_plan_type CHECK (plan_type IN ('monthly', 'weekly'))
```

## Constraints

1. Channel names must be unique within the system
2. Users cannot be assigned to the same channel multiple times
3. A channel must have at least one admin assigned to it (business rule enforced in application layer)
4. Channels cannot be deleted if they have active assignments (enforced via application logic with soft delete option)
5. Contact email must be in valid format when provided
6. Status field must be one of the allowed values: active, inactive, suspended
7. Business type must be one of: basic, high-value, pending-signup
8. Quarter must be between 1 and 4
9. Month must be between 1 and 12
10. Channel targets must be unique for the same channel in the same time period
11. Performance and opportunity targets are stored in 'W' (tens of thousands) units

## Indexes

1. `channels.name`: B-tree index for fast name lookups
2. `channels.status`: B-tree index for status filtering
3. `channels.business_type`: B-tree index for business type filtering
4. `channels.created_at`: B-tree index for date-based queries
5. `channel_assignments.user_id`: B-tree index for user-channel queries
6. `channel_assignments.channel_id`: B-tree index for channel-user queries
7. `channel_targets.channel_id`: B-tree index for channel target queries
8. `channel_targets.year`: B-tree index for year-based queries
9. `channel_targets.quarter`: B-tree index for quarter-based queries
10. `execution_plans.channel_id`: B-tree index for channel execution plan queries
11. `execution_plans.user_id`: B-tree index for user execution plan queries
12. `execution_plans.plan_period`: B-tree index for period-based queries
13. `users.username`: B-tree index for authentication
14. `users.email`: B-tree index for user lookups

## Soft Delete Implementation

- Channels table will include `deleted_at: TIMESTAMP` field
- Channels will be marked as deleted rather than physically removed
- System will respect data retention policy of 1 year before physical deletion
- Deleted channels will not appear in standard queries but can be accessed via specific API endpoints