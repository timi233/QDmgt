"""
Test the conftest fixtures to ensure they work correctly
"""

import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient


def test_db_session_fixture(db_session):
    """Test that db_session fixture works"""
    assert db_session is not None
    assert isinstance(db_session, Session)


def test_db_alias_fixture(db):
    """Test that db alias fixture works"""
    assert db is not None
    assert isinstance(db, Session)


def test_client_fixture(client):
    """Test that client fixture works"""
    assert client is not None
    assert isinstance(client, TestClient)


def test_test_user_fixture(test_user):
    """Test that test_user fixture works"""
    assert test_user is not None
    assert test_user.username == "testuser"
    assert test_user.email == "testuser@example.com"
    assert test_user.is_active is True


def test_test_admin_fixture(test_admin):
    """Test that test_admin fixture works"""
    assert test_admin is not None
    assert test_admin.username == "admin"
    assert test_admin.email == "admin@example.com"
    assert test_admin.role.value == "admin"


def test_auth_headers_fixture(auth_headers_user):
    """Test that auth_headers fixture works"""
    assert auth_headers_user is not None
    assert "Authorization" in auth_headers_user
    assert auth_headers_user["Authorization"].startswith("Bearer ")


def test_test_channel_fixture(test_channel):
    """Test that test_channel fixture works"""
    assert test_channel is not None
    assert test_channel.name == "Test Channel"
    assert test_channel.status.value == "active"
