import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  isGoogleOAuthConfigured,
  verifyGoogleIdToken,
  handleGoogleUser,
  generateSessionToken,
} from '../security/auth';
import { requireAuth } from '../middleware/authMiddleware';
import { prisma } from '../database/prisma';

const router = Router();

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
    },
  });
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

    const authProvider = dbUser.identities?.[0]?.provider || 'google';

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
                hint: vault.keyMetadata.hint,
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
          authProvider: updatedUser.identities?.[0]?.provider || 'google',
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

