import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import {
  isGoogleOAuthConfigured,
  verifyGoogleIdToken,
  handleGoogleUser,
  generateSessionToken,
} from '../security/auth';
import { requireAuth } from '../middleware/authMiddleware';
import { prisma } from '../database/prisma';
import { emailService } from '../services/emailService';

const router = Router();

// Rate limiters for auth endpoints
const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many registration requests from this IP. Please try again later.',
  },
});

const verifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many verification attempts. Please try again later.',
  },
});

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.string().trim().email('Valid email address is required').max(255),
});

const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, 'Verification token is required'),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().email('Valid email address is required'),
});

const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

const devLoginSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const updateProfileSchema = z.object({
  username: z.string().trim().min(1, 'Display name cannot be empty').max(100).optional(),
  onboardingDismissed: z.boolean().optional(),
});

/**
 * Public configuration status endpoint
 */
router.get('/config', (req: Request, res: Response) => {
  const configured = isGoogleOAuthConfigured();
  return res.json({
    success: true,
    data: {
      googleConfigured: configured,
      googleClientId: configured ? process.env.GOOGLE_CLIENT_ID : null,
      emailConfigured: emailService.isConfigured(),
    },
  });
});

/**
 * User Registration with Email Verification
 */
router.post('/register', registerRateLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const { name, email } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.emailVerified) {
      // Avoid revealing whether account exists while acknowledging receipt
      return res.json({
        success: true,
        message: 'If this email is eligible, a verification link has been sent.',
      });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: name,
          email: normalizedEmail,
          emailVerified: false,
        },
      });
    } else {
      // Update name if changed
      await prisma.user.update({
        where: { id: user.id },
        data: { username: name },
      });
    }

    // Invalidate existing tokens for this user
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate cryptographically secure random token (32 bytes hex)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Send transactional verification email
    await emailService.sendVerificationEmail(normalizedEmail, rawToken, name);

    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        eventType: 'REGISTRATION_INITIATED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      data: {
        email: normalizedEmail,
        // In test or non-production environment, provide rawToken for automated end-to-end testing
        ...(process.env.NODE_ENV !== 'production' ? { devVerificationToken: rawToken } : {}),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message,
    });
  }
});

/**
 * Verify Email Token
 */
router.post('/verify-email', verifyRateLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = verifyEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const { token } = parseResult.data;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const verificationRecord = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!verificationRecord) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'This verification link is invalid or has already been used.',
      });
    }

    if (verificationRecord.usedAt) {
      return res.status(400).json({
        success: false,
        error: 'TOKEN_ALREADY_USED',
        message: 'This verification link has already been used. Please log in or request a new link.',
      });
    }

    if (new Date() > verificationRecord.expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'This verification link has expired. Please request a new verification email.',
      });
    }

    // Atomic transaction: mark token used and user verified
    const user = await prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: verificationRecord.id },
        data: { usedAt: new Date() },
      });

      const updatedUser = await tx.user.update({
        where: { id: verificationRecord.userId },
        data: { emailVerified: true },
      });

      await tx.auditEvent.create({
        data: {
          userId: updatedUser.id,
          eventType: 'EMAIL_VERIFIED',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      return updatedUser;
    });

    // Log the user in with a secure session
    const sessionToken = generateSessionToken({
      userId: user.id,
      email: user.email,
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    const vault = await prisma.vault.findFirst({
      where: { userId: user.id },
      include: { keyMetadata: true },
    });

    return res.json({
      success: true,
      message: 'Email address verified successfully. You may now initialize your Master Password.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          emailVerified: true,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
          hasMasterPassword: Boolean(vault?.keyMetadata),
          onboardingDismissed: user.onboardingDismissed,
          authProvider: 'email',
        },
        token: sessionToken,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message,
    });
  }
});

/**
 * Resend Verification Email
 */
router.post('/resend-verification', registerRateLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = resendVerificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const { email } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && !user.emailVerified) {
      // Invalidate existing tokens
      await prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await emailService.sendVerificationEmail(normalizedEmail, rawToken, user.username);
    }

    return res.json({
      success: true,
      message: 'If an unverified account exists for this email, a new verification link has been sent.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message,
    });
  }
});

