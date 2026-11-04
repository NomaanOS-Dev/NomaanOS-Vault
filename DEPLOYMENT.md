# NomaanOS Vault — Production Deployment Guide

This guide details how to build, configure, deploy, back up, and maintain **NomaanOS Vault** in production environments.

---

## 1. System Architecture

NomaanOS Vault is packaged as a three-tier containerized stack:

1. **`nomaanos-vault-web`**: Reverse proxy and static file server powered by Nginx Alpine. Enforces strict security headers, handles gzip compression, and proxies `/api` traffic to the backend.
2. **`nomaanos-vault-api`**: Zero-knowledge Node.js REST API service running under an unprivileged user (`vaultuser:nodejs`).
3. **`nomaanos-vault-db`**: PostgreSQL 16 database with persisted Docker volume and isolated internal network bridge.

```
                    Internet / Reverse Proxy / SSL
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │     nomaanos-vault-web     │
                    │   (Nginx Alpine : Port 80) │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │     nomaanos-vault-api     │
                    │  (Node.js API : Port 3001) │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │     nomaanos-vault-db      │
                    │   (PostgreSQL 16 : 5432)   │
                    └────────────────────────────┘
```

---

## 2. Prerequisites

- **Docker Engine**: version 24.0 or newer
- **Docker Compose**: version 2.20 or newer
- **Domain Name**: with DNS A/AAAA records pointing to your host server
- **SSL Certificate**: Let's Encrypt / Certbot, Cloudflare, or an upstream TLS reverse proxy (e.g., Traefik / Caddy / AWS ALB)
- **SMTP Service**: SendGrid, AWS SES, Mailgun, Postmark, or custom SMTP server

---

## 3. Production Environment Configuration

1. Copy `.env.production.example` to `.env`:
   ```bash
   cp .env.production.example .env
   ```

2. Generate cryptographically strong random secrets:
   ```bash
   # Generate JWT Secret
   openssl rand -base64 32

   # Generate Session Secret
   openssl rand -base64 32

   # Generate Database Password
   openssl rand -hex 24
   ```

3. Configure variables in `.env`:
   ```ini
   NODE_ENV=production
   PORT=3001
   HTTP_PORT=80

   POSTGRES_USER=vaultadmin
   POSTGRES_PASSWORD=<GENERATED_DB_PASSWORD>
   POSTGRES_DB=nomaanos_vault
   DATABASE_URL=postgresql://vaultadmin:<GENERATED_DB_PASSWORD>@postgres:5432/nomaanos_vault?schema=public

   JWT_SECRET=<GENERATED_JWT_SECRET>
   SESSION_SECRET=<GENERATED_SESSION_SECRET>

   APP_BASE_URL=https://vault.yourdomain.com
   CORS_ORIGIN=https://vault.yourdomain.com

   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=<YOUR_SMTP_KEY>
   SMTP_FROM="NomaanOS Vault <no-reply@vault.yourdomain.com>"

   # Optional Google OAuth:
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   ```

---

## 4. Deployment Steps

### Step 1: Build and Launch Containers
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 2: Apply Database Schema Migrations
Run Prisma migration on the PostgreSQL container:
```bash
# Using helper script
./scripts/migrate-prod.sh

# Or directly via docker exec
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma
```

### Step 3: Verify Container Health Status
Check container status and health probes:
```bash
docker compose -f docker-compose.prod.yml ps
```
Both `api` and `web` containers will report `healthy`.

To check API health probes directly:
```bash
# Liveness probe
curl -I http://localhost:3001/api/health

# Readiness probe (verifies database connectivity)
curl -I http://localhost:3001/api/ready
```

---

## 5. Security & TLS Configuration

For production deployment exposed to the public internet, terminate TLS at either:
- **Option A (Recommended)**: Cloudflare proxy or an upstream host reverse proxy (Caddy / Traefik / Nginx) routing HTTPS :443 to `nomaanos-vault-web` port :80.
- **Option B (Direct Certbot)**: Mount SSL certificates into `/etc/nginx/certs` and bind port `443:443` in `docker-compose.prod.yml`.

Security headers preconfigured in `nginx/nginx.conf`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` with minimal attack surface
- `client_max_body_size 25M` for secure encrypted file sends

---

## 6. Database Backups & Recovery

### Automated Database Backup
Run the backup script manually or configure it as a daily cron job:
```bash
# Linux / macOS
./scripts/backup-db.sh

# Windows PowerShell
.\scripts\backup-db.ps1
```
Backups are compressed with gzip and timestamped in `./backups/vault_backup_YYYYMMDD_HHMMSS.sql.gz`.

### Database Restore
To restore from an existing backup:
```bash
# Linux / macOS
./scripts/restore-db.sh ./backups/vault_backup_20261104_120000.sql.gz

# Windows PowerShell
.\scripts\restore-db.ps1 -BackupFile ./backups/vault_backup_20261104_120000.sql
```

---

## 7. Storage Management for Send Files

Encrypted files uploaded via Secure Send are stored in the Docker volume `nomaanos_vault_send_storage`.
- Expired or access-exhausted Send files are automatically purged by the server background cleaner.
- The volume remains isolated within Docker and is not directly accessible to unauthenticated web requests.
