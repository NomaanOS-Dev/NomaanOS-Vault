# SecureVault — Zero-Knowledge Password Manager

Enterprise-grade Zero-Knowledge Password Manager built with React, TypeScript, Express, PostgreSQL / Prisma ORM, Argon2id, and Web Crypto AES-256-GCM.

---

## Architecture Overview

```
                      +------------------------------------------------+
                      |                 Browser Client                 |
                      |  React 18 + TypeScript + Vite + Tailwind CSS   |
                      +------------------------------------------------+
                                              |
                     1. Master Password -> Argon2id (64MB) -> KEK
                     2. Client generates 256-bit AES-GCM Vault Key
                     3. Client wraps Vault Key with KEK & Recovery Key
                     4. Individual items encrypted locally (AES-256-GCM)
                                              |
                   Only encrypted ciphertext, salts, & wrapped keys sent
                                              |
                                              v
                      +------------------------------------------------+
                      |                  Backend API                   |
                      |            Node.js + Express + Zod             |
                      +------------------------------------------------+
                                |                            |
                    Google OAuth/OIDC Check          Prisma ORM
                    Server-Side Token Verify                 |
                                |                            v
                      +-------------------+        +-------------------+
                      |   Google OAuth    |        |    PostgreSQL     |
                      |  OpenID Connect   |        |   / SQLite Dev    |
                      +-------------------+        +-------------------+
```

---

## Security Model & Zero-Knowledge Guarantee

1. **Client-Side Key Derivation (Argon2id)**:
   - Derives a 256-bit Key Encryption Key (KEK) using Argon2id via WebAssembly (`hash-wasm`).
   - Parameters: Memory = 65536 KiB (64 MB), Iterations = 3, Parallelism = 4.
2. **Authenticated Encryption (AES-256-GCM)**:
   - Plaintext credentials (passwords, usernames, TOTP secrets, notes, URIs, custom fields) are serialized and encrypted in the browser using the Web Crypto API.
   - Every encryption operation generates a cryptographically secure, unique 12-byte (96-bit) IV. Nonces are never reused.
3. **Zero Plaintext Storage**:
   - The server and database **never** see or store the Master Password, derived KEK, or unencrypted vault item credentials.
   - The database only persists base64-encoded ciphertexts (`encryptedPayload`), wrapping metadata, and user ownership relations.
4. **Emergency Recovery System**:
   - Generates a 256-bit high-entropy Recovery Key formatted into 8 blocks (`XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`).
   - The Vault Key is separately wrapped using a key derived from this Recovery Key.
   - If the Master Password is forgotten, access is restored client-side without administrator intervention or backdoors.

---

## Directory Structure

```text
9-Password-Manager/
├── apps/
│   ├── web/                     # React + Vite Frontend
│   │   ├── src/
│   │   │   ├── components/      # UI components & reference modals
│   │   │   │   ├── layout/      # 5-section sidebar & topbar layout
│   │   │   │   └── modals/      # AddLogin, ViewLogin, Folder, Recovery
│   │   │   ├── context/         # AuthContext & VaultContext
│   │   │   ├── lib/             # Web Crypto & Argon2id implementation
│   │   │   ├── pages/           # Login, MasterPasswordSetup, VaultsDashboard
│   │   │   ├── services/        # REST API client
│   │   │   └── styles/          # Tailwind CSS theme
│   │   └── package.json
│   │
│   └── api/                     # Node.js + Express REST API
│       ├── src/
│       │   ├── database/        # Prisma client
│       │   ├── middleware/      # Auth & Error handling
│       │   ├── routes/          # Auth, Vault, Folders, Items
│       │   └── security/        # Google OAuth verification & JWT sessions
│       ├── test/                # Supertest + Vitest integration tests
│       └── package.json
│
├── packages/
│   └── shared/                  # Common TypeScript interfaces & DTOs
│
├── prisma/
│   ├── schema.prisma            # PostgreSQL Production Schema
│   └── schema.sqlite.prisma     # SQLite Development & Testing Schema
│
├── scripts/
│   └── db-setup.mjs             # Automated DB migration & generation
├── docker-compose.yml           # PostgreSQL container service
├── .env.example                 # Environment configuration template
├── package.json                 # Monorepo workspaces & root scripts
└── README.md
```

---

## Quickstart Guide

