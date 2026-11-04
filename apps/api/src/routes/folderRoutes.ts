import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { prisma } from '../database/prisma';

const router = Router();

const folderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100),
});

/**
 * List folders for authenticated user with item count
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const folders = await prisma.folder.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            items: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    const formatted = folders.map((f) => ({
      id: f.id,
      userId: f.userId,
      vaultId: f.vaultId,
      name: f.name,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      itemCount: f._count.items,
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
 * Create a new folder
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = folderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const userId = req.user!.id;
    const { name } = parseResult.data;

    const vault = await prisma.vault.findFirst({
      where: { userId },
    });

    if (!vault) {
      return res.status(404).json({
        success: false,
        error: 'VAULT_NOT_FOUND',
        message: 'Primary vault not found for user',
      });
    }

    // Check duplicate folder name
    const existing = await prisma.folder.findFirst({
      where: { vaultId: vault.id, name },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'FOLDER_EXISTS',
        message: `A folder named "${name}" already exists.`,
      });
    }

    const folder = await prisma.folder.create({
      data: {
        userId,
        vaultId: vault.id,
        name: name.trim(),
      },
    });

    await prisma.auditEvent.create({
      data: {
        userId,
        eventType: 'FOLDER_CREATED',
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: folder.id,
        userId: folder.userId,
        vaultId: folder.vaultId,
        name: folder.name,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
        itemCount: 0,
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
 * Rename folder
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = folderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const userId = req.user!.id;
    const { id } = req.params;
    const { name } = parseResult.data;

    // Verify ownership
    const folder = await prisma.folder.findFirst({
      where: { id, userId },
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: 'FOLDER_NOT_FOUND',
        message: 'Folder not found or unauthorized',
      });
    }

    const updated = await prisma.folder.update({
      where: { id },
      data: { name: name.trim() },
    });

    return res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        updatedAt: updated.updatedAt.toISOString(),
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
 * Delete folder (safely sets items to No folder)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const folder = await prisma.folder.findFirst({
      where: { id, userId },
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: 'FOLDER_NOT_FOUND',
        message: 'Folder not found or unauthorized',
      });
    }

    // Move all items to No folder (null), then delete folder
    await prisma.$transaction([
      prisma.vaultItem.updateMany({
        where: { folderId: id, userId },
        data: { folderId: null },
      }),
      prisma.folder.delete({
        where: { id },
      }),
      prisma.auditEvent.create({
        data: {
          userId,
          eventType: 'FOLDER_DELETED',
        },
      }),
    ]);

    return res.json({
      success: true,
      message: 'Folder deleted and items safely unassigned.',
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
