export interface PriceQuote {
  priceUsd: string;
  fetchedAt: Date;
}

export interface PriceProvider {
  getXlmUsdPrice(): Promise<PriceQuote>;
}

export const PRICE_PROVIDER = Symbol('PRICE_PROVIDER');

export type PriceProviderErrorCode =
  | 'PRICE_PROVIDER_TIMEOUT'
  | 'COINGECKO_RATE_LIMITED'
  | 'INVALID_PRICE_RESPONSE'
  | 'PRICE_MISSING'
  | 'PRICE_PROVIDER_UNAVAILABLE';

export class PriceProviderError extends Error {
  constructor(
    readonly code: PriceProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PriceProviderError';
  }
}
