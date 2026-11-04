import { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from '../security/auth';
import { prisma } from '../database/prisma';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  profileImage: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.session_token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication session required. Please sign in.',
      });
    }

    const payload = verifySessionToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
        profileImage: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'The user account associated with this session no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'SESSION_EXPIRED',
        message: 'Your session has expired. Please sign in again.',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'INVALID_SESSION',
      message: 'Invalid session token.',
    });
  }
}

