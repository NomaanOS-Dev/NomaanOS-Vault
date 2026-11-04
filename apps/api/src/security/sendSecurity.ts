import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate cryptographically secure URL-safe public token
 */
export function generatePublicToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

/**
 * Hash public token with SHA-256 for database lookup
 */
export function hashPublicToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Hash Send password using bcrypt with salt rounds = 10
 */
export async function hashSendPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Compare password against bcrypt hash
 */
export async function verifySendPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Parse expiration string into future Date
 */
export function calculateExpirationDate(expiration: string): Date {
  const now = new Date();
  switch (expiration) {
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case '1d':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case '14d':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    case '31d':
    default:
      return new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
  }
}

