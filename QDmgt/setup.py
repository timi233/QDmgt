"""
Setup script for Channel Management System CLI
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="channel-mgmt-cli",
    version="0.1.0",
    author="Channel Management System Team",
    author_email="team@channelmgmt.com",
    description="CLI tools for Channel Management System",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourorg/channel-management-system",
    packages=find_packages(where="backend/src"),
    package_dir={"": "backend/src"},
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "fastapi>=0.68.0",
        "sqlalchemy>=1.4.0",
        "pydantic>=1.8.0",
        "pydantic-settings>=2.0.0",
        "python-jose>=3.3.0",
        "passlib>=1.7.4",
        "alembic>=1.7.0",
        "asyncpg>=0.25.0",
        "uvicorn>=0.15.0",
    ],
    entry_points={
        "console_scripts": [
            "channel-mgmt=cli:main",
        ],
    },
    include_package_data=True,
    zip_safe=False,
)