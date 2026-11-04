import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/database/prisma';

describe('Account Registration & Email Verification Tests', () => {
  const timestamp = Date.now();
  const testEmail = `newuser.${timestamp}@testvault.io`;
  const testName = 'Jane Cryptographer';
  let devToken: string;
  let userSessionToken: string;
  let userId: string;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. POST /api/auth/register creates unverified user and generates verification token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: testName, email: testEmail });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testEmail.toLowerCase());
    expect(res.body.data.devVerificationToken).toBeDefined();
    devToken = res.body.data.devVerificationToken;

    // Verify in database: user exists and is unverified
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail.toLowerCase() },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.emailVerified).toBe(false);
    userId = dbUser!.id;
  });

  it('2. SECURITY: Unverified user cannot setup Master Password', async () => {
    // Create an unverified user
    const unverifiedEmail = `unverified.${timestamp}@testvault.io`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Unverified Alice', email: unverifiedEmail });

    const aliceRes = await request(app)
      .post('/api/auth/dev-login')
      .send({ email: unverifiedEmail, name: 'Unverified Alice' });

    // Explicitly set emailVerified = false on that user in DB
    await prisma.user.update({
      where: { id: aliceRes.body.data.user.id },
      data: { emailVerified: false },
    });

    const setupRes = await request(app)
      .post('/api/vault/setup-master-password')
      .set('Authorization', `Bearer ${aliceRes.body.data.token}`)
      .send({
        encryptedVaultKey: 'mock-key',
        masterPasswordSalt: 'mock-salt',
        kdfAlgorithm: 'Argon2id',
        kdfParameters: { memory: 65536, iterations: 3, parallelism: 4, hashLength: 32 },
        recoveryWrappedVaultKey: 'mock-recovery',
      });

    expect(setupRes.status).toBe(403);
    expect(setupRes.body.error).toBe('EMAIL_NOT_VERIFIED');
  });

  it('3. POST /api/auth/verify-email rejects invalid verification token', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: '0000000000000000000000000000000000000000000000000000000000000000' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  it('4. POST /api/auth/verify-email succeeds with valid token and marks email verified', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: devToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.emailVerified).toBe(true);
    userSessionToken = res.body.data.token;

    // Check DB
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(dbUser?.emailVerified).toBe(true);
  });

  it('5. SECURITY: Replay attack prevention - used token cannot be reused', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: devToken });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('TOKEN_ALREADY_USED');
  });

  it('6. POST /api/vault/setup-master-password succeeds for verified user and hint is not stored in DB', async () => {
    const res = await request(app)
      .post('/api/vault/setup-master-password')
      .set('Authorization', `Bearer ${userSessionToken}`)
      .send({
        encryptedVaultKey: 'user-vault-key-base64',
        masterPasswordSalt: 'user-salt-base64',
        kdfAlgorithm: 'Argon2id',
        kdfParameters: { memory: 65536, iterations: 3, parallelism: 4, hashLength: 32 },
        recoveryWrappedVaultKey: 'user-recovery-wrapped-key',
        hint: 'My first pet on Birch street',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify hint is NOT in the response
    expect(res.body.data.keyMetadata.hint).toBeUndefined();

    // Verify hint is NOT stored in the database
    const vault = await prisma.vault.findFirst({
      where: { userId },
      include: { keyMetadata: true },
    });
    expect(vault?.keyMetadata).not.toBeNull();
    // hint column doesn't even exist on VaultKeyMetadata or is null
    expect((vault?.keyMetadata as any)?.hint).toBeUndefined();

    // Verify GET /api/vault/keys does NOT expose the hint
    const keysRes = await request(app)
      .get('/api/vault/keys')
      .set('Authorization', `Bearer ${userSessionToken}`);
    expect(keysRes.status).toBe(200);
    expect(keysRes.body.data.hint).toBeUndefined();
  });
});
