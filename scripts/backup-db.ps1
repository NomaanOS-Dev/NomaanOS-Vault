# =====================================================================
# NomaanOS Vault - PostgreSQL Database Backup Script (PowerShell / Windows)
# =====================================================================
param(
  [string]$BackupDir = "./backups",
  [string]$ContainerName = "nomaanos-vault-db",
  [string]$DbUser = "vaultadmin",
  [string]$DbName = "nomaanos_vault"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupDir "vault_backup_$timestamp.sql"

Write-Host "==> [NomaanOS Vault] Starting PostgreSQL database backup..." -ForegroundColor Cyan
Write-Host "    Container: $ContainerName"
Write-Host "    Database:  $DbName"
Write-Host "    Target:    $backupFile"

$runningContainers = docker ps --format "{{.Names}}"
if ($runningContainers -contains $ContainerName) {
  docker exec -t $ContainerName pg_dump -U $DbUser -d $DbName --clean --if-exists > $backupFile
  Write-Host "==> [NomaanOS Vault] Backup completed successfully: $backupFile" -ForegroundColor Green
} else {
  Write-Warning "Container $ContainerName is not currently running. Ensure container is active."
  exit 1
}

