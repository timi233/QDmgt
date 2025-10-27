from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .api import (
    assignments,
    auth,
    channels,
    execution_plans,
    unified_targets,
)
from .config.settings import settings
from .database import engine, Base
from .utils.logger import logger
from .utils.exception_handlers import register_exception_handlers
from datetime import datetime
import os
import json

def get_allowed_origins():
    """Get allowed CORS origins from environment or settings"""
    env_origins = os.getenv('SECURITY_ALLOWED_ORIGINS')
    if env_origins:
        try:
            # Try parsing as JSON
            return json.loads(env_origins)
        except json.JSONDecodeError:
            # Fallback to comma-separated
            return [origin.strip() for origin in env_origins.split(',')]
    return settings.ALLOWED_ORIGINS

def create_app():
    """Create and configure the FastAPI application"""

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.VERSION,
        debug=settings.DEBUG,
        description="Channel Management System API",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json"
    )

    # Get allowed origins
    allowed_origins = get_allowed_origins()
    logger.info(f"CORS allowed origins: {allowed_origins}")

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register exception handlers
    register_exception_handlers(app)

    # Create API v1 router
    api_v1_router = APIRouter(prefix="/api/v1")

    # Include API routes with version prefix
    api_v1_router.include_router(auth.router, prefix="", tags=["authentication"])
    api_v1_router.include_router(channels.router, prefix="", tags=["channels"])
    api_v1_router.include_router(assignments.router, prefix="", tags=["assignments"])
    api_v1_router.include_router(execution_plans.router, prefix="", tags=["execution-plans"])

    # Include versioned API router
    app.include_router(api_v1_router)
    app.include_router(unified_targets.router, prefix="/api/v1")

    @app.get("/")
    def read_root():
        """Root endpoint with API information"""
        return {
            "message": f"Welcome to {settings.APP_NAME}",
            "version": settings.VERSION,
            "api_version": "v1",
            "docs_url": "/api/docs",
            "health_check": "/health"
        }

    @app.get("/health")
    def health_check():
        """
        Health check endpoint with database connectivity check
        """
        try:
            # Test database connection
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
                db_status = "healthy"
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            db_status = "unhealthy"

        return {
            "status": "healthy" if db_status == "healthy" else "degraded",
            "app": settings.APP_NAME,
            "version": settings.VERSION,
            "timestamp": datetime.utcnow().isoformat(),
            "components": {
                "database": db_status,
                "api": "healthy"
            }
        }

    # Log startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT.value}")
    logger.info(f"Debug mode: {settings.DEBUG}")

    return app


app = create_app()
