#!/bin/bash
# Database restore script for Channel Management System
# Usage: ./scripts/restore.sh <backup_file.sql.gz>

set -e

BACKUP_FILE="$1"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: ./scripts/restore.sh <backup_file.sql.gz>"
  echo ""
  echo "Available backups:"
  find ./backups -name "*.sql.gz" -type f -printf "%T@ %p\n" 2>/dev/null | sort -rn | head -10 | cut -d' ' -f2-
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

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
echo "Database Restore"
echo "Time: $(date)"
echo "File: ${BACKUP_FILE}"
echo "========================================"

# Confirm restore
echo ""
echo "WARNING: This will overwrite the current database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

# Create pre-restore backup
echo "Creating pre-restore backup..."
PRE_RESTORE_BACKUP="./backups/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
mkdir -p ./backups
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --no-owner \
  --no-acl \
  | gzip > "${PRE_RESTORE_BACKUP}"
echo "Pre-restore backup saved: ${PRE_RESTORE_BACKUP}"

# Restore database
echo "Restoring database..."
gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --quiet

echo ""
echo "========================================"
echo "Restore Complete!"
echo "Pre-restore backup: ${PRE_RESTORE_BACKUP}"
echo "========================================"
