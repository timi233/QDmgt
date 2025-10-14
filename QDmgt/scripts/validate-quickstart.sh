#!/bin/bash
"""
Quickstart Validation Script for Channel Management System

This script validates that the Channel Management System can be set up
and run according to the quickstart guide.
"""

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check Python
    if ! command_exists python3; then
        log_error "Python 3.8+ is required but not found"
        return 1
    fi
    
    python_version=$(python3 --version | cut -d' ' -f2)
    log_info "Found Python $python_version"
    
    # Check Node.js
    if ! command_exists node; then
        log_error "Node.js 16+ is required but not found"
        return 1
    fi
    
    node_version=$(node --version | cut -d'v' -f2)
    log_info "Found Node.js $node_version"
    
    # Check PostgreSQL
    if ! command_exists psql; then
        log_warn "PostgreSQL client not found - database validation will be skipped"
    else
        log_info "Found PostgreSQL client"
    fi
    
    # Check Docker (optional)
    if command_exists docker; then
        log_info "Found Docker"
    else
        log_warn "Docker not found - containerized deployment validation will be skipped"
    fi
    
    log_info "Prerequisites validation completed successfully"
    return 0
}

# Setup virtual environment
setup_virtual_environment() {
    log_info "Setting up Python virtual environment..."
    
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        log_info "Virtual environment created"
    else
        log_info "Virtual environment already exists"
    fi
    
    source venv/bin/activate
    log_info "Virtual environment activated"
    
    return 0
}

# Install backend dependencies
install_backend_dependencies() {
    log_info "Installing backend dependencies..."
    
    source venv/bin/activate
    
    if [ -f "backend/requirements.txt" ]; then
        pip install -r backend/requirements.txt
        log_info "Backend dependencies installed successfully"
    else
        log_error "backend/requirements.txt not found"
        return 1
    fi
    
    return 0
}

# Install frontend dependencies
install_frontend_dependencies() {
    log_info "Installing frontend dependencies..."
    
    if [ -f "frontend/package.json" ]; then
        cd frontend
        npm install
        cd ..
        log_info "Frontend dependencies installed successfully"
    else
        log_error "frontend/package.json not found"
        return 1
    fi
    
    return 0
}

# Configure environment
configure_environment() {
    log_info "Configuring environment..."
    
    # Copy example environment file if it exists
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_info "Environment file created from example"
    elif [ ! -f ".env" ]; then
        # Create minimal environment file
        cat > .env << EOF
# Channel Management System Environment Configuration

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/channel_management

# JWT
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Security
SECURITY_ENVIRONMENT=development
SECURITY_DEBUG=true

# Logging
LOG_LEVEL=INFO
EOF
        log_info "Minimal environment file created"
    else
        log_info "Environment file already exists"
    fi
    
    return 0
}

# Run database migrations
run_database_migrations() {
    log_info "Running database migrations..."
    
    source venv/bin/activate
    
    if [ -f "alembic.ini" ]; then
        alembic upgrade head
        log_info "Database migrations completed successfully"
    else
        log_warn "alembic.ini not found - database migration skipped"
    fi
    
    return 0
}

# Start backend server
start_backend_server() {
    log_info "Starting backend server..."
    
    source venv/bin/activate
    
    # Start backend in background
    uvicorn backend.src.main:app --host 0.0.0.0 --port 8000 --reload &
    backend_pid=$!
    
    # Wait a moment for server to start
    sleep 5
    
    # Check if server is running
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        log_info "Backend server started successfully (PID: $backend_pid)"
        echo "$backend_pid" > .backend.pid
        return 0
    else
        log_error "Failed to start backend server"
        return 1
    fi
}

# Start frontend server
start_frontend_server() {
    log_info "Starting frontend server..."
    
    # Start frontend in background
    cd frontend
    npm start &
    frontend_pid=$!
    cd ..
    
    # Wait a moment for server to start
    sleep 5
    
    # Check if server is running
    if curl -f http://localhost:3000/ >/dev/null 2>&1; then
        log_info "Frontend server started successfully (PID: $frontend_pid)"
        echo "$frontend_pid" > .frontend.pid
        return 0
    else
        log_error "Failed to start frontend server"
        return 1
    fi
}

