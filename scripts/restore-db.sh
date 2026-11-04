#!/usr/bin/env bash
# =====================================================================
# NomaanOS Vault - PostgreSQL Database Restore Script (Linux / macOS)
# =====================================================================
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz|backup-file.sql>" >&2
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="${DB_CONTAINER:-nomaanos-vault-db}"
DB_USER="${POSTGRES_USER:-vaultadmin}"
DB_NAME="${POSTGRES_DB:-nomaanos_vault}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file ${BACKUP_FILE} not found." >&2
  exit 1
fi

echo "==> [NomaanOS Vault] Restoring database from: ${BACKUP_FILE}"
echo "    Target Database: ${DB_NAME} on container ${CONTAINER_NAME}"
read -p "Are you sure you want to overwrite data in ${DB_NAME}? (y/N): " -r CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 0
fi

if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"
else
  cat "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"
fi

echo "==> [NomaanOS Vault] Database restore completed successfully!"