### 1. Install Dependencies
```powershell
npm.cmd install
```

### 2. Setup Database & Migrations
```powershell
npm.cmd run prisma:push
# Or use the universal setup script:
node scripts/db-setup.mjs
```

### 3. Start Backend & Frontend
In Terminal 1 (Backend API on port 5000):
```powershell
npm.cmd run dev:api
```

In Terminal 2 (Vite Frontend on port 5173):
```powershell
npm.cmd run dev:web
```

Open `http://localhost:5173` in your browser.

---

## Features Implemented Across 3-Day Roadmap

### Day 1: Authentication, Security Foundation, Database & Vaults
- **Real Google Sign-In**: Authenticates users with Google OAuth 2.0 / OpenID Connect ID token verification on the backend.
- **Client-Side Zero-Knowledge Encryption**: Argon2id KEK derivation + AES-256-GCM symmetric encryption for all credentials before transmission.
- **Emergency Recovery Key**: High-entropy 32-character recovery key allowing account recovery if the Master Password is forgotten.
- **Main Vaults Dashboard**: Left filter sidebar (All vaults, Favorites, Login, Card, Identity, Secure Note, SSH key, Folders, Collections, Archive, Trash), real-time search, item list table, and pixel-accurate empty state.
- **Add & Edit Login Modal**: 4-part modal matching screenshots (Item details, Login credentials with password generator integration, Autofill URIs, Additional options).
- **Folder Management**: Create, rename, delete folders with count badges.
- **Favorites, Archive & Trash**: Soft delete with restore and permanent deletion.

### Day 2: Secure Send, Password Generator, Import & Export
- **Secure Send (Text & File)**: Zero-knowledge sharing where AES-256-GCM decryption key resides strictly in the URL fragment (`#key=...`) and is never sent to the server.
- **Public Recipient Page (`/send/:token`)**: End-to-end client decryption, optional password protection, email domain restrictions, atomic access counters, and expiration dates.
- **Password Generator (Tools -> Generator)**:
  - Password mode (custom length 5–128, character toggles A–Z, a–z, 0–9, symbols, minimum numbers/symbols, avoid ambiguous).
  - Passphrase mode (3–20 words, EFF wordlist, customizable separators, capitalize, include numbers).
  - Username mode (random word, email alias, or randomized username).
- **Import (Tools -> Import)**: Parsers for Bitwarden JSON, Bitwarden CSV, and Generic CSV/JSON with live item preview, masked passwords, duplicate handling, and client-side encryption.
- **Export (Tools -> Export)**: JSON and CSV format downloads requiring Master Password re-authentication and client-side decryption.

### Day 3: Full Integration, Onboarding, Settings & Security Reports
- **5-Section Unified Navigation**: Seamless integration between Vaults, Send, Tools (Generator, Import, Export), Reports, and Settings.
- **First-Time User Onboarding Card**: "Get started with your vault" card on Vaults dashboard:
  - Step 1: Account setup (auto-completed).
  - Step 2: Import passwords (navigates to Tools -> Import, marked complete on import).
  - Step 3: Browser extension ("Coming soon").
  - Persistent progress and dismissibility saved to user profile.
- **Settings Page (`/settings`)**:
  - Profile Information: Avatar, display name editing with live persistence, verified email badge, account creation date, and authentication provider.
  - Master Password Management: Re-wraps the symmetric vault key with a fresh Argon2id salt and new password without modifying or re-encrypting existing vault items. Real-time strength meter.
  - Emergency Recovery Key: Explanatory security guidance, key rotation with confirmation modal, and single-use display card with copy action.
  - Account Sign-Out.
- **Security Reports Page (`/reports`)**: Clean security intelligence hub previewing weak passwords, reused credentials, breach monitoring, insecure websites, and 2FA audits.

---

## Google OAuth 2.0 Setup Instructions

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create a new OAuth 2.0 Client ID (Application type: **Web application**).
3. Set **Authorized JavaScript origins**:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
4. Copy the Client ID and Client Secret into `.env`:
   ```env
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```
5. Restart the server. The live Google Sign-In button will appear immediately.

---

## Running the Automated Test Suite

Run the full integration test suite covering Authentication, Zero-Knowledge Encryption, Folders, Items, and Cross-User Isolation:

```powershell
npm.cmd run test
```

