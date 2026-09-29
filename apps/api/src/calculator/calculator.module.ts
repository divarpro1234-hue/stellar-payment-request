import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { CalculatorController } from './calculator.controller';
import { CalculatorService } from './calculator.service';

@Module({
  imports: [MarketDataModule],
  controllers: [CalculatorController],
  providers: [CalculatorService],
})
export class CalculatorModule {}
