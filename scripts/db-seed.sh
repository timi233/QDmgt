#!/bin/bash
# Database seed script

set -e

echo "========================================"
echo "Seeding Database"
echo "========================================"

# Navigate to backend directory
cd backend

# Run seed script
echo "Running seed script..."
npm run db:seed

echo ""
echo "✓ Database seeded successfully!"
echo "========================================"
