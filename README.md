# NomaanOS Vault — Enterprise Zero-Knowledge Password Manager

**NomaanOS Vault** is a secure, enterprise-grade, zero-knowledge password and credentials manager. Built with a client-first cryptographic architecture, sensitive secrets are encrypted and decrypted strictly in the browser using Argon2id key derivation and AES-256-GCM authenticated encryption. The server and database never receive or store plaintext passwords, recovery keys, or vault data.

---

## Key Features

1. **Enterprise Zero-Knowledge Cryptography**:
   - Master Password never leaves the client; key derivation uses WebAssembly **Argon2id** (64MB memory, 3 iterations, 4 parallelism).
   - 256-bit AES-GCM Vault Key generated locally in the browser with Web Crypto API and wrapped using the derived Key Encryption Key (KEK).
   - Unique 12-byte (96-bit) nonces/IVs generated for every encryption operation.

2. **Immutable Master Password Architecture**:
   - Master Password is permanently fixed upon account creation to prevent cryptanalytic downgrade attacks or unauthorized vault re-wrapping.
   - Master Password Hint is never stored in plaintext and is never displayed on screen or leaked via API; it is dispatched privately via verified email only.

3. **Multi-Factor Account Registration & Email Verification**:
   - Standard email/password registration with SHA-256 hashed single-use verification tokens.
   - Unverified accounts cannot set up or access vault key material.
   - Transactional email service with responsive HTML email templates for account activation and password hints.
   - Google OAuth 2.0 / OpenID Connect integration for SSO.

4. **Comprehensive Vault Categories**:
   - **Logins**: URLs, usernames, passwords, TOTP authenticator secrets, custom fields.
   - **Payment Cards**: Cardholder name, card brand, card number, expiration dates, security code / CVV.
   - **Identities**: Full name, email, phone, street address, city, state, postal code, country.
   - **Secure Notes**: Multi-line markdown notes with search capabilities.
   - **SSH Keys**: Key name, host/fingerprint, public key, private key, passphrase.

5. **Secure Send (Zero-Knowledge Sharing)**:
   - Share ephemeral encrypted text or encrypted files (up to 20 MB).
   - Passphrase protection with client-side PBKDF2/AES-GCM encryption.
   - Expiration dates and strict access limits (1, 2, 4, 10, or unlimited views).
   - Concurrency-safe atomic access counter ensuring race conditions cannot bypass access limits.

6. **Password & Passphrase Generator**:
   - Cryptographically secure pseudorandom generator (`crypto.getRandomValues`).
   - Customizable character sets (uppercase, lowercase, numbers, symbols, ambiguous character exclusion).
   - Wordlist-based passphrase generator with selectable delimiters.
   - Username and email alias generator.

7. **Data Portability**:
   - **Import**: CSV / JSON import with field mapping and duplicate detection.
   - **Export**: Plaintext JSON/CSV or encrypted password-protected backup archives.

8. **Original Premium Visual Identity**:
   - Bespoke light-first security workspace design (`#F7F8F5` Ivory background, `#FFFFFF` crisp cards, `#202923` Charcoal text, `#168568` Emerald brand accents).
   - Fully responsive layout across mobile, tablet, and desktop viewports.

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, `hash-wasm` (Argon2id)
- **Backend**: Node.js, Express, TypeScript, Zod, Helmet, Express Rate Limit, Nodemailer
- **Database**: PostgreSQL 16 (production) / SQLite (local dev), Prisma ORM
- **Deployment**: Docker, Docker Compose, Nginx Alpine, Multi-stage builds

---

## Quick Start (Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Default `.env` is configured for local SQLite development.

### 3. Initialize Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Servers
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

---

## Production Deployment

### 1. Configure Production Environment
```bash
cp .env.production.example .env
```
Set `JWT_SECRET`, `SESSION_SECRET`, `POSTGRES_PASSWORD`, `APP_BASE_URL`, and SMTP credentials.

### 2. Launch Production Containers
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 3. Deploy Database Migrations
```bash
./scripts/migrate-prod.sh
```

For full production architecture, TLS setup, and maintenance guidelines, see [DEPLOYMENT.md](file:///d:/Projects/9-Password-Manager/DEPLOYMENT.md).

---

## Automated Test Suites

Run the complete test suite:
```bash
npm test
```
The suite executes 63 unit and integration tests across 6 suites:
- `registration-verification.test.ts`: Registration, token verification, replay prevention, unverified access rejection.
- `categories.test.ts`: End-to-end CRUD for LOGIN, CARD, IDENTITY, SECURE_NOTE, SSH_KEY.
- `send-limits.test.ts`: Atomic concurrency, access exhaustion, and wrong-password preservation.
- `send.test.ts`: Secure Send creation, public recipient download, file storage, and passphrase validation.
- `api.test.ts`: Day 1 core vault cryptography, folder isolation, item lifecycle.
- `day3.test.ts`: Day 3 settings, reports, export/import, and master password immutability guards.

---

## License

Private & Confidential — NomaanOS Vault. All Rights Reserved.
