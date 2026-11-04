import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/database/prisma';

describe('Password Manager Day 1 Security & API Integration Tests', () => {
  let userAToken: string;
  let userAId: string;
  let userAEmail: string;
  let userBToken: string;
  let userBId: string;

  let userAFolderId: string;
  let userAItemId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    userAEmail = `user.a.${timestamp}@securevault.io`;
    // Setup test users via dev-login endpoint with unique emails for test run
    const resA = await request(app)
      .post('/api/auth/dev-login')
      .send({ email: userAEmail, name: 'User Alice' });

    expect(resA.status).toBe(200);
    expect(resA.body.success).toBe(true);
    userAToken = resA.body.data.token;
    userAId = resA.body.data.user.id;

    const resB = await request(app)
      .post('/api/auth/dev-login')
      .send({ email: `user.b.${timestamp}@securevault.io`, name: 'User Bob' });

    expect(resB.status).toBe(200);
    expect(resB.body.success).toBe(true);
    userBToken = resB.body.data.token;
    userBId = resB.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Authentication & Security Configuration', () => {
    it('GET /api/auth/config should report Google OAuth status', async () => {
      const res = await request(app).get('/api/auth/config');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.googleConfigured).toBe('boolean');
    });

    it('GET /api/auth/me should return current authenticated user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(userAEmail);
      expect(res.body.data.user.emailVerified).toBe(true);
    });

    it('GET /api/auth/me without token should return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('POST /api/auth/google without real credentials should reject or return proper 503/401 error', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'fake-id-token' });

      // Either not configured (503) or token invalid (401)
      expect([401, 503]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Master Password Setup & Recovery Workflow', () => {
    it('POST /api/vault/setup-master-password should securely configure client-wrapped vault keys', async () => {
      const res = await request(app)
        .post('/api/vault/setup-master-password')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          encryptedVaultKey: 'wrapped-vault-key-base64-alice',
          masterPasswordSalt: 'salt-alice-base64',
          kdfAlgorithm: 'Argon2id',
          kdfParameters: { memory: 65536, iterations: 3, parallelism: 4, hashLength: 32 },
          recoveryWrappedVaultKey: 'recovery-wrapped-vault-key-alice',
          hint: 'Favorite animal',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/vault/setup-master-password duplicate setup must be rejected', async () => {
      const res = await request(app)
        .post('/api/vault/setup-master-password')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          encryptedVaultKey: 'duplicate-attempt',
          masterPasswordSalt: 'salt',
          kdfAlgorithm: 'Argon2id',
          kdfParameters: { memory: 65536, iterations: 3, parallelism: 4, hashLength: 32 },
          recoveryWrappedVaultKey: 'rec-key',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ALREADY_CONFIGURED');
    });

    it('GET /api/vault/keys should return key derivation parameters without leaking plaintext', async () => {
      const res = await request(app)
        .get('/api/vault/keys')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.masterPasswordSalt).toBe('salt-alice-base64');
      expect(res.body.data.encryptedVaultKey).toBe('wrapped-vault-key-base64-alice');
      expect(res.body.data.hint).toBe('Favorite animal');
    });

    it('POST /api/vault/recover should permit updating master password wrapping with valid recovery key', async () => {
      const res = await request(app)
        .post('/api/vault/recover')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          recoveryKey: 'AAAA-BBBB-CCCC-DDDD',
          newEncryptedVaultKey: 'new-wrapped-vault-key-alice',
          newMasterPasswordSalt: 'new-salt-alice-base64',
          newKdfParameters: { memory: 65536, iterations: 3, parallelism: 4, hashLength: 32 },
          newRecoveryWrappedVaultKey: 'new-recovery-wrapped-alice',
          newHint: 'New Hint',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Folder Management & User Ownership', () => {
    it('POST /api/folders should create folder for User A', async () => {
      const res = await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Work' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Work');
      userAFolderId = res.body.data.id;
    });

    it('PUT /api/folders/:id should rename folder', async () => {
      const res = await request(app)
        .put(`/api/folders/${userAFolderId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Work Accounts' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Work Accounts');
    });

    it('SECURITY: User B cannot rename or access User A folder', async () => {
      const res = await request(app)
        .put(`/api/folders/${userAFolderId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Hacked by User B' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('FOLDER_NOT_FOUND');
    });
  });

  describe('4. Vault Items: Zero-Knowledge Payload Storage & Lifecycle', () => {
    it('POST /api/items should store encrypted payload without storing plaintext credentials', async () => {
      const fakeEncryptedPayload = JSON.stringify({
        ciphertext: 'base64-aes-256-gcm-ciphertext-XYZ123',
        iv: 'base64-12-byte-nonce',
      });

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          itemName: 'Google Cloud Console',
          itemType: 'LOGIN',
          encryptedPayload: fakeEncryptedPayload,
          folderId: userAFolderId,
          isFavorite: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.itemName).toBe('Google Cloud Console');
      expect(res.body.data.encryptedPayload).toBe(fakeEncryptedPayload);
      userAItemId = res.body.data.id;

      // Verify directly in DB that no plaintext credentials exist
      const dbRecord = await prisma.vaultItem.findUnique({
        where: { id: userAItemId },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.encryptedPayload).toBe(fakeEncryptedPayload);
      // Ensure no plaintext username or password columns exist in DB schema
      expect((dbRecord as any).password).toBeUndefined();
      expect((dbRecord as any).username).toBeUndefined();
    });

    it('GET /api/items should list items for User A', async () => {
      const res = await request(app)
        .get('/api/items')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe(userAItemId);
    });

    it('SECURITY: User B cannot access User A item', async () => {
      const res = await request(app)
        .get(`/api/items/${userAItemId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ITEM_NOT_FOUND');
    });

    it('SECURITY: User B cannot update User A item', async () => {
      const res = await request(app)
        .put(`/api/items/${userAItemId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          itemName: 'Malicious Overwrite',
          encryptedPayload: 'tampered',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ITEM_NOT_FOUND');
    });

    it('PATCH /api/items/:id/favorite should toggle favorite', async () => {
      const res = await request(app)
        .patch(`/api/items/${userAItemId}/favorite`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isFavorite).toBe(false);
    });

    it('PATCH /api/items/:id/archive should move item to archive', async () => {
      const res = await request(app)
        .patch(`/api/items/${userAItemId}/archive`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isArchived).toBe(true);

      // Verify it disappears from unarchived list
      const listRes = await request(app)
        .get('/api/items')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(listRes.body.data.some((i: any) => i.id === userAItemId)).toBe(false);

      // Verify it appears in archive list
      const archRes = await request(app)
        .get('/api/items?filter=archive')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(archRes.body.data.some((i: any) => i.id === userAItemId)).toBe(true);
    });

    it('PATCH /api/items/:id/restore-archive should unarchive item', async () => {
      const res = await request(app)
        .patch(`/api/items/${userAItemId}/restore-archive`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isArchived).toBe(false);
    });

    it('PATCH /api/items/:id/trash should soft-delete item to trash', async () => {
      const res = await request(app)
        .patch(`/api/items/${userAItemId}/trash`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it appears in trash filter
      const trashRes = await request(app)
        .get('/api/items?filter=trash')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(trashRes.body.data.some((i: any) => i.id === userAItemId)).toBe(true);
    });

    it('PATCH /api/items/:id/restore-trash should restore item from trash', async () => {
      const res = await request(app)
        .patch(`/api/items/${userAItemId}/restore-trash`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/items/:id should permanently delete item after confirmation', async () => {
      const res = await request(app)
        .delete(`/api/items/${userAItemId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await prisma.vaultItem.findUnique({
        where: { id: userAItemId },
      });
      expect(check).toBeNull();
    });

    it('DELETE /api/folders/:id should safely unassign items to No folder rather than deleting them', async () => {
      // Create new folder
      const fRes = await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Temporary Folder' });
      const tempFolderId = fRes.body.data.id;

      // Create item inside this folder
      const itRes = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          itemName: 'Item in Temporary Folder',
          itemType: 'LOGIN',
          encryptedPayload: 'encrypted-payload',
          folderId: tempFolderId,
        });
      const tempItemId = itRes.body.data.id;

      // Delete the folder
      const delFRes = await request(app)
        .delete(`/api/folders/${tempFolderId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(delFRes.status).toBe(200);

      // Verify the item still exists and its folderId is now null (No folder)
      const itCheck = await prisma.vaultItem.findUnique({
        where: { id: tempItemId },
      });
      expect(itCheck).not.toBeNull();
      expect(itCheck?.folderId).toBeNull();
    });
  });
});
