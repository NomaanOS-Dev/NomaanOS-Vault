import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { prisma } from '../database/prisma';

const router = Router();

const createItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required').max(200),
  itemType: z.enum(['LOGIN', 'CARD', 'IDENTITY', 'SECURE_NOTE', 'SSH_KEY']).default('LOGIN'),
  encryptedPayload: z.string().min(1, 'Encrypted payload is required'),
  folderId: z.string().nullable().optional(),
  isFavorite: z.boolean().default(false),
  isArchived: z.boolean().default(false),
});

const updateItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required').max(200),
  itemType: z.enum(['LOGIN', 'CARD', 'IDENTITY', 'SECURE_NOTE', 'SSH_KEY']).optional(),
  encryptedPayload: z.string().min(1, 'Encrypted payload is required'),
  folderId: z.string().nullable().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

/**
 * List authorized items for current user with filtering
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { filter, folderId, search } = req.query;

    const whereClause: any = {
      userId,
    };

    // Filter handling
    if (filter === 'trash') {
      whereClause.deletedAt = { not: null };
    } else {
      // By default, do not show trashed items
      whereClause.deletedAt = null;

      if (filter === 'favorites') {
        whereClause.isFavorite = true;
      } else if (filter === 'archive') {
        whereClause.isArchived = true;
      } else if (filter === 'login') {
        whereClause.itemType = 'LOGIN';
        whereClause.isArchived = false;
      } else if (filter === 'card') {
        whereClause.itemType = 'CARD';
        whereClause.isArchived = false;
      } else if (filter === 'identity') {
        whereClause.itemType = 'IDENTITY';
        whereClause.isArchived = false;
      } else if (filter === 'note') {
        whereClause.itemType = 'SECURE_NOTE';
        whereClause.isArchived = false;
      } else if (filter === 'ssh') {
        whereClause.itemType = 'SSH_KEY';
        whereClause.isArchived = false;
      } else if (filter === 'no_folder') {
        whereClause.folderId = null;
        whereClause.isArchived = false;
      } else if (filter === 'folder' && folderId) {
        whereClause.folderId = String(folderId);
        whereClause.isArchived = false;
      } else {
        // 'all' items: unarchived
        whereClause.isArchived = false;
      }
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      whereClause.itemName = {
        contains: search.trim(),
      };
    }

    const items = await prisma.vaultItem.findMany({
      where: whereClause,
      include: {
        folder: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    });

    const formatted = items.map((item) => ({
      id: item.id,
      vaultId: item.vaultId,
      userId: item.userId,
      itemName: item.itemName,
      itemType: item.itemType,
      folderId: item.folderId,
      folderName: item.folder?.name || null,
      isFavorite: item.isFavorite,
      isArchived: item.isArchived,
      deletedAt: item.deletedAt ? item.deletedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      encryptedPayload: item.encryptedPayload,
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
 * Get single item by ID
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const item = await prisma.vaultItem.findFirst({
      where: { id, userId },
      include: {
        folder: { select: { id: true, name: true } },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'ITEM_NOT_FOUND',
        message: 'Item not found or unauthorized',
      });
    }

    return res.json({
      success: true,
      data: {
        id: item.id,
        vaultId: item.vaultId,
        userId: item.userId,
        itemName: item.itemName,
        itemType: item.itemType,
        folderId: item.folderId,
        folderName: item.folder?.name || null,
        isFavorite: item.isFavorite,
        isArchived: item.isArchived,
        deletedAt: item.deletedAt ? item.deletedAt.toISOString() : null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        encryptedPayload: item.encryptedPayload,
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
 * Create item
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = createItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const userId = req.user!.id;
    const { itemName, itemType, encryptedPayload, folderId, isFavorite, isArchived } =
      parseResult.data;

    // Verify user vault exists
    const vault = await prisma.vault.findFirst({
      where: { userId },
    });

    if (!vault) {
      return res.status(404).json({
        success: false,
        error: 'VAULT_NOT_FOUND',
        message: 'User vault not found',
      });
    }

    // Verify folder ownership if provided
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId },
      });
      if (!folder) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_FOLDER',
          message: 'The selected folder does not exist or does not belong to you',
        });
      }
    }

    const newItem = await prisma.$transaction(async (tx) => {
      const item = await tx.vaultItem.create({
        data: {
          vaultId: vault.id,
          userId,
          itemName: itemName.trim(),
          itemType,
          encryptedPayload,
          folderId: folderId || null,
          isFavorite,
          isArchived,
        },
        include: {
          folder: { select: { id: true, name: true } },
        },
      });

      await tx.auditEvent.create({
        data: {
          userId,
          eventType: 'ITEM_CREATED',
        },
      });

      return item;
    });

    return res.status(201).json({
      success: true,
      message: 'Item created securely',
      data: {
        id: newItem.id,
        vaultId: newItem.vaultId,
        userId: newItem.userId,
        itemName: newItem.itemName,
        itemType: newItem.itemType,
        folderId: newItem.folderId,
        folderName: newItem.folder?.name || null,
        isFavorite: newItem.isFavorite,
        isArchived: newItem.isArchived,
        deletedAt: null,
        createdAt: newItem.createdAt.toISOString(),
        updatedAt: newItem.updatedAt.toISOString(),
        encryptedPayload: newItem.encryptedPayload,
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
 * Update item
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = updateItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0].message,
      });
    }

    const userId = req.user!.id;
    const { id } = req.params;
    const { itemName, itemType, encryptedPayload, folderId, isFavorite, isArchived } =
      parseResult.data;

    // Verify ownership
    const existing = await prisma.vaultItem.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'ITEM_NOT_FOUND',
        message: 'Item not found or unauthorized',
      });
    }

    // Verify folder ownership if provided
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId },
      });
      if (!folder) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_FOLDER',
          message: 'The selected folder does not exist or does not belong to you',
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.vaultItem.update({
        where: { id },
        data: {
          itemName: itemName.trim(),
          ...(itemType ? { itemType } : {}),
          encryptedPayload,
          folderId: folderId === undefined ? existing.folderId : folderId,
          ...(isFavorite !== undefined ? { isFavorite } : {}),
          ...(isArchived !== undefined ? { isArchived } : {}),
        },
        include: {
          folder: { select: { id: true, name: true } },
        },
      });

      await tx.auditEvent.create({
        data: {
          userId,
          eventType: 'ITEM_UPDATED',
        },
      });

      return item;
    });

    return res.json({
      success: true,
      message: 'Item updated successfully',
      data: {
        id: updated.id,
        vaultId: updated.vaultId,
        userId: updated.userId,
        itemName: updated.itemName,
        itemType: updated.itemType,
        folderId: updated.folderId,
        folderName: updated.folder?.name || null,
        isFavorite: updated.isFavorite,
        isArchived: updated.isArchived,
        deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        encryptedPayload: updated.encryptedPayload,
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
 * Toggle favorite
 */
