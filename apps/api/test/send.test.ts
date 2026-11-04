import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/database/prisma';

describe('Password Manager Day 2 Secure Send & Integration Tests', () => {
  let userAToken: string;
  let userBToken: string;

  let textSendId: string;
  let textPublicToken: string;

  let pwdSendId: string;
  let pwdPublicToken: string;

  let restrictedSendId: string;
  let restrictedPublicToken: string;

  let limitedSendId: string;
  let limitedPublicToken: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    // User A
    const resA = await request(app)
      .post('/api/auth/dev-login')
      .send({ email: `send.alice.${timestamp}@securevault.io`, name: 'Alice Send' });
    userAToken = resA.body.data.token;

    // User B
    const resB = await request(app)
      .post('/api/auth/dev-login')
      .send({ email: `send.bob.${timestamp}@securevault.io`, name: 'Bob Send' });
    userBToken = resB.body.data.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Text Send Lifecycle & Zero-Knowledge Verification', () => {
    it('POST /api/send/text creates a text send with encrypted payload and public token', async () => {
      const res = await request(app)
        .post('/api/send/text')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Secret Server API Key',
          encryptedPayload: JSON.stringify({
            ciphertext: 'aes-gcm-ciphertext-XYZ789',
            iv: '12-byte-nonce-base64',
          }),
          hideTextByDefault: true,
          expiration: '7d',
          recipientPolicy: 'ANYONE',
          hideSenderEmail: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Secret Server API Key');
      expect(typeof res.body.data.publicToken).toBe('string');

      textSendId = res.body.data.id;
      textPublicToken = res.body.data.publicToken;
    });

    it('GET /api/send lists the created send for User A', async () => {
      const res = await request(app)
        .get('/api/send')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.some((s: any) => s.id === textSendId)).toBe(true);
    });

    it('GET /api/send/public/:token allows unauthenticated recipient to view public send', async () => {
      const res = await request(app).get(`/api/send/public/${textPublicToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Secret Server API Key');
      expect(res.body.data.hideTextByDefault).toBe(true);
      expect(res.body.data.requiresPassword).toBe(false);
      expect(res.body.data.encryptedPayload).toBeDefined();

      // Check that access count was incremented
      const dbSend = await prisma.secureSend.findUnique({ where: { id: textSendId } });
      expect(dbSend?.currentAccessCount).toBe(1);
    });
  });

  describe('2. Password-Protected Send Access Control', () => {
    it('POST /api/send/text creates a password-protected send', async () => {
      const res = await request(app)
        .post('/api/send/text')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Confidential Finance Note',
          encryptedPayload: 'encrypted-finance-note',
          expiration: '1d',
          recipientPolicy: 'PASSWORD',
          password: 'SecretPass123!',
        });

      expect(res.status).toBe(201);
      pwdSendId = res.body.data.id;
      pwdPublicToken = res.body.data.publicToken;
    });

    it('GET /api/send/public/:token requires password and withholds payload', async () => {
      const res = await request(app).get(`/api/send/public/${pwdPublicToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.requiresPassword).toBe(true);
      expect(res.body.data.encryptedPayload).toBeUndefined();
    });

    it('POST /api/send/public/:token/verify-password rejects incorrect password', async () => {
      const res = await request(app)
        .post(`/api/send/public/${pwdPublicToken}/verify-password`)
        .send({ password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_PASSWORD');
    });

    it('POST /api/send/public/:token/verify-password accepts correct password and releases ciphertext', async () => {
      const res = await request(app)
        .post(`/api/send/public/${pwdPublicToken}/verify-password`)
        .send({ password: 'SecretPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.encryptedPayload).toBe('encrypted-finance-note');
    });
  });

  describe('3. Specific Recipient Restrictions & Access Limit Enforcement', () => {
    it('POST /api/send/text creates a send restricted to specific emails', async () => {
      const res = await request(app)
        .post('/api/send/text')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Board Meeting Minutes',
          encryptedPayload: 'encrypted-board-minutes',
          expiration: '7d',
          recipientPolicy: 'SPECIFIC',
          specificEmails: ['vip.partner@domain.com'],
        });

      expect(res.status).toBe(201);
      restrictedSendId = res.body.data.id;
      restrictedPublicToken = res.body.data.publicToken;
    });

    it('POST /api/send/public/:token/verify-email rejects unauthorized emails', async () => {
      const res = await request(app)
        .post(`/api/send/public/${restrictedPublicToken}/verify-email`)
        .send({ email: 'intruder@badactor.com' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('UNAUTHORIZED_EMAIL');
    });

    it('POST /api/send/public/:token/verify-email allows authorized email and releases content', async () => {
      const res = await request(app)
        .post(`/api/send/public/${restrictedPublicToken}/verify-email`)
        .send({ email: 'vip.partner@domain.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.encryptedPayload).toBe('encrypted-board-minutes');
    });

    it('Access Limit: Enforces maxAccessCount server-side and returns 410 when reached', async () => {
      const res = await request(app)
        .post('/api/send/text')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'One-Time Secret Token',
          encryptedPayload: 'self-destructing-secret',
          expiration: '1d',
          maxAccessCount: 1, // Only 1 view permitted!
          recipientPolicy: 'ANYONE',
        });

      expect(res.status).toBe(201);
      limitedSendId = res.body.data.id;
      limitedPublicToken = res.body.data.publicToken;

      // First view -> SUCCESS
      const view1 = await request(app).get(`/api/send/public/${limitedPublicToken}`);
      expect(view1.status).toBe(200);

      // Second view -> ACCESS_LIMIT_REACHED (410)
      const view2 = await request(app).get(`/api/send/public/${limitedPublicToken}`);
      expect(view2.status).toBe(410);
      expect(view2.body.error).toBe('ACCESS_LIMIT_REACHED');
    });
  });

  describe('4. Revoke, Delete, and User Isolation', () => {
    it('SECURITY: User B cannot revoke User A send', async () => {
      const res = await request(app)
        .patch(`/api/send/${textSendId}/revoke`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('SEND_NOT_FOUND');
    });

    it('PATCH /api/send/:id/revoke makes the send immediately inaccessible on public endpoint', async () => {
      const res = await request(app)
        .patch(`/api/send/${textSendId}/revoke`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Now public recipient endpoint must return 410 SEND_REVOKED
      const publicCheck = await request(app).get(`/api/send/public/${textPublicToken}`);
      expect(publicCheck.status).toBe(410);
      expect(publicCheck.body.error).toBe('SEND_REVOKED');
    });

    it('DELETE /api/send/:id permanently deletes send and logs audit event', async () => {
      const res = await request(app)
        .delete(`/api/send/${textSendId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);

      const check = await prisma.secureSend.findUnique({ where: { id: textSendId } });
      expect(check).toBeNull();
    });
  });
});

