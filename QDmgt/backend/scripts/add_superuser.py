#!/usr/bin/env python3
"""Create an admin user in the local database if it does not already exist."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure repository root is on the module search path so backend imports work.
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from backend.src.auth.auth_service import AuthService
from backend.src.database import SessionLocal
from backend.src.models.user import User


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create an admin user if missing")
    parser.add_argument("--username", default="superuser", help="Username for the admin user")
    parser.add_argument("--email", default="superuser@example.com", help="Email for the admin user")
    parser.add_argument("--password", default="Director#2024$", help="Password for the admin user")
    parser.add_argument("--role", default="admin", choices=["admin", "manager", "user"], help="Role to assign")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    session = SessionLocal()
    auth_service = AuthService()

    try:
        existing = (
            session.query(User)
            .filter((User.username == args.username) | (User.email == args.email))
            .first()
        )

        if existing:
            print(f"User '{existing.username}' already exists with role '{existing.role.value}'. Nothing to do.")
            return 0

        user = auth_service.create_user(
            db=session,
            username=args.username,
            email=args.email,
            password=args.password,
            role=args.role,
        )
        print(f"Created user '{user.username}' with role '{user.role.value}'.")
        return 0
    except HTTPException as exc:
        session.rollback()
        print(f"Failed to create user: {exc.detail}")
        return 1
    except SQLAlchemyError as exc:
        session.rollback()
        print(f"Database error while creating user: {exc}")
        return 1
    finally:
        session.close()


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
