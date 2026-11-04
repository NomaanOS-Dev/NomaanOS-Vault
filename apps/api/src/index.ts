import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { validateEnvironment } from './config';
validateEnvironment();

import authRoutes from './routes/authRoutes';
import vaultRoutes from './routes/vaultRoutes';
import folderRoutes from './routes/folderRoutes';
import itemRoutes from './routes/itemRoutes';
import sendRoutes from './routes/sendRoutes';
import { prisma } from './database/prisma';

export const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Managed by reverse proxy in production, Vite in dev
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
    noSniff: true,
    hidePoweredBy: true,
  })
);

// CORS configuration
app.use(
  cors({
    origin: [CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// General Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again after 15 minutes.',
  },
});

app.use(generalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * Health Check (Liveness Probe)
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'NomaanOS Vault API',
  });
});

/**
 * Readiness Probe (Checks Database & Storage Connectivity)
 */
app.get('/api/ready', async (req: Request, res: Response) => {
  try {
    // Ping database
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'READY',
      timestamp: new Date().toISOString(),
      database: 'CONNECTED',
    });
  } catch (error: any) {
    return res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      database: 'DISCONNECTED',
      error: error.message,
    });
  }
});

// Mount Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/send', sendRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`NomaanOS Vault API server running on port ${PORT}`);
  });
}
