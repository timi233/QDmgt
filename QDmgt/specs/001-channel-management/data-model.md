# Data Model: Channel Management System

**Feature**: Channel Management System  
**Date**: 2025-10-11  
**Branch**: 001-channel-management

## Entities

### Channel

Represents a communication channel in the system.

**Attributes:**
- id: UUID (Primary Key)
- name: String (255 characters, required)
- description: Text (optional)
- status: String (enum: active, inactive, suspended, required)
- contact_email: String (email format, optional)
- contact_phone: String (optional)
- created_at: DateTime (required, auto-generated)
- updated_at: DateTime (required, auto-generated)
- created_by: UUID (Foreign Key to User, required)

**Relationships:**
- One-to-Many: ChannelAssignment (one channel can have many assignments)
- Many-to-One: User (created_by)

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
- One-to-Many: Channel (created channels)

### ChannelAssignment

Represents the relationship between users and channels with permissions.

**Attributes:**
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to User, required)
- channel_id: UUID (Foreign Key to Channel, required)
- permission_level: String (enum: read, write, admin, required)
- assigned_at: DateTime (required, auto-generated)
- assigned_by: UUID (Foreign Key to User, required)

**Relationships:**
- Many-to-One: User
- Many-to-One: Channel

## Database Schema

```
users
├── id: UUID (PK)
├── username: VARCHAR(255) NOT NULL UNIQUE
├── email: VARCHAR(255) NOT NULL UNIQUE
├── full_name: VARCHAR(255)
├── role: VARCHAR(50) NOT NULL
├── created_at: TIMESTAMP NOT NULL
└── updated_at: TIMESTAMP NOT NULL

channels
├── id: UUID (PK)
├── name: VARCHAR(255) NOT NULL
├── description: TEXT
├── status: VARCHAR(50) NOT NULL
├── contact_email: VARCHAR(255)
├── contact_phone: VARCHAR(50)
├── created_at: TIMESTAMP NOT NULL
├── updated_at: TIMESTAMP NOT NULL
├── created_by: UUID NOT NULL (FK: users.id)
└── FOREIGN KEY (created_by) REFERENCES users(id)

channel_assignments
├── id: UUID (PK)
├── user_id: UUID NOT NULL (FK: users.id)
├── channel_id: UUID NOT NULL (FK: channels.id)
├── permission_level: VARCHAR(50) NOT NULL
├── assigned_at: TIMESTAMP NOT NULL
├── assigned_by: UUID NOT NULL (FK: users.id)
├── FOREIGN KEY (user_id) REFERENCES users(id)
├── FOREIGN KEY (channel_id) REFERENCES channels(id)
└── FOREIGN KEY (assigned_by) REFERENCES users(id)
```

## Constraints

1. Channel names must be unique within the system
2. Users cannot be assigned to the same channel multiple times
3. A channel must have at least one admin assigned to it
4. Channels cannot be deleted if they have active assignments

## Indexes

1. channels.name: B-tree index for fast name lookups
2. channels.status: B-tree index for status filtering
3. channels.created_at: B-tree index for date-based queries
4. channel_assignments.user_id: B-tree index for user-channel queries
5. channel_assignments.channel_id: B-tree index for channel-user queries