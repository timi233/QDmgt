#!/bin/bash
# Development environment startup script

set -e

echo "========================================"
echo "Starting Development Environment"
echo "========================================"

# Load environment variables
if [ -f .env.development ]; then
  export $(cat .env.development | grep -v '^#' | xargs)
  echo "✓ Environment variables loaded"
fi

# Create data directories
mkdir -p data/postgres data/redis
echo "✓ Data directories created"

# Start Docker services
echo "Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check service health
echo ""
echo "Service Status:"
docker-compose ps

echo ""
echo "========================================"
echo "Development Environment Ready!"
echo "========================================"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:4000"
echo "Nginx: http://localhost"
echo "PostgreSQL: localhost:5432"
echo "Redis: localhost:6379"
echo "========================================"
echo ""
echo "To view logs: docker-compose logs -f [service-name]"
echo "To stop: docker-compose down"
echo ""
