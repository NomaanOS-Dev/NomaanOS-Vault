#!/usr/bin/env bash
# =====================================================================
# NomaanOS Vault - PostgreSQL Database Backup Script (Linux / macOS)
# =====================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/vault_backup_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="${DB_CONTAINER:-nomaanos-vault-db}"
DB_USER="${POSTGRES_USER:-vaultadmin}"
DB_NAME="${POSTGRES_DB:-nomaanos_vault}"

mkdir -p "${BACKUP_DIR}"

echo "==> [NomaanOS Vault] Starting PostgreSQL database backup..."
echo "    Container: ${CONTAINER_NAME}"
echo "    Database:  ${DB_NAME}"
echo "    Target:    ${BACKUP_FILE}"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"
else
  echo "Container ${CONTAINER_NAME} is not running. Attempting direct pg_dump using DATABASE_URL..."
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL is not set and Docker container is unavailable." >&2
    exit 1
  fi
  pg_dump "${DATABASE_URL}" --clean --if-exists | gzip > "${BACKUP_FILE}"
fi

BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo "==> [NomaanOS Vault] Backup completed successfully!"
echo "    Output: ${BACKUP_FILE} (${BACKUP_SIZE})"

