#!/bin/bash
# Production deployment script

set -e

echo "========================================"
echo "Starting Production Deployment"
echo "========================================"

# Load production environment
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
  echo "✓ Production environment loaded"
fi

# Build frontend
echo "Building frontend..."
cd frontend
npm ci --production=false
npm run build
cd ..

# Build backend
echo "Building backend..."
cd backend
npm ci --production=false
npx prisma generate
npm run build
cd ..

# Build and start Docker containers
echo "Building Docker containers..."
docker-compose -f docker-compose.yml build

echo "Starting production containers..."
docker-compose -f docker-compose.yml up -d

echo ""
echo "========================================"
echo "✓ Deployment Complete!"
echo "========================================"
