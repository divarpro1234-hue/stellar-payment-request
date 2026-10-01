import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CalculatorModule } from './calculator/calculator.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { MarketDataModule } from './market-data/market-data.module';
import { PaymentRequestsModule } from './payment-requests/payment-requests.module';
import { RegistryModule } from './registry/registry.module';
import { TrustlinesModule } from './trustlines/trustlines.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    MarketDataModule,
    CalculatorModule,
    PaymentRequestsModule,
    RegistryModule,
    TrustlinesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
