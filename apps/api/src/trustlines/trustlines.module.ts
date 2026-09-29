import { Module } from '@nestjs/common';
import { HorizonClient } from './horizon.client';
import { TrustlinesController } from './trustlines.controller';
import { TrustlinesService } from './trustlines.service';

@Module({
  controllers: [TrustlinesController],
  providers: [HorizonClient, TrustlinesService],
  exports: [HorizonClient, TrustlinesService],
})
export class TrustlinesModule {}
