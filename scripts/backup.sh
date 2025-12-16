#!/bin/bash
# Database backup script for Channel Management System
# Usage: ./scripts/backup.sh [daily|weekly|manual]

set -e

# Configuration
BACKUP_TYPE="${1:-manual}"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Load environment variables
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
elif [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Set defaults
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres123}
POSTGRES_DB=${POSTGRES_DB:-channel_db}
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

echo "========================================"
echo "Database Backup - ${BACKUP_TYPE}"
echo "Time: $(date)"
echo "========================================"

# Create backup directory
mkdir -p "${BACKUP_DIR}/${BACKUP_TYPE}"

# Backup filename
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_TYPE}/channel_db_${DATE}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

# Create PostgreSQL backup
echo "Creating database backup..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  > "${BACKUP_FILE}"

# Compress backup
echo "Compressing backup..."
gzip "${BACKUP_FILE}"

# Get file size
BACKUP_SIZE=$(ls -lh "${BACKUP_FILE_GZ}" | awk '{print $5}')
echo "Backup created: ${BACKUP_FILE_GZ} (${BACKUP_SIZE})"

# Redis backup (optional)
echo "Creating Redis backup..."
REDIS_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_TYPE}/redis_${DATE}.rdb"
docker exec channel-redis redis-cli -a "${REDIS_PASSWORD:-redis123}" BGSAVE 2>/dev/null || true
sleep 2
docker cp channel-redis:/data/dump.rdb "${REDIS_BACKUP_FILE}" 2>/dev/null || echo "Redis backup skipped (container not running)"

# Cleanup old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name "*.rdb" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# Count remaining backups
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "*.sql.gz" -type f | wc -l)

echo ""
echo "========================================"
echo "Backup Complete!"
echo "File: ${BACKUP_FILE_GZ}"
echo "Size: ${BACKUP_SIZE}"
echo "Total backups: ${BACKUP_COUNT}"
echo "========================================"
