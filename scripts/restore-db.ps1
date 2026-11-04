# =====================================================================
# NomaanOS Vault - PostgreSQL Database Restore Script (PowerShell / Windows)
# =====================================================================
param(
  [Parameter(Mandatory=$true)]
  [string]$BackupFile,
  [string]$ContainerName = "nomaanos-vault-db",
  [string]$DbUser = "vaultadmin",
  [string]$DbName = "nomaanos_vault"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $BackupFile)) {
  Write-Error "Backup file $BackupFile does not exist."
  exit 1
}

Write-Host "==> [NomaanOS Vault] Restoring database from: $BackupFile" -ForegroundColor Yellow
Write-Host "    Target Database: $DbName on container $ContainerName"
$confirm = Read-Host "Are you sure you want to overwrite data in $DbName? (y/N)"
if ($confirm -notmatch "^[Yy]$") {
  Write-Host "Restore cancelled."
  exit 0
}

Get-Content -Path $BackupFile | docker exec -i $ContainerName psql -U $DbUser -d $DbName
Write-Host "==> [NomaanOS Vault] Database restore completed successfully!" -ForegroundColor Green

