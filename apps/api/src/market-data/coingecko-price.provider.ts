import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client';
import type { PriceProvider, PriceQuote } from './price-provider';
import { PriceProviderError } from './price-provider';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class CoinGeckoPriceProvider implements PriceProvider {
  constructor(private readonly configService: ConfigService) {}

  async getXlmUsdPrice(): Promise<PriceQuote> {
    const baseUrl = this.configService.get<string>(
      'COINGECKO_BASE_URL',
      'https://api.coingecko.com/api/v3',
    );
    const url = new URL(`${baseUrl.replace(/\/+$/, '')}/simple/price`);
    url.searchParams.set('ids', 'stellar');
    url.searchParams.set('vs_currencies', 'usd');

    let response: Response;

    try {
      response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      const name =
        isRecord(error) && typeof error.name === 'string' ? error.name : '';

      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new PriceProviderError(
          'PRICE_PROVIDER_TIMEOUT',
          'CoinGecko request timed out.',
        );
      }

      throw new PriceProviderError(
        'PRICE_PROVIDER_UNAVAILABLE',
        'CoinGecko could not be reached.',
      );
    }

    if (response.status === 429) {
      throw new PriceProviderError(
        'COINGECKO_RATE_LIMITED',
        'CoinGecko rate limit was reached.',
      );
    }

    if (!response.ok) {
      throw new PriceProviderError(
        'PRICE_PROVIDER_UNAVAILABLE',
        `CoinGecko returned HTTP ${response.status}.`,
      );
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw new PriceProviderError(
        'INVALID_PRICE_RESPONSE',
        'CoinGecko returned invalid JSON.',
      );
    }

    if (!isRecord(payload) || !isRecord(payload.stellar)) {
      throw new PriceProviderError(
        'INVALID_PRICE_RESPONSE',
        'CoinGecko response does not contain the stellar price object.',
      );
    }

    const rawPrice = payload.stellar.usd;

    if (rawPrice === undefined || rawPrice === null) {
      throw new PriceProviderError(
        'PRICE_MISSING',
        'CoinGecko response does not contain the USD price.',
      );
    }

    if (typeof rawPrice !== 'number' && typeof rawPrice !== 'string') {
      throw new PriceProviderError(
        'INVALID_PRICE_RESPONSE',
        'CoinGecko returned a non-numeric USD price.',
      );
    }

    let price: Prisma.Decimal;

    try {
      price = new Prisma.Decimal(String(rawPrice));
    } catch {
      throw new PriceProviderError(
        'INVALID_PRICE_RESPONSE',
        'CoinGecko returned an invalid USD price.',
      );
    }

    if (!price.isFinite() || !price.greaterThan(0)) {
      throw new PriceProviderError(
        'INVALID_PRICE_RESPONSE',
        'CoinGecko returned a non-positive USD price.',
      );
    }

    return { priceUsd: price.toString(), fetchedAt: new Date() };
  }
}
