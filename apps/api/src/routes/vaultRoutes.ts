import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { prisma } from '../database/prisma';
import { emailService } from '../services/emailService';

const router = Router();

const setupMasterPasswordSchema = z.object({
  encryptedVaultKey: z.string().min(1, 'Encrypted vault key is required'),
  masterPasswordSalt: z.string().min(1, 'Master password salt is required'),
  kdfAlgorithm: z.string().default('Argon2id'),
  kdfParameters: z.object({
    memory: z.number().int().positive(),
    iterations: z.number().int().positive(),
    parallelism: z.number().int().positive(),
    hashLength: z.number().int().positive().default(32),
  }),
  recoveryWrappedVaultKey: z.string().min(1, 'Recovery wrapped vault key is required'),
  recoveryMetadata: z.string().optional(),
  hint: z.string().max(255).optional(),
});

const recoverVaultSchema = z.object({
  newEncryptedVaultKey: z.string().min(1),
  newMasterPasswordSalt: z.string().min(1),
  newKdfParameters: z.object({
    memory: z.number().int().positive(),
    iterations: z.number().int().positive(),
    parallelism: z.number().int().positive(),
    hashLength: z.number().int().positive().default(32),
  }),
  newRecoveryWrappedVaultKey: z.string().min(1),
});

const rotateRecoveryKeySchema = z.object({
  recoveryWrappedVaultKey: z.string().min(1, 'Recovery wrapped vault key is required'),
  recoveryMetadata: z.string().optional(),
});

/**
 * Setup Master Password for current user (Requires verified email)
 */
router.post('/setup-master-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = setupMasterPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const userId = req.user!.id;

    // Strict security check: user MUST be email verified
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: 'EMAIL_NOT_VERIFIED',
        message: 'You must verify your email address before setting up your Master Password.',
      });
    }

    let vault = await prisma.vault.findFirst({
      where: { userId },
      include: { keyMetadata: true },
    });

    if (!vault) {
      vault = await prisma.vault.create({
        data: {
          userId,
          name: 'My vault',
        },
        include: { keyMetadata: true },
      });
    }

    if (vault.keyMetadata) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_CONFIGURED',
        message: 'Master password has already been configured for this vault. Master Password cannot be changed.',
      });
    }

    const {
      encryptedVaultKey,
      masterPasswordSalt,
      kdfAlgorithm,
      kdfParameters,
      recoveryWrappedVaultKey,
      recoveryMetadata,
      hint,
    } = parseResult.data;

    const createdMetadata = await prisma.$transaction(async (tx) => {
      // Create metadata WITHOUT storing plaintext hint in the database
      const metadata = await tx.vaultKeyMetadata.create({
        data: {
          vaultId: vault.id,
          encryptedVaultKey,
          masterPasswordSalt,
          kdfAlgorithm,
          kdfParameters: JSON.stringify(kdfParameters),
          recoveryWrappedVaultKey,
          recoveryMetadata,
        },
      });

      await tx.auditEvent.create({
        data: {
          userId,
          eventType: 'MASTER_PASSWORD_SETUP',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      return metadata;
    });

    // If an optional hint was provided, send it exclusively via private email
    if (hint && hint.trim().length > 0) {
      await emailService.sendMasterPasswordHintEmail(user.email, hint.trim(), user.username);
    }

    return res.json({
      success: true,
      message: 'Master password and vault keys configured successfully.',
      data: {
        vaultId: vault.id,
        keyMetadata: {
          id: createdMetadata.id,
          vaultId: createdMetadata.vaultId,
          masterPasswordSalt: createdMetadata.masterPasswordSalt,
          kdfAlgorithm: createdMetadata.kdfAlgorithm,
          kdfParameters,
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
 * Retrieve Vault Key Metadata for unlocking
 */
router.get('/keys', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const vault = await prisma.vault.findFirst({
      where: { userId },
      include: { keyMetadata: true },
    });

    if (!vault || !vault.keyMetadata) {
      return res.status(404).json({
        success: false,
        error: 'KEYS_NOT_FOUND',
        message: 'Master password has not yet been set up.',
      });
    }

    return res.json({
      success: true,
      data: {
        vaultId: vault.id,
        encryptedVaultKey: vault.keyMetadata.encryptedVaultKey,
        masterPasswordSalt: vault.keyMetadata.masterPasswordSalt,
        kdfAlgorithm: vault.keyMetadata.kdfAlgorithm,
        kdfParameters: JSON.parse(vault.keyMetadata.kdfParameters),
        recoveryWrappedVaultKey: vault.keyMetadata.recoveryWrappedVaultKey,
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
 * Recover Vault with Recovery Key
 */
router.post('/recover', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = recoverVaultSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const userId = req.user!.id;
    const vault = await prisma.vault.findFirst({
      where: { userId },
      include: { keyMetadata: true },
    });

    if (!vault || !vault.keyMetadata) {
      return res.status(404).json({
        success: false,
        error: 'VAULT_NOT_FOUND',
        message: 'Vault metadata not found.',
      });
    }

    const {
      newEncryptedVaultKey,
      newMasterPasswordSalt,
      newKdfParameters,
      newRecoveryWrappedVaultKey,
    } = parseResult.data;

    await prisma.$transaction(async (tx) => {
      await tx.vaultKeyMetadata.update({
        where: { vaultId: vault.id },
        data: {
          encryptedVaultKey: newEncryptedVaultKey,
          masterPasswordSalt: newMasterPasswordSalt,
          kdfParameters: JSON.stringify(newKdfParameters),
          recoveryWrappedVaultKey: newRecoveryWrappedVaultKey,
        },
      });

      await tx.auditEvent.create({
        data: {
          userId,
          eventType: 'VAULT_RECOVERED',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    });

    return res.json({
      success: true,
      message: 'Vault recovered and re-encrypted successfully.',
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
 * Master Password change endpoint is PERMANENTLY REMOVED and disallowed.
 */
router.all('/change-master-password', requireAuth, (req: Request, res: Response) => {
  return res.status(405).json({
    success: false,
    error: 'METHOD_NOT_ALLOWED',
    message: 'Master Password cannot be changed once established. Master Password modification is permanently disabled.',
  });
});

/**
 * Rotate Emergency Recovery Key (Re-wraps vault key under fresh recovery key)
 */
router.post('/rotate-recovery-key', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = rotateRecoveryKeySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const userId = req.user!.id;
    const vault = await prisma.vault.findFirst({
      where: { userId },
      include: { keyMetadata: true },
    });

    if (!vault || !vault.keyMetadata) {
      return res.status(404).json({
        success: false,
        error: 'VAULT_NOT_FOUND',
        message: 'Vault metadata not found.',
      });
    }

    const { recoveryWrappedVaultKey, recoveryMetadata } = parseResult.data;

    await prisma.$transaction(async (tx) => {
      await tx.vaultKeyMetadata.update({
        where: { vaultId: vault.id },
        data: {
          recoveryWrappedVaultKey,
          recoveryMetadata: recoveryMetadata || null,
        },
      });

      await tx.auditEvent.create({
        data: {
          userId,
          eventType: 'RECOVERY_KEY_ROTATED',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    });

    return res.json({
      success: true,
      message: 'Emergency recovery key rotated successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message,
    });
  }
});

export default router;