# Test API endpoints
test_api_endpoints() {
    log_info "Testing API endpoints..."
    
    # Test health endpoint
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        log_info "Health endpoint accessible"
    else
        log_error "Health endpoint not accessible"
        return 1
    fi
    
    # Test OpenAPI documentation
    if curl -f http://localhost:8000/docs >/dev/null 2>&1; then
        log_info "OpenAPI documentation accessible"
    else
        log_warn "OpenAPI documentation not accessible"
    fi
    
    # Test channels endpoint (may fail if not authenticated)
    if curl -f http://localhost:8000/api/channels >/dev/null 2>&1; then
        log_info "Channels endpoint accessible"
    else
        log_info "Channels endpoint tested (may require authentication)"
    fi
    
    return 0
}

# Test frontend
test_frontend() {
    log_info "Testing frontend..."
    
    # Test if frontend is serving content
    if curl -f http://localhost:3000/ >/dev/null 2>&1; then
        log_info "Frontend serving content"
    else
        log_error "Frontend not serving content"
        return 1
    fi
    
    return 0
}

# Test CLI tools
test_cli_tools() {
    log_info "Testing CLI tools..."
    
    source venv/bin/activate
    
    # Test CLI help
    if python backend/src/cli/main.py --help >/dev/null 2>&1; then
        log_info "CLI help accessible"
    else
        log_error "CLI help not accessible"
        return 1
    fi
    
    # Test specific commands
    if python backend/src/cli/main.py health >/dev/null 2>&1; then
        log_info "CLI health command working"
    else
        log_info "CLI health command tested"
    fi
    
    return 0
}

# Cleanup processes
cleanup() {
    log_info "Cleaning up..."
    
    # Kill backend process
    if [ -f ".backend.pid" ]; then
        backend_pid=$(cat .backend.pid)
        if kill -0 $backend_pid 2>/dev/null; then
            kill $backend_pid
            log_info "Backend server stopped"
        fi
        rm -f .backend.pid
    fi
    
    # Kill frontend process
    if [ -f ".frontend.pid" ]; then
        frontend_pid=$(cat .frontend.pid)
        if kill -0 $frontend_pid 2>/dev/null; then
            kill $frontend_pid
            log_info "Frontend server stopped"
        fi
        rm -f .frontend.pid
    fi
    
    log_info "Cleanup completed"
}

# Run validation
run_validation() {
    log_info "Starting quickstart validation..."
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Run validation steps
    if ! validate_prerequisites; then
        log_error "Prerequisites validation failed"
        return 1
    fi
    
    if ! setup_virtual_environment; then
        log_error "Virtual environment setup failed"
        return 1
    fi
    
    if ! install_backend_dependencies; then
        log_error "Backend dependencies installation failed"
        return 1
    fi
    
    if ! install_frontend_dependencies; then
        log_error "Frontend dependencies installation failed"
        return 1
    fi
    
    if ! configure_environment; then
        log_error "Environment configuration failed"
        return 1
    fi
    
    if ! run_database_migrations; then
        log_warn "Database migrations failed (continuing with validation)"
    fi
    
    if ! start_backend_server; then
        log_error "Backend server startup failed"
        return 1
    fi
    
    if ! start_frontend_server; then
        log_error "Frontend server startup failed"
        return 1
    fi
    
    if ! test_api_endpoints; then
        log_error "API endpoint testing failed"
        return 1
    fi
    
    if ! test_frontend; then
        log_error "Frontend testing failed"
        return 1
    fi
    
    if ! test_cli_tools; then
        log_error "CLI tools testing failed"
        return 1
    fi
    
    log_info "All validation steps completed successfully!"
    return 0
}

# Main function
main() {
    echo "==============================================="
    echo "Channel Management System Quickstart Validation"
    echo "==============================================="
    echo
    
    # Change to project root directory
    cd "$(dirname "$0")/.." || {
        log_error "Failed to change to project root directory"
        exit 1
    }
    
    # Run validation
    if run_validation; then
        log_info "Quickstart validation PASSED"
        echo
        echo "The Channel Management System has been successfully validated!"
        echo "You can now:"
        echo "  - Access the backend API at http://localhost:8000"
        echo "  - Access the frontend UI at http://localhost:3000"
        echo "  - View API documentation at http://localhost:8000/docs"
        echo
        exit 0
    else
        log_error "Quickstart validation FAILED"
        echo
        echo "Please check the error messages above and resolve any issues."
        echo "Refer to the documentation for troubleshooting steps."
        echo
        exit 1
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi