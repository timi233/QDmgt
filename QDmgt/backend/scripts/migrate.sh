#!/bin/bash
# Database Migration Management Script
# Provides convenient commands for managing Alembic database migrations

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and backend root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to backend directory
cd "$BACKEND_ROOT"

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

# Function to display help
show_help() {
    cat << EOF
${GREEN}Database Migration Management Script${NC}

${BLUE}Usage:${NC}
  ./scripts/migrate.sh <command> [arguments]

${BLUE}Commands:${NC}
  ${GREEN}create <message>${NC}
      Create a new migration with autogenerate
      Example: ./scripts/migrate.sh create "Add user table"

  ${GREEN}upgrade [revision]${NC}
      Upgrade database to a later version
      - No argument: upgrade to 'head' (latest)
      - With revision: upgrade to specific revision
      Example: ./scripts/migrate.sh upgrade
      Example: ./scripts/migrate.sh upgrade +1

  ${GREEN}downgrade <revision>${NC}
      Downgrade database to a previous version
      Example: ./scripts/migrate.sh downgrade -1
      Example: ./scripts/migrate.sh downgrade base

  ${GREEN}history${NC}
      List all migration revisions in chronological order

  ${GREEN}current${NC}
      Show current database revision

  ${GREEN}stamp <revision>${NC}
      Mark database as being at a specific revision without running migrations
      Example: ./scripts/migrate.sh stamp head

  ${GREEN}check${NC}
      Check if there are differences between models and database schema

  ${GREEN}help${NC}
      Show this help message

${BLUE}Examples:${NC}
  # Create a new migration
  ./scripts/migrate.sh create "Add email verification"

  # Upgrade to latest version
  ./scripts/migrate.sh upgrade

  # Upgrade by one revision
  ./scripts/migrate.sh upgrade +1

  # Downgrade by one revision
  ./scripts/migrate.sh downgrade -1

  # View migration history
  ./scripts/migrate.sh history

  # Check current database version
  ./scripts/migrate.sh current

  # Check for schema differences
  ./scripts/migrate.sh check

EOF
}

# Check if alembic is available
check_alembic() {
    if ! command -v alembic &> /dev/null; then
        print_error "Alembic is not installed or not in PATH"
        print_info "Please install it with: pip install alembic"
        exit 1
    fi
}

# Main command handler
case "${1:-help}" in
    create)
        check_alembic
        if [ -z "$2" ]; then
            print_error "Migration message is required"
            print_info "Usage: ./scripts/migrate.sh create \"Your migration message\""
            exit 1
        fi

        print_info "Creating new migration: $2"
        alembic revision --autogenerate -m "$2"
        print_success "Migration created successfully"
        print_warning "Please review the generated migration file before applying it"
        ;;

    upgrade)
        check_alembic
        REVISION="${2:-head}"
        print_info "Upgrading database to: $REVISION"
        alembic upgrade "$REVISION"
        print_success "Database upgraded successfully"
        ;;

    downgrade)
        check_alembic
        if [ -z "$2" ]; then
            print_error "Revision argument is required for downgrade"
            print_info "Usage: ./scripts/migrate.sh downgrade <revision>"
            print_info "Example: ./scripts/migrate.sh downgrade -1"
            exit 1
        fi

        print_warning "Downgrading database to: $2"
        read -p "Are you sure you want to downgrade? (yes/no): " -r
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]] || [[ $REPLY =~ ^[Yy]$ ]]; then
            alembic downgrade "$2"
            print_success "Database downgraded successfully"
        else
            print_info "Downgrade cancelled"
        fi
        ;;

    history)
        check_alembic
        print_info "Migration history:"
        alembic history --verbose
        ;;

    current)
        check_alembic
        print_info "Current database revision:"
        alembic current --verbose
        ;;

    stamp)
        check_alembic
        if [ -z "$2" ]; then
            print_error "Revision argument is required for stamp"
            print_info "Usage: ./scripts/migrate.sh stamp <revision>"
            print_info "Example: ./scripts/migrate.sh stamp head"
            exit 1
        fi

        print_warning "Stamping database to revision: $2"
        print_warning "This will mark the database as being at this revision WITHOUT running migrations"
        read -p "Are you sure you want to stamp? (yes/no): " -r
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]] || [[ $REPLY =~ ^[Yy]$ ]]; then
            alembic stamp "$2"
            print_success "Database stamped successfully"
        else
            print_info "Stamp cancelled"
        fi
        ;;

    check)
        check_alembic
        print_info "Checking for schema differences..."
        alembic check
        if [ $? -eq 0 ]; then
            print_success "No schema differences detected"
        fi
        ;;

    help|--help|-h)
        show_help
        ;;

    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
