import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { PaymentRequestsModule } from './payment-requests/payment-requests.module';
import { TrustlinesModule } from './trustlines/trustlines.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    PaymentRequestsModule,
    TrustlinesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
