import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/database/prisma';

describe('Send Access Count & Concurrency Tests', () => {
  let userToken: string;
  let userEmail: string;

  beforeAll(async () => {
    userEmail = `sendlimits.${Date.now()}@securevault.io`;
    const res = await request(app)
      .post('/api/auth/dev-login')
      .send({ email: userEmail, name: 'Send Limits User' });

    expect(res.status).toBe(200);
    userToken = res.body.data.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Maximum access = 1: Exactly 1 access succeeds, second access is rejected with 410', async () => {
    const createRes = await request(app)
      .post('/api/send/text')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Single-Use Secret',
        encryptedPayload: 'secret-payload-1',
        expiration: '1d',
        maxAccessCount: 1,
        recipientPolicy: 'ANYONE',
      });

    expect(createRes.status).toBe(201);
    const token = createRes.body.data.publicToken;

    // Access 1 -> must succeed (200)
    const access1 = await request(app).get(`/api/send/public/${token}`);
    expect(access1.status).toBe(200);
    expect(access1.body.data.encryptedPayload).toBe('secret-payload-1');

    // Access 2 -> must fail with 410 ACCESS_LIMIT_REACHED
    const access2 = await request(app).get(`/api/send/public/${token}`);
    expect(access2.status).toBe(410);
    expect(access2.body.error).toBe('ACCESS_LIMIT_REACHED');

    // Verify DB counter is exactly 1
    const record = await prisma.secureSend.findUnique({
      where: { id: createRes.body.data.id },
    });
    expect(record?.currentAccessCount).toBe(1);
  });

  it('2. Maximum access = 2: Exactly 2 accesses succeed, 3rd fails with 410', async () => {
    const createRes = await request(app)
      .post('/api/send/text')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Dual-Use Secret',
        encryptedPayload: 'secret-payload-2',
        expiration: '1d',
        maxAccessCount: 2,
        recipientPolicy: 'ANYONE',
      });

    expect(createRes.status).toBe(201);
    const token = createRes.body.data.publicToken;

    const access1 = await request(app).get(`/api/send/public/${token}`);
    expect(access1.status).toBe(200);

    const access2 = await request(app).get(`/api/send/public/${token}`);
    expect(access2.status).toBe(200);

    const access3 = await request(app).get(`/api/send/public/${token}`);
    expect(access3.status).toBe(410);
    expect(access3.body.error).toBe('ACCESS_LIMIT_REACHED');

    const record = await prisma.secureSend.findUnique({
      where: { id: createRes.body.data.id },
    });
    expect(record?.currentAccessCount).toBe(2);
  });

  it('3. Maximum access = 4: Exactly 4 accesses succeed, 5th fails with 410', async () => {
    const createRes = await request(app)
      .post('/api/send/text')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Quad-Use Secret',
        encryptedPayload: 'secret-payload-4',
        expiration: '1d',
        maxAccessCount: 4,
        recipientPolicy: 'ANYONE',
      });

    expect(createRes.status).toBe(201);
    const token = createRes.body.data.publicToken;

    for (let i = 1; i <= 4; i++) {
      const res = await request(app).get(`/api/send/public/${token}`);
      expect(res.status).toBe(200);
    }

    const access5 = await request(app).get(`/api/send/public/${token}`);
    expect(access5.status).toBe(410);
    expect(access5.body.error).toBe('ACCESS_LIMIT_REACHED');

    const record = await prisma.secureSend.findUnique({
      where: { id: createRes.body.data.id },
    });
    expect(record?.currentAccessCount).toBe(4);
  });

  it('4. Maximum access = 10: Exactly 10 accesses succeed, 11th fails with 410', async () => {
    const createRes = await request(app)
      .post('/api/send/text')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Deca-Use Secret',
        encryptedPayload: 'secret-payload-10',
        expiration: '1d',
        maxAccessCount: 10,
        recipientPolicy: 'ANYONE',
      });

    expect(createRes.status).toBe(201);
    const token = createRes.body.data.publicToken;

    for (let i = 1; i <= 10; i++) {
      const res = await request(app).get(`/api/send/public/${token}`);
      expect(res.status).toBe(200);
    }

    const access11 = await request(app).get(`/api/send/public/${token}`);
    expect(access11.status).toBe(410);
    expect(access11.body.error).toBe('ACCESS_LIMIT_REACHED');

    const record = await prisma.secureSend.findUnique({
      where: { id: createRes.body.data.id },
    });
    expect(record?.currentAccessCount).toBe(10);
  });

  it('5. No maximum access configured: Multiple accesses succeed up to expiration', async () => {
    const createRes = await request(app)
      .post('/api/send/text')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Unlimited Secret',
        encryptedPayload: 'unlimited-payload',
        expiration: '1d',
        recipientPolicy: 'ANYONE',
      });

    expect(createRes.status).toBe(201);
    const token = createRes.body.data.publicToken;

    for (let i = 1; i <= 6; i++) {
      const res = await request(app).get(`/api/send/public/${token}`);
      expect(res.status).toBe(200);
    }
  });

  it('6. Password protection: Failed attempts DO NOT increment access count', async () => {
    const createRes = await request(app)
      .post('/api/send/text')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Protected Single-Use',
        encryptedPayload: 'protected-secret',
        expiration: '1d',
        maxAccessCount: 1,
        recipientPolicy: 'PASSWORD',
        password: 'CorrectPassword123!',
      });

    expect(createRes.status).toBe(201);
    const token = createRes.body.data.publicToken;

    // Inspection request withholds payload and does not increment
    const meta = await request(app).get(`/api/send/public/${token}`);
    expect(meta.status).toBe(200);
    expect(meta.body.data.requiresPassword).toBe(true);
    expect(meta.body.data.encryptedPayload).toBeUndefined();

    // 3 failed password attempts
    for (let i = 0; i < 3; i++) {
      const fail = await request(app)
        .post(`/api/send/public/${token}/verify-password`)
        .send({ password: 'WrongPassword' });
      expect(fail.status).toBe(401);
    }

    // Check DB count: still 0
    let record = await prisma.secureSend.findUnique({
      where: { id: createRes.body.data.id },
    });
    expect(record?.currentAccessCount).toBe(0);

    // Correct password attempt: succeeds and increments to 1
    const pass = await request(app)
      .post(`/api/send/public/${token}/verify-password`)
      .send({ password: 'CorrectPassword123!' });
    expect(pass.status).toBe(200);
    expect(pass.body.data.encryptedPayload).toBe('protected-secret');

    // Next attempt: limit is 1, so now returns 410
    const next = await request(app)
      .post(`/api/send/public/${token}/verify-password`)
      .send({ password: 'CorrectPassword123!' });
    expect(next.status).toBe(410);
  });

  it('7. Concurrency: Multiple simultaneous requests at max limit (max=1) NEVER exceed limit', async () => {
    const createRes = await request(app)
      .post('/api/send/text')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Race Condition Test',
        encryptedPayload: 'race-secret',
        expiration: '1d',
        maxAccessCount: 1,
        recipientPolicy: 'ANYONE',
      });

    expect(createRes.status).toBe(201);
    const token = createRes.body.data.publicToken;

    // Fire 6 simultaneous requests concurrently
    const responses = await Promise.all([
      request(app).get(`/api/send/public/${token}`),
      request(app).get(`/api/send/public/${token}`),
      request(app).get(`/api/send/public/${token}`),
      request(app).get(`/api/send/public/${token}`),
      request(app).get(`/api/send/public/${token}`),
      request(app).get(`/api/send/public/${token}`),
    ]);

    const successes = responses.filter((r) => r.status === 200);
    const limitReached = responses.filter((r) => r.status === 410);

    expect(successes.length).toBe(1);
    expect(limitReached.length).toBe(5);

    // DB counter must strictly be 1
    const record = await prisma.secureSend.findUnique({
      where: { id: createRes.body.data.id },
    });
    expect(record?.currentAccessCount).toBe(1);
  });
});

