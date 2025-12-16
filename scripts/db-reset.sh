#!/bin/bash
# Database reset script

set -e

echo "========================================"
echo "Resetting Database"
echo "========================================"

# Navigate to backend directory
cd backend

# Reset database with Prisma
echo "Running Prisma migrate reset..."
npx prisma migrate reset --force

echo ""
echo "✓ Database reset complete!"
echo "========================================"
