#!/usr/bin/env bash
# =====================================================================
# NomaanOS Vault - Production Database Migration Script
# =====================================================================
set -euo pipefail

echo "==> [NomaanOS Vault] Deploying production Prisma migrations..."
npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma
echo "==> [NomaanOS Vault] Database migrations successfully applied!"
