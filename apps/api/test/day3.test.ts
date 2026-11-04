import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/database/prisma';

describe('Password Manager Day 3 Integration & Settings Tests', () => {
  let userToken: string;
  let userId: string;
  let userEmail: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    userEmail = `day3.user.${timestamp}@securevault.io`;
    const res = await request(app)
      .post('/api/auth/dev-login')
      .send({ email: userEmail, name: 'Day 3 Test User' });

    expect(res.status).toBe(200);
    userToken = res.body.data.token;
    userId = res.body.data.user.id;

    // Set up master password for this user
    await request(app)
      .post('/api/vault/setup-master-password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        encryptedVaultKey: 'initial_encrypted_vault_key_mock_base64',
        masterPasswordSalt: 'initial_salt_mock_base64',
        kdfAlgorithm: 'Argon2id',
        kdfParameters: { memory: 65536, iterations: 3, parallelism: 4, hashLength: 32 },
        recoveryWrappedVaultKey: 'initial_recovery_wrapped_key_mock',
        hint: 'My first hint',
      });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. User Profile & Settings API', () => {
    it('GET /api/auth/me should return onboarding state and auth provider', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(userEmail);
      expect(res.body.data.user.onboardingDismissed).toBe(false);
      expect(res.body.data.user.authProvider).toBeDefined();
      expect(res.body.data.user.createdAt).toBeDefined();
    });

    it('PUT /api/auth/profile should update display name', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'Updated Alice Engineer' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('Updated Alice Engineer');

      // Verify persistence in DB
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.username).toBe('Updated Alice Engineer');
    });

    it('PUT /api/auth/profile should update onboardingDismissed flag', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ onboardingDismissed: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.onboardingDismissed).toBe(true);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.onboardingDismissed).toBe(true);
    });

    it('PUT /api/auth/profile should reject empty display name', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Master Password Management', () => {
    it('POST /api/vault/change-master-password should re-wrap vault key with new salt and hint', async () => {
      const res = await request(app)
        .post('/api/vault/change-master-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          encryptedVaultKey: 'new_re_wrapped_vault_key_mock_base64',
          masterPasswordSalt: 'new_fresh_salt_mock_base64',
          hint: 'Updated master password hint',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify key metadata was updated
      const keysRes = await request(app)
        .get('/api/vault/keys')
        .set('Authorization', `Bearer ${userToken}`);

      expect(keysRes.status).toBe(200);
      expect(keysRes.body.data.encryptedVaultKey).toBe('new_re_wrapped_vault_key_mock_base64');
      expect(keysRes.body.data.masterPasswordSalt).toBe('new_fresh_salt_mock_base64');
      expect(keysRes.body.data.hint).toBe('Updated master password hint');

      // Verify audit event
      const audit = await prisma.auditEvent.findFirst({
        where: { userId, eventType: 'MASTER_PASSWORD_CHANGED' },
      });
      expect(audit).not.toBeNull();
    });

    it('POST /api/vault/rotate-recovery-key should update recovery wrapped key', async () => {
      const res = await request(app)
        .post('/api/vault/rotate-recovery-key')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          recoveryWrappedVaultKey: 'rotated_recovery_wrapped_vault_key_mock',
          recoveryMetadata: JSON.stringify({ rotatedAt: new Date().toISOString() }),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const keysRes = await request(app)
        .get('/api/vault/keys')
        .set('Authorization', `Bearer ${userToken}`);

      expect(keysRes.status).toBe(200);
      expect(keysRes.body.data.recoveryWrappedVaultKey).toBe('rotated_recovery_wrapped_vault_key_mock');

      // Verify audit event
      const audit = await prisma.auditEvent.findFirst({
        where: { userId, eventType: 'RECOVERY_KEY_ROTATED' },
      });
      expect(audit).not.toBeNull();
    });
  });
});

