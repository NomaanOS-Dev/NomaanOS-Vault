import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters in dev, 32 in prod'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters in dev, 32 in prod'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().optional(),
  APP_BASE_URL: z.string().default('http://localhost:5173'),
});

export function validateEnvironment(): void {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('CRITICAL: Environment configuration error:');
    for (const err of result.error.errors) {
      console.error(` - ${err.path.join('.')}: ${err.message}`);
    }
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    if (
      process.env.JWT_SECRET === 'you_jwt_token_secret_32_characters_minimum' ||
      process.env.SESSION_SECRET === 'your_session_secret_32_characters_minimum'
    ) {
      console.error('FATAL: Default development secrets detected in production environment!');
      process.exit(1);
    }
  }
}
