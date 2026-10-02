import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const fallbackUrl = 'postgresql://postgres:postgres@localhost:5432/stellar';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? fallbackUrl,
  },
});
