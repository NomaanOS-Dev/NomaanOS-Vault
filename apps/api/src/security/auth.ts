import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-in-prod-min32chars!';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

export interface TokenUserPayload {
  userId: string;
  email: string;
}

export function isGoogleOAuthConfigured(): boolean {
  return (
    Boolean(GOOGLE_CLIENT_ID) &&
    GOOGLE_CLIENT_ID !== 'your-google-oauth-client-id.apps.googleusercontent.com' &&
    Boolean(GOOGLE_CLIENT_SECRET) &&
    GOOGLE_CLIENT_SECRET !== 'your-google-oauth-client-secret'
  );
}

/**
 * Verify Google ID Token server-side
 */
export async function verifyGoogleIdToken(idToken: string) {
  if (!isGoogleOAuthConfigured()) {
    throw new Error(
      'GOOGLE_AUTH_NOT_CONFIGURED: Google OAuth Client ID and Secret are not properly configured in .env'
    );
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('INVALID_TOKEN: Empty token payload');
  }

  if (!payload.email_verified) {
    throw new Error('EMAIL_NOT_VERIFIED: Google account email is not verified');
  }

  return {
    providerUserId: payload.sub,
    email: payload.email!,
    name: payload.name || payload.email!.split('@')[0],
    picture: payload.picture,
    emailVerified: true,
  };
}

/**
 * Create or retrieve user identity from verified Google account
 */
export async function handleGoogleUser(profile: {
  providerUserId: string;
  email: string;
  name: string;
  picture?: string;
}) {
  const normalizedEmail = profile.email.toLowerCase().trim();

  // Find user by email or by identity
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      identities: true,
      vaults: true,
    },
  });

  if (!user) {
    // Create new user with default vault
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          username: profile.name,
          emailVerified: true,
          profileImage: profile.picture,
          identities: {
            create: {
              provider: 'google',
              providerUserId: profile.providerUserId,
            },
          },
          vaults: {
            create: {
              name: 'My vault',
              description: 'Primary encrypted vault',
            },
          },
        },
        include: {
          identities: true,
          vaults: true,
        },
      });

      // Audit event
      await tx.auditEvent.create({
        data: {
          userId: newUser.id,
          eventType: 'USER_REGISTERED_GOOGLE',
        },
      });

      return newUser;
    });
  } else {
    // Existing user: ensure identity is linked
    const hasGoogleIdentity = user.identities.some(
      (id) => id.provider === 'google' && id.providerUserId === profile.providerUserId
    );

    if (!hasGoogleIdentity) {
      await prisma.authenticationIdentity.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerUserId: profile.providerUserId,
        },
      });
    }

    // Ensure user has at least one vault
    if (!user.vaults || user.vaults.length === 0) {
      await prisma.vault.create({
        data: {
          userId: user.id,
          name: 'My vault',
        },
      });
    }

    // Audit event for login
    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        eventType: 'USER_LOGIN_GOOGLE',
      },
    });
  }

  return user;
}

/**
 * Generate secure session JWT
 */
export function generateSessionToken(payload: TokenUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
}

/**
 * Verify session JWT
 */
export function verifySessionToken(token: string): TokenUserPayload {
  return jwt.verify(token, JWT_SECRET) as TokenUserPayload;
}

