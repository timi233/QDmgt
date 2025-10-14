#!/bin/bash
# Pre-commit Hook Setup Script
# This script installs and configures pre-commit hooks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
BACKEND_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root
cd "$PROJECT_ROOT"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info "Setting up pre-commit hooks..."

# Check if pre-commit is installed
if ! command -v pre-commit &> /dev/null; then
    print_warning "pre-commit not found. Installing..."
    pip install pre-commit || {
        print_error "Failed to install pre-commit"
        exit 1
    }
    print_success "pre-commit installed successfully"
fi

# Install pre-commit hook dependencies
print_info "Installing pre-commit dependencies..."
pip install black isort flake8 bandit || {
    print_error "Failed to install dependencies"
    exit 1
}
print_success "Dependencies installed"

# Install the pre-commit hooks
print_info "Installing pre-commit hooks to .git/hooks..."
pre-commit install || {
    print_error "Failed to install pre-commit hooks"
    exit 1
}
print_success "Pre-commit hooks installed"

# Optional: Run hooks on all files to test
read -p "$(echo -e ${YELLOW}Do you want to run pre-commit on all files now? \(y/N\):${NC} )" -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Running pre-commit on all files..."
    pre-commit run --all-files || {
        print_warning "Some pre-commit checks failed. Please fix the issues."
        print_info "You can run 'pre-commit run --all-files' again after fixing"
    }
fi

print_success "Pre-commit setup complete!"
print_info ""
print_info "Pre-commit hooks will now run automatically before each commit."
print_info ""
print_info "Useful commands:"
print_info "  - Run hooks manually:        pre-commit run --all-files"
print_info "  - Skip hooks for a commit:   git commit --no-verify"
print_info "  - Update hook versions:      pre-commit autoupdate"
print_info "  - Uninstall hooks:           pre-commit uninstall"
