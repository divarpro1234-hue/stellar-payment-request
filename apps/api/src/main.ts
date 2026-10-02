import { ConfigService } from '@nestjs/config';
import { createApp } from './app';

async function bootstrap() {
  const app = await createApp();
  const configService = app.get(ConfigService);
  await app.listen(configService.get<number>('PORT', 3001));
}

bootstrap().catch((error: unknown) => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Application failed to start.');
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