/**
 * Real Google ID token verification and sign-in
 */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const parseResult = googleAuthSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    if (!isGoogleOAuthConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'GOOGLE_OAUTH_NOT_CONFIGURED',
        message:
          'Google OAuth 2.0 is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.',
      });
    }

    const { idToken } = parseResult.data;
    const verifiedProfile = await verifyGoogleIdToken(idToken);
    const user = await handleGoogleUser(verifiedProfile);

    // Google accounts have pre-verified email addresses
    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
      user.emailVerified = true;
    }

    const sessionToken = generateSessionToken({
      userId: user.id,
      email: user.email,
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Check if user has master password set
    const vault = await prisma.vault.findFirst({
      where: { userId: user.id },
      include: { keyMetadata: true },
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          emailVerified: user.emailVerified,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
          hasMasterPassword: Boolean(vault?.keyMetadata),
          onboardingDismissed: user.onboardingDismissed,
          authProvider: 'google',
        },
        token: sessionToken,
      },
    });
  } catch (error: any) {
    console.error('Google Auth Error:', error.message);
    return res.status(401).json({
      success: false,
      error: 'AUTH_FAILED',
      message: error.message || 'Google authentication failed',
    });
  }
});

/**
 * Dev/Test login endpoint (only available if NODE_ENV !== 'production')
 */
router.post('/dev-login', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Dev login is disabled in production',
    });
  }

  try {
    const parseResult = devLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const { email, name } = parseResult.data;
    const user = await handleGoogleUser({
      providerUserId: `dev-google-${Buffer.from(email).toString('hex')}`,
      email,
      name,
      picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    });

    // Dev accounts are verified automatically
    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
      user.emailVerified = true;
    }

    const sessionToken = generateSessionToken({
      userId: user.id,
      email: user.email,
    });

    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    const vault = await prisma.vault.findFirst({
      where: { userId: user.id },
      include: { keyMetadata: true },
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          emailVerified: user.emailVerified,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
          hasMasterPassword: Boolean(vault?.keyMetadata),
          onboardingDismissed: user.onboardingDismissed,
          authProvider: 'google',
        },
        token: sessionToken,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message,
    });
  }
});

/**
 * Current user profile & vault encryption metadata
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const [dbUser, vault] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        include: { identities: true },
      }),
      prisma.vault.findFirst({
        where: { userId: user.id },
        include: { keyMetadata: true },
      }),
    ]);

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const authProvider = dbUser.identities?.[0]?.provider || 'email';

    return res.json({
      success: true,
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          username: dbUser.username,
          emailVerified: dbUser.emailVerified,
          profileImage: dbUser.profileImage,
          createdAt: dbUser.createdAt,
          hasMasterPassword: Boolean(vault?.keyMetadata),
          onboardingDismissed: dbUser.onboardingDismissed,
          authProvider,
          vaultId: vault?.id,
          keyMetadata: vault?.keyMetadata
            ? {
                vaultId: vault.keyMetadata.vaultId,
                encryptedVaultKey: vault.keyMetadata.encryptedVaultKey,
                masterPasswordSalt: vault.keyMetadata.masterPasswordSalt,
                kdfAlgorithm: vault.keyMetadata.kdfAlgorithm,
                kdfParameters: JSON.parse(vault.keyMetadata.kdfParameters),
                recoveryWrappedVaultKey: vault.keyMetadata.recoveryWrappedVaultKey,
              }
            : null,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message,
    });
  }
});

/**
 * Update user profile information (Display name, onboarding preferences)
 */
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const userId = req.user!.id;
    const { username, onboardingDismissed } = parseResult.data;

    const dataToUpdate: any = {};
    if (username !== undefined) dataToUpdate.username = username;
    if (onboardingDismissed !== undefined) dataToUpdate.onboardingDismissed = onboardingDismissed;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      include: { identities: true },
    });

    await prisma.auditEvent.create({
      data: {
        userId,
        eventType: onboardingDismissed !== undefined ? 'ONBOARDING_STATUS_CHANGED' : 'PROFILE_UPDATED',
      },
    });

    const vault = await prisma.vault.findFirst({
      where: { userId },
      include: { keyMetadata: true },
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          emailVerified: updatedUser.emailVerified,
          profileImage: updatedUser.profileImage,
          createdAt: updatedUser.createdAt,
          hasMasterPassword: Boolean(vault?.keyMetadata),
          onboardingDismissed: updatedUser.onboardingDismissed,
          authProvider: updatedUser.identities?.[0]?.provider || 'email',
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'UPDATE_FAILED',
      message: error.message,
    });
  }
});

/**
 * Logout
 */
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.auditEvent.create({
      data: {
        userId: req.user!.id,
        eventType: 'USER_LOGOUT',
      },
    });

    res.clearCookie('session_token', { path: '/' });
    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'LOGOUT_FAILED',
      message: error.message,
    });
  }
});

export default router;
