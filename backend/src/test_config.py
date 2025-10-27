# pytest configuration for the Channel Management System
# This file sets up the test environment and configuration

import pytest
import sys
from pathlib import Path

# Add the src directory to the path so we can import modules
src_path = Path(__file__).parent
sys.path.insert(0, str(src_path))

# Configuration for pytest
pytest_plugins = []

def pytest_configure(config):
    """Configure pytest settings"""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "unit: mark test as unit test"
    )
    config.addinivalue_line(
        "markers", "e2e: mark test as end-to-end test"
    )

# Example test for models
def test_example():
    """Example test - this should be removed once real tests are added"""
    assert True