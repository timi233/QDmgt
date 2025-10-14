#!/bin/bash

# Channel Management System - Test Runner Script
#
# This script runs all tests with coverage reporting
# Usage: ./scripts/run_tests.sh [unit|integration|all|coverage]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root
cd "$PROJECT_ROOT"

# Export PYTHONPATH
export PYTHONPATH="$PROJECT_ROOT"

# Default test type
TEST_TYPE="${1:-all}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Channel Management System - Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to run tests
run_tests() {
    local test_path=$1
    local test_name=$2

    echo -e "${YELLOW}Running ${test_name}...${NC}"
    python -m pytest "$test_path" -v --tb=short \
        --ignore=backend/src/tests/security_test.py \
        --ignore=backend/src/tests/unit/test_security_extended.py
}

# Function to run tests with coverage
run_tests_with_coverage() {
    local test_path=$1
    local test_name=$2

    echo -e "${YELLOW}Running ${test_name} with coverage...${NC}"
    python -m pytest "$test_path" -v --tb=short \
        --cov=backend/src \
        --cov-report=html \
        --cov-report=term \
        --cov-report=xml \
        --ignore=backend/src/tests/security_test.py \
        --ignore=backend/src/tests/unit/test_security_extended.py
}

# Main execution
case "$TEST_TYPE" in
    unit)
        echo -e "${GREEN}Running Unit Tests${NC}"
        run_tests "backend/src/tests/unit" "Unit Tests"
        run_tests "backend/src/tests/test_conftest.py" "Config Tests"
        ;;

    integration)
        echo -e "${GREEN}Running Integration Tests${NC}"
        run_tests "backend/src/tests/integration" "Integration Tests"
        ;;

    cli)
        echo -e "${GREEN}Running CLI Tests${NC}"
        if [ -d "backend/src/tests/cli" ]; then
            run_tests "backend/src/tests/cli" "CLI Tests"
        else
            echo -e "${YELLOW}CLI tests directory not found${NC}"
        fi
        ;;

    coverage)
        echo -e "${GREEN}Running All Tests with Coverage${NC}"
        run_tests_with_coverage "backend/src/tests" "All Tests"

        echo ""
        echo -e "${BLUE}========================================${NC}"
        echo -e "${GREEN}Coverage report generated:${NC}"
        echo -e "  HTML: ${BLUE}htmlcov/index.html${NC}"
        echo -e "  XML:  ${BLUE}coverage.xml${NC}"
        echo -e "${BLUE}========================================${NC}"
        ;;

    all)
        echo -e "${GREEN}Running All Tests${NC}"

        # Run conftest validation
        echo ""
        echo -e "${YELLOW}→ Testing Configuration...${NC}"
        run_tests "backend/src/tests/test_conftest.py" "Config Tests"

        # Run unit tests
        echo ""
        echo -e "${YELLOW}→ Testing Units...${NC}"
        run_tests "backend/src/tests/unit" "Unit Tests"

        # Run integration tests
        echo ""
        echo -e "${YELLOW}→ Testing Integration...${NC}"
        run_tests "backend/src/tests/integration" "Integration Tests"

        # Run CLI tests if available
        if [ -d "backend/src/tests/cli" ]; then
            echo ""
            echo -e "${YELLOW}→ Testing CLI...${NC}"
            run_tests "backend/src/tests/cli" "CLI Tests"
        fi
        ;;

    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo ""
        echo "Usage: $0 [unit|integration|cli|all|coverage]"
        echo ""
        echo "Options:"
        echo "  unit        - Run unit tests only"
        echo "  integration - Run integration tests only"
        echo "  cli         - Run CLI tests only"
        echo "  all         - Run all tests (default)"
        echo "  coverage    - Run all tests with coverage report"
        exit 1
        ;;
esac

# Get exit code from tests
TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}========================================${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed successfully!${NC}"
else
    echo -e "${RED}✗ Some tests failed${NC}"
fi

echo -e "${BLUE}========================================${NC}"

exit $TEST_EXIT_CODE
