# =====================================================================
# NomaanOS Vault - Production Database Migration Script (PowerShell)
# =====================================================================
$ErrorActionPreference = "Stop"

Write-Host "==> [NomaanOS Vault] Deploying production Prisma migrations..." -ForegroundColor Cyan
npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma
Write-Host "==> [NomaanOS Vault] Database migrations successfully applied!" -ForegroundColor Green