router.patch('/:id/favorite', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.vaultItem.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'ITEM_NOT_FOUND',
        message: 'Item not found or unauthorized',
      });
    }

    const updated = await prisma.vaultItem.update({
      where: { id },
      data: { isFavorite: !existing.isFavorite },
    });

    return res.json({
      success: true,
      data: { id: updated.id, isFavorite: updated.isFavorite },
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
 * Archive item
 */
router.patch('/:id/archive', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.vaultItem.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'ITEM_NOT_FOUND',
        message: 'Item not found or unauthorized',
      });
    }

    const updated = await prisma.vaultItem.update({
      where: { id },
      data: { isArchived: true },
    });

    return res.json({
      success: true,
      message: 'Item archived',
      data: { id: updated.id, isArchived: updated.isArchived },
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
 * Restore item from archive
 */
router.patch('/:id/restore-archive', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.vaultItem.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'ITEM_NOT_FOUND',
        message: 'Item not found or unauthorized',
      });
    }

    const updated = await prisma.vaultItem.update({
      where: { id },
      data: { isArchived: false },
    });

    return res.json({
      success: true,
      message: 'Item unarchived',
      data: { id: updated.id, isArchived: updated.isArchived },
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
 * Move item to Trash (soft delete)
 */
router.patch('/:id/trash', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.vaultItem.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'ITEM_NOT_FOUND',
        message: 'Item not found or unauthorized',
      });
    }

    const updated = await prisma.vaultItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return res.json({
      success: true,
      message: 'Item moved to trash',
      data: { id: updated.id, deletedAt: updated.deletedAt?.toISOString() },
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
 * Restore item from Trash
 */
router.patch('/:id/restore-trash', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.vaultItem.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'ITEM_NOT_FOUND',
        message: 'Item not found or unauthorized',
      });
    }

    const updated = await prisma.vaultItem.update({
      where: { id },
      data: { deletedAt: null },
    });

    return res.json({
      success: true,
      message: 'Item restored from trash',
      data: { id: updated.id, deletedAt: null },
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
 * Permanently delete item
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.vaultItem.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'ITEM_NOT_FOUND',
        message: 'Item not found or unauthorized',
      });
    }

    await prisma.$transaction([
      prisma.vaultItem.delete({
        where: { id },
      }),
      prisma.auditEvent.create({
        data: {
          userId,
          eventType: 'ITEM_PERMANENTLY_DELETED',
        },
      }),
    ]);

    return res.json({
      success: true,
      message: 'Item permanently deleted',
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
