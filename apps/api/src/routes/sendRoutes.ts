import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/authMiddleware';
import { prisma } from '../database/prisma';
import {
  generatePublicToken,
  hashPublicToken,
  hashSendPassword,
  verifySendPassword,
  calculateExpirationDate,
} from '../security/sendSecurity';

const router = Router();

// Ensure secure storage directory for encrypted files
const UPLOADS_DIR = path.resolve(__dirname, '../../storage/send_files');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage for encrypted files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.enc`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max encrypted file size
});

// Validation Schemas
const createTextSendSchema = z.object({
  name: z.string().min(1, 'Send name is required').max(100),
  encryptedPayload: z.string().min(1, 'Encrypted payload is required'),
  hideTextByDefault: z.boolean().default(false),
  expiration: z.enum(['1h', '1d', '7d', '14d', '31d']).default('7d'),
  maxAccessCount: z.number().int().positive().nullable().optional(),
  recipientPolicy: z.enum(['ANYONE', 'SPECIFIC', 'PASSWORD']).default('ANYONE'),
  password: z.string().min(1).optional(),
  specificEmails: z.array(z.string().email()).optional(),
  hideSenderEmail: z.boolean().default(false),
});

/**
 * ============================================================================
 * AUTHENTICATED SEND MANAGEMENT ROUTES
 * ============================================================================
 */

/**
 * List all Sends for current authenticated user
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type, search } = req.query;

    const where: any = { userId };
    if (type === 'TEXT' || type === 'FILE') {
      where.sendType = type;
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      where.name = { contains: search.trim() };
    }

    const sends = await prisma.secureSend.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        file: {
          select: { originalFileName: true, encryptedSize: true, mimeType: true },
        },
        recipients: {
          select: { normalizedEmail: true },
        },
      },
    });

    const formatted = sends.map((s) => ({
      id: s.id,
      userId: s.userId,
      publicTokenHash: s.publicTokenHash,
      sendType: s.sendType,
      name: s.name,
      expiresAt: s.expiresAt.toISOString(),
      maxAccessCount: s.maxAccessCount,
      currentAccessCount: s.currentAccessCount,
      recipientPolicy: s.recipientPolicy,
      hideSenderEmail: s.hideSenderEmail,
      hideTextByDefault: s.hideTextByDefault,
      revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      fileInfo: s.file,
      recipients: s.recipients.map((r) => r.normalizedEmail),
    }));

    return res.json({
      success: true,
      data: formatted,
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
 * Create Text Send
 */
router.post('/text', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = createTextSendSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const userId = req.user!.id;
    const {
      name,
      encryptedPayload,
      hideTextByDefault,
      expiration,
      maxAccessCount,
      recipientPolicy,
      password,
      specificEmails,
      hideSenderEmail,
    } = parseResult.data;

    // Password validation if policy requires it
    let passwordHash: string | null = null;
    if (recipientPolicy === 'PASSWORD') {
      if (!password || password.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'PASSWORD_REQUIRED',
          message: 'Password protection requires a non-empty password',
        });
      }
      passwordHash = await hashSendPassword(password);
    }

    const expiresAt = calculateExpirationDate(expiration);
    const publicToken = generatePublicToken();
    const tokenHash = hashPublicToken(publicToken);

    const sendRecord = await prisma.$transaction(async (tx) => {
      const record = await tx.secureSend.create({
        data: {
          userId,
          publicTokenHash: tokenHash,
          sendType: 'TEXT',
          name,
          encryptedPayload,
          hideTextByDefault,
          expiresAt,
          maxAccessCount: maxAccessCount || null,
          passwordHash,
          recipientPolicy,
          hideSenderEmail,
          recipients:
            recipientPolicy === 'SPECIFIC' && specificEmails && specificEmails.length > 0
              ? {
                  create: specificEmails.map((email) => ({
                    normalizedEmail: email.toLowerCase().trim(),
                  })),
                }
              : undefined,
        },
        include: {
          recipients: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          userId,
          eventType: 'SEND_CREATED_TEXT',
        },
      });

      return record;
    });

    return res.status(201).json({
      success: true,
      data: {
        id: sendRecord.id,
        publicToken,
        name: sendRecord.name,
        expiresAt: sendRecord.expiresAt.toISOString(),
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
 * Create File Send (with Multer file upload)
 */
router.post(
  '/file',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'FILE_REQUIRED',
          message: 'Encrypted file is required for file send',
        });
      }

      const userId = req.user!.id;
      const {
        name,
        expiration = '7d',
        maxAccessCount,
        recipientPolicy = 'ANYONE',
        password,
        specificEmails,
        hideSenderEmail = 'false',
        originalFileName,
      } = req.body;

      if (!name || name.trim() === '') {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          error: 'NAME_REQUIRED',
          message: 'Send name is required',
        });
      }

      let passwordHash: string | null = null;
      if (recipientPolicy === 'PASSWORD') {
        if (!password || password.trim().length === 0) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({
            success: false,
            error: 'PASSWORD_REQUIRED',
            message: 'Password protection requires a non-empty password',
          });
        }
        passwordHash = await hashSendPassword(password);
      }

      const expiresAt = calculateExpirationDate(expiration);
      const publicToken = generatePublicToken();
      const tokenHash = hashPublicToken(publicToken);

      let parsedEmails: string[] = [];
      if (recipientPolicy === 'SPECIFIC' && specificEmails) {
        try {
          parsedEmails = Array.isArray(specificEmails)
            ? specificEmails
            : JSON.parse(specificEmails);
        } catch {
          parsedEmails = String(specificEmails).split(',').map((e) => e.trim());
        }
      }

      const sendRecord = await prisma.$transaction(async (tx) => {
        const record = await tx.secureSend.create({
          data: {
            userId,
            publicTokenHash: tokenHash,
            sendType: 'FILE',
            name: name.trim(),
            expiresAt,
            maxAccessCount: maxAccessCount ? parseInt(maxAccessCount, 10) : null,
            passwordHash,
            recipientPolicy,
            hideSenderEmail: hideSenderEmail === 'true' || hideSenderEmail === true,
            recipients:
              recipientPolicy === 'SPECIFIC' && parsedEmails.length > 0
                ? {
                    create: parsedEmails.map((email) => ({
                      normalizedEmail: email.toLowerCase().trim(),
                    })),
                  }
                : undefined,
            file: {
              create: {
                originalFileName: originalFileName || req.file!.originalname,
                encryptedSize: req.file!.size,
                mimeType: req.file!.mimetype,
                storagePath: path.basename(req.file!.path),
              },
            },
          },
          include: {
            file: true,
          },
        });

        await tx.auditEvent.create({
          data: {
            userId,
            eventType: 'SEND_CREATED_FILE',
          },
        });

        return record;
      });

      return res.status(201).json({
        success: true,
        data: {
          id: sendRecord.id,
          publicToken,
          name: sendRecord.name,
          expiresAt: sendRecord.expiresAt.toISOString(),
          fileInfo: sendRecord.file,
        },
      });
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: error.message,
      });
    }
  }
);

/**
 * Revoke Send immediately
 */
router.patch('/:id/revoke', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.secureSend.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'SEND_NOT_FOUND',
        message: 'Send not found or unauthorized',
      });
    }

    const updated = await prisma.secureSend.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    await prisma.auditEvent.create({
      data: {
        userId,
        eventType: 'SEND_REVOKED',
      },
    });

    return res.json({
      success: true,
      message: 'Send revoked immediately. It is no longer accessible.',
      data: { id: updated.id, revokedAt: updated.revokedAt?.toISOString() },
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
 * Permanently Delete Send
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.secureSend.findFirst({
      where: { id, userId },
      include: { file: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'SEND_NOT_FOUND',
        message: 'Send not found or unauthorized',
      });
    }

    // Delete stored file from disk if present
    if (existing.file?.storagePath) {
      const fullPath = path.join(UPLOADS_DIR, existing.file.storagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await prisma.$transaction([
      prisma.secureSend.delete({ where: { id } }),
      prisma.auditEvent.create({
        data: {
          userId,
          eventType: 'SEND_DELETED',
        },
      }),
    ]);

    return res.json({
      success: true,
      message: 'Send and encrypted artifacts permanently deleted.',
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
 * ============================================================================
 * PUBLIC RECIPIENT ROUTES (No Vault Account Required)
 * ============================================================================
 */

/**
 * Public Send Inspection & Content Retrieval
 */
router.get('/public/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const tokenHash = hashPublicToken(token);

    const send = await prisma.secureSend.findUnique({
      where: { publicTokenHash: tokenHash },
      include: {
        file: {
          select: { originalFileName: true, encryptedSize: true, mimeType: true },
        },
        user: {
          select: { email: true, username: true },
        },
      },
    });

    if (!send) {
      return res.status(404).json({
        success: false,
        error: 'SEND_NOT_FOUND',
        message: 'This Send does not exist or the link is invalid.',
      });
    }

    // Check Revocation
    if (send.revokedAt) {
      return res.status(410).json({
        success: false,
        error: 'SEND_REVOKED',
        message: 'This Send has been revoked by the sender.',
      });
    }

    // Check Expiration
    if (new Date() > send.expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'SEND_EXPIRED',
        message: 'This Send has expired and is no longer accessible.',
      });
    }

    // Check Access Count Limit
    if (send.maxAccessCount !== null && send.currentAccessCount >= send.maxAccessCount) {
      return res.status(410).json({
        success: false,
        error: 'ACCESS_LIMIT_REACHED',
        message: 'The maximum access count for this Send has been reached.',
      });
    }

    const requiresPassword = Boolean(send.passwordHash);
    const requiresEmailVerification = send.recipientPolicy === 'SPECIFIC';

    // If challenges exist, return metadata without exposing content and without incrementing access count
    if (requiresPassword || requiresEmailVerification) {
      return res.json({
        success: true,
        data: {
          name: send.name,
          sendType: send.sendType,
          hideTextByDefault: send.hideTextByDefault,
          expiresAt: send.expiresAt.toISOString(),
          hideSenderEmail: send.hideSenderEmail,
          senderEmail: send.hideSenderEmail ? undefined : send.user.email,
          requiresPassword,
          requiresEmailVerification,
          fileInfo: send.file,
        },
      });
    }

    // Atomic access increment and conditional limit check
    const updateResult = await prisma.$transaction(async (tx) => {
      const updated = await tx.secureSend.updateMany({
        where: {
          id: send.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          ...(send.maxAccessCount !== null ? { currentAccessCount: { lt: send.maxAccessCount } } : {}),
        },
        data: {
          currentAccessCount: { increment: 1 },
        },
      });

      if (updated.count === 1) {
        await tx.sendAccess.create({
          data: {
            sendId: send.id,
            status: 'SUCCESS',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });
      }

      return updated.count;
    });

    if (updateResult === 0) {
      return res.status(410).json({
        success: false,
        error: 'ACCESS_LIMIT_REACHED',
        message: 'The maximum access count for this Send has been reached or it has expired.',
      });
    }

    return res.json({
      success: true,
      data: {
        name: send.name,
        sendType: send.sendType,
        hideTextByDefault: send.hideTextByDefault,
        expiresAt: send.expiresAt.toISOString(),
        hideSenderEmail: send.hideSenderEmail,
        senderEmail: send.hideSenderEmail ? undefined : send.user.email,
        requiresPassword: false,
        requiresEmailVerification: false,
        encryptedPayload: send.encryptedPayload,
        fileInfo: send.file,
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
 * Verify Send Password
 */
router.post('/public/:token/verify-password', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const tokenHash = hashPublicToken(token);

    const send = await prisma.secureSend.findUnique({
      where: { publicTokenHash: tokenHash },
      include: {
        file: {
          select: { originalFileName: true, encryptedSize: true, mimeType: true },
        },
        user: { select: { email: true } },
      },
    });

    if (!send || send.revokedAt || new Date() > send.expiresAt) {
      return res.status(404).json({
        success: false,
        error: 'SEND_UNAVAILABLE',
        message: 'This Send is unavailable or expired.',
      });
    }

    if (send.maxAccessCount !== null && send.currentAccessCount >= send.maxAccessCount) {
      return res.status(410).json({
        success: false,
        error: 'ACCESS_LIMIT_REACHED',
        message: 'The maximum access count for this Send has been reached.',
      });
    }

    if (!send.passwordHash) {
      return res.status(400).json({
        success: false,
        error: 'NOT_PASSWORD_PROTECTED',
        message: 'This Send does not require a password.',
      });
    }

    const isValid = await verifySendPassword(password || '', send.passwordHash);
    if (!isValid) {
      await prisma.sendAccess.create({
        data: {
          sendId: send.id,
          status: 'FAILED_PASSWORD',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      return res.status(401).json({
        success: false,
        error: 'INVALID_PASSWORD',
        message: 'Incorrect password. Access denied.',
      });
    }

    // Password verified! Increment access count atomically
    const updateResult = await prisma.$transaction(async (tx) => {
      const updated = await tx.secureSend.updateMany({
        where: {
          id: send.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          ...(send.maxAccessCount !== null ? { currentAccessCount: { lt: send.maxAccessCount } } : {}),
        },
        data: {
          currentAccessCount: { increment: 1 },
        },
      });

      if (updated.count === 1) {
        await tx.sendAccess.create({
          data: {
            sendId: send.id,
            status: 'SUCCESS',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });
      }

      return updated.count;
    });

    if (updateResult === 0) {
      return res.status(410).json({
        success: false,
        error: 'ACCESS_LIMIT_REACHED',
        message: 'The maximum access count for this Send has been reached or it has expired.',
      });
    }

    return res.json({
      success: true,
      data: {
        name: send.name,
        sendType: send.sendType,
        hideTextByDefault: send.hideTextByDefault,
        expiresAt: send.expiresAt.toISOString(),
        encryptedPayload: send.encryptedPayload,
        fileInfo: send.file,
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
 * Verify Specific Recipient Email
 */
router.post('/public/:token/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { email } = req.body;
    const tokenHash = hashPublicToken(token);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'EMAIL_REQUIRED',
        message: 'Recipient email is required',
      });
    }

    const send = await prisma.secureSend.findUnique({
      where: { publicTokenHash: tokenHash },
      include: {
        recipients: true,
        file: { select: { originalFileName: true, encryptedSize: true, mimeType: true } },
      },
    });

    if (!send || send.revokedAt || new Date() > send.expiresAt) {
      return res.status(404).json({
        success: false,
        error: 'SEND_UNAVAILABLE',
        message: 'This Send is unavailable or expired.',
      });
    }

    if (send.maxAccessCount !== null && send.currentAccessCount >= send.maxAccessCount) {
      return res.status(410).json({
        success: false,
        error: 'ACCESS_LIMIT_REACHED',
        message: 'The maximum access count for this Send has been reached.',
      });
    }

    const normalized = email.toLowerCase().trim();
    const recipient = send.recipients.find((r) => r.normalizedEmail === normalized);

    if (!recipient) {
      await prisma.sendAccess.create({
        data: {
          sendId: send.id,
          status: 'FAILED_EMAIL',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      return res.status(403).json({
        success: false,
        error: 'UNAUTHORIZED_EMAIL',
        message: 'This email is not authorized to view this Send.',
      });
    }

    // Atomic access increment and conditional limit check
    const updateResult = await prisma.$transaction(async (tx) => {
      const updated = await tx.secureSend.updateMany({
        where: {
          id: send.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          ...(send.maxAccessCount !== null ? { currentAccessCount: { lt: send.maxAccessCount } } : {}),
        },
        data: {
          currentAccessCount: { increment: 1 },
        },
      });

      if (updated.count === 1) {
        await tx.sendAccess.create({
          data: {
            sendId: send.id,
            status: 'SUCCESS',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });
      }

      return updated.count;
    });

    if (updateResult === 0) {
      return res.status(410).json({
        success: false,
        error: 'ACCESS_LIMIT_REACHED',
        message: 'The maximum access count for this Send has been reached or it has expired.',
      });
    }

    return res.json({
      success: true,
      data: {
        name: send.name,
        sendType: send.sendType,
        hideTextByDefault: send.hideTextByDefault,
        expiresAt: send.expiresAt.toISOString(),
        encryptedPayload: send.encryptedPayload,
        fileInfo: send.file,
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
 * Download Encrypted File
 */
router.get('/public/:token/download', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const tokenHash = hashPublicToken(token);

    const send = await prisma.secureSend.findUnique({
      where: { publicTokenHash: tokenHash },
      include: { file: true },
    });

    if (!send || !send.file) {
      return res.status(404).json({
        success: false,
        error: 'FILE_NOT_FOUND',
        message: 'Send or file not found',
      });
    }

    if (send.revokedAt || new Date() > send.expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'SEND_EXPIRED',
        message: 'This Send has expired or been revoked',
      });
    }

    const filePath = path.join(UPLOADS_DIR, send.file.storagePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'FILE_MISSING_ON_DISK',
        message: 'The file artifact could not be found on storage',
      });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(send.file.originalFileName)}"`
    );

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message,
    });
  }
});

export default router;

