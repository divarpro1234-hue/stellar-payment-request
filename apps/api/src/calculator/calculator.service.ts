import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isValidAmount } from '@stellar-payment-request/stellar-domain';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  PRICE_PROVIDER,
  PriceProviderError,
} from '../market-data/price-provider';
import type { PriceProvider } from '../market-data/price-provider';
import { CalculateXlmUsdDto } from './calculator.dto';

const PRICE_PAIR = 'XLM/USD';
const DEFAULT_CACHE_TTL_SECONDS = 60;

export interface XlmUsdCalculation {
  amountXlm: string;
  priceUsd: string;
  valueUsd: string;
  source: 'CoinGecko';
  fetchedAt: string;
  cached: boolean;
}

@Injectable()
export class CalculatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(PRICE_PROVIDER) private readonly priceProvider: PriceProvider,
  ) {}

  async calculate(dto: CalculateXlmUsdDto): Promise<XlmUsdCalculation> {
    if (!isValidAmount(dto.amount)) {
      throw new BadRequestException({
        code: 'INVALID_AMOUNT',
        message: 'Amount must be positive and have at most seven decimals.',
      });
    }

    const now = new Date();
    const cachedPrice = await this.prisma.marketPriceCache.findUnique({
      where: { pair: PRICE_PAIR },
    });

    if (cachedPrice && cachedPrice.expiresAt > now) {
      return this.buildResult(
        dto.amount,
        cachedPrice.price.toString(),
        cachedPrice.fetchedAt,
        true,
      );
    }

    let quote;

    try {
      quote = await this.priceProvider.getXlmUsdPrice();
    } catch (error) {
      this.handleProviderError(error);
    }

    const fetchedAt = quote.fetchedAt;
    const expiresAt = new Date(
      fetchedAt.getTime() + this.getCacheTtlSeconds() * 1000,
    );
    const savedPrice = await this.prisma.marketPriceCache.upsert({
      where: { pair: PRICE_PAIR },
      create: {
        pair: PRICE_PAIR,
        price: quote.priceUsd,
        source: 'CoinGecko',
        fetchedAt,
        expiresAt,
      },
      update: {
        price: quote.priceUsd,
        source: 'CoinGecko',
        fetchedAt,
        expiresAt,
      },
    });

    return this.buildResult(
      dto.amount,
      savedPrice.price.toString(),
      savedPrice.fetchedAt,
      false,
    );
  }

  private buildResult(
    amountXlm: string,
    priceUsd: string,
    fetchedAt: Date,
    cached: boolean,
  ): XlmUsdCalculation {
    const valueUsd = new Prisma.Decimal(amountXlm)
      .mul(new Prisma.Decimal(priceUsd))
      .toString();

    return {
      amountXlm,
      priceUsd,
      valueUsd,
      source: 'CoinGecko',
      fetchedAt: fetchedAt.toISOString(),
      cached,
    };
  }

  private getCacheTtlSeconds(): number {
    const configured = this.configService.get<string>(
      'PRICE_CACHE_TTL_SECONDS',
    );

    if (!configured || !/^\d+$/.test(configured)) {
      return DEFAULT_CACHE_TTL_SECONDS;
    }

    const ttl = Number(configured);
    return Number.isSafeInteger(ttl) && ttl > 0
      ? ttl
      : DEFAULT_CACHE_TTL_SECONDS;
  }

  private handleProviderError(error: unknown): never {
    if (!(error instanceof PriceProviderError)) {
      throw new ServiceUnavailableException({
        code: 'PRICE_PROVIDER_UNAVAILABLE',
        message: 'The XLM/USD price is temporarily unavailable.',
      });
    }

    const response = { code: error.code, message: error.message };

    switch (error.code) {
      case 'PRICE_PROVIDER_TIMEOUT':
        throw new GatewayTimeoutException(response);
      case 'INVALID_PRICE_RESPONSE':
      case 'PRICE_MISSING':
        throw new BadGatewayException(response);
      case 'COINGECKO_RATE_LIMITED':
      case 'PRICE_PROVIDER_UNAVAILABLE':
        throw new ServiceUnavailableException(response);
    }
  }
}
