#!/bin/bash
# Test runner script

set -e

echo "========================================"
echo "Running Tests"
echo "========================================"

# Run frontend tests
echo "Running frontend tests..."
cd frontend
npm test

# Run backend tests
echo "Running backend tests..."
cd ../backend
npm test

echo ""
echo "✓ All tests passed!"
echo "========================================"
