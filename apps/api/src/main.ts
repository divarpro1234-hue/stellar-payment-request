import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createApp } from './app';

async function bootstrap() {
  if (existsSync('.env')) loadEnvFile('.env');
  const app = await createApp();
  await app.listen(Number(process.env.PORT ?? 3001));
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
