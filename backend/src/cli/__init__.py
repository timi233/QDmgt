#!/usr/bin/env python3
"""
Channel Management System CLI Entry Point

This script serves as the entry point for the Channel Management System CLI.
"""

import sys
import os

try:
    from .main import main
except ImportError as e:
    print(f"Failed to import CLI module: {e}")
    print("Please make sure the package structure is correct and all dependencies are installed.")
    sys.exit(1)

if __name__ == "__main__":
    main()