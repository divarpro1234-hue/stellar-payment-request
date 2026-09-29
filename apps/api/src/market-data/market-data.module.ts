import { Module } from '@nestjs/common';
import { CoinGeckoPriceProvider } from './coingecko-price.provider';
import { PRICE_PROVIDER } from './price-provider';

@Module({
  providers: [
    CoinGeckoPriceProvider,
    { provide: PRICE_PROVIDER, useExisting: CoinGeckoPriceProvider },
  ],
  exports: [PRICE_PROVIDER],
})
export class MarketDataModule {}
