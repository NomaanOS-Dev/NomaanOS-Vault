import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/database/prisma';

describe('Vault Categories Suite (LOGIN, CARD, IDENTITY, SECURE_NOTE, SSH_KEY)', () => {
  let userToken: string;
  let userEmail: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    userEmail = `categories.tester.${timestamp}@nomaanos-vault.local`;
    const res = await request(app)
      .post('/api/auth/dev-login')
      .send({ email: userEmail, name: 'Category Tester' });

    expect(res.status).toBe(200);
    userToken = res.body.data.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  let loginItemId: string;
  let cardItemId: string;
  let identityItemId: string;
  let noteItemId: string;
  let sshItemId: string;

  it('1. Create LOGIN item', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        itemName: 'GitHub Account',
        itemType: 'LOGIN',
        encryptedPayload: JSON.stringify({ ciphertext: 'aes-enc-login-payload', iv: 'iv123' }),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.itemType).toBe('LOGIN');
    expect(res.body.data.itemName).toBe('GitHub Account');
    loginItemId = res.body.data.id;
  });

  it('2. Create CARD item', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        itemName: 'Corporate Visa',
        itemType: 'CARD',
        encryptedPayload: JSON.stringify({ ciphertext: 'aes-enc-card-payload', iv: 'iv456' }),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.itemType).toBe('CARD');
    expect(res.body.data.itemName).toBe('Corporate Visa');
    cardItemId = res.body.data.id;
  });

  it('3. Create IDENTITY item', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        itemName: 'Executive Passport & ID',
        itemType: 'IDENTITY',
        encryptedPayload: JSON.stringify({ ciphertext: 'aes-enc-identity-payload', iv: 'iv789' }),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.itemType).toBe('IDENTITY');
    expect(res.body.data.itemName).toBe('Executive Passport & ID');
    identityItemId = res.body.data.id;
  });

  it('4. Create SECURE_NOTE item', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        itemName: 'Emergency Server Recovery Procedures',
        itemType: 'SECURE_NOTE',
        encryptedPayload: JSON.stringify({ ciphertext: 'aes-enc-securenote-payload', iv: 'ivabc' }),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.itemType).toBe('SECURE_NOTE');
    noteItemId = res.body.data.id;
  });

  it('5. Create SSH_KEY item', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        itemName: 'Bastion Production Key',
        itemType: 'SSH_KEY',
        encryptedPayload: JSON.stringify({ ciphertext: 'aes-enc-sshkey-payload', iv: 'ivdef' }),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.itemType).toBe('SSH_KEY');
    sshItemId = res.body.data.id;
  });

  it('6. Retrieve all items and verify all 5 distinct categories exist', async () => {
    const res = await request(app)
      .get('/api/items')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const items = res.body.data;
    expect(items.length).toBe(5);

    const categories = items.map((i: any) => i.itemType);
    expect(categories).toContain('LOGIN');
    expect(categories).toContain('CARD');
    expect(categories).toContain('IDENTITY');
    expect(categories).toContain('SECURE_NOTE');
    expect(categories).toContain('SSH_KEY');
  });

  it('7. Update item name and encrypted payload for SSH_KEY', async () => {
    const res = await request(app)
      .put(`/api/items/${sshItemId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        itemName: 'Bastion Production Key (Rotated)',
        encryptedPayload: JSON.stringify({ ciphertext: 'aes-enc-sshkey-payload-v2', iv: 'ivv2' }),
        isFavorite: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.itemName).toBe('Bastion Production Key (Rotated)');
    expect(res.body.data.isFavorite).toBe(true);
  });

  it('8. Soft-delete CARD item to trash and verify status', async () => {
    const res = await request(app)
      .patch(`/api/items/${cardItemId}/trash`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deletedAt).toBeDefined();

    const trashRes = await request(app)
      .get('/api/items?filter=trash')
      .set('Authorization', `Bearer ${userToken}`);

    expect(trashRes.status).toBe(200);
    expect(trashRes.body.data.some((i: any) => i.id === cardItemId)).toBe(true);
  });
});
