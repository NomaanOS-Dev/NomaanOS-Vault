import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const isSqlite = dbUrl.startsWith('file:') || dbUrl.includes('.db');

console.log(`Setting up database (Target: ${isSqlite ? 'SQLite' : 'PostgreSQL'})...`);

const schemaPath = isSqlite ? 'prisma/schema.prisma' : 'prisma/schema.postgresql.prisma';

try {
  console.log(`Generating Prisma Client using ${schemaPath}...`);
  execSync(`npx.cmd prisma generate --schema=${schemaPath}`, { stdio: 'inherit' });

  console.log(`Pushing database schema changes...`);
  execSync(`npx.cmd prisma db push --schema=${schemaPath}`, { stdio: 'inherit' });

  console.log('Database synchronization completed successfully!');
} catch (err) {
  console.error('Database setup error:', err.message);
  process.exit(1);
}

