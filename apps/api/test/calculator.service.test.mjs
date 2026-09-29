import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '../dist/generated/prisma/client.js';
import { CalculatorService } from '../dist/calculator/calculator.service.js';
import { PriceProviderError } from '../dist/market-data/price-provider.js';

function makeService({ cache = null, quote, providerError, ttl = '60' } = {}) {
  let upsertData;
  let providerCalls = 0;
  const prisma = {
    marketPriceCache: {
      findUnique: async () => cache,
      upsert: async (args) => {
        upsertData = args;
        return {
          price: new Prisma.Decimal(args.create.price),
          fetchedAt: args.create.fetchedAt,
        };
      },
    },
  };
  const config = { get: (_key, fallback) => ttl ?? fallback };
  const provider = {
    getXlmUsdPrice: async () => {
      providerCalls += 1;
      if (providerError) {
        throw providerError;
      }
      return quote;
    },
  };

  return {
    service: new CalculatorService(prisma, config, provider),
    getUpsertData: () => upsertData,
    getProviderCalls: () => providerCalls,
  };
}

test('uses an unexpired database cache without calling CoinGecko', async () => {
  const fetchedAt = new Date('2026-09-28T12:00:00.000Z');
  const { service, getProviderCalls } = makeService({
    cache: {
      price: new Prisma.Decimal('0.25'),
      fetchedAt,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  assert.deepEqual(await service.calculate({ amount: '10' }), {
    amountXlm: '10',
    priceUsd: '0.25',
    valueUsd: '2.5',
    source: 'CoinGecko',
    fetchedAt: fetchedAt.toISOString(),
    cached: true,
  });
  assert.equal(getProviderCalls(), 0);
});

test('refreshes expired cache and multiplies with decimal precision', async () => {
  const fetchedAt = new Date('2026-09-28T12:00:00.000Z');
  const { service, getUpsertData, getProviderCalls } = makeService({
    cache: {
      price: new Prisma.Decimal('0.1'),
      fetchedAt,
      expiresAt: new Date(Date.now() - 1000),
    },
    quote: { priceUsd: '0.1234567890123456789', fetchedAt },
  });

  assert.deepEqual(await service.calculate({ amount: '10' }), {
    amountXlm: '10',
    priceUsd: '0.1234567890123456789',
    valueUsd: '1.234567890123456789',
    source: 'CoinGecko',
    fetchedAt: fetchedAt.toISOString(),
    cached: false,
  });
  assert.equal(getProviderCalls(), 1);
  assert.equal(getUpsertData().where.pair, 'XLM/USD');
  assert.equal(
    getUpsertData().create.expiresAt.getTime() - fetchedAt.getTime(),
    60_000,
  );
});

test('rejects zero, negative, exponent and over-precision amounts', async () => {
  for (const amount of ['0', '-1', '1e2', '1.12345678']) {
    const { service, getProviderCalls } = makeService();

    await assert.rejects(service.calculate({ amount }), (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().code, 'INVALID_AMOUNT');
      return true;
    });
    assert.equal(getProviderCalls(), 0);
  }
});

test('does not use expired prices when the provider fails', async () => {
  const { service } = makeService({
    cache: {
      price: new Prisma.Decimal('0.1'),
      fetchedAt: new Date(Date.now() - 120_000),
      expiresAt: new Date(Date.now() - 60_000),
    },
    providerError: new PriceProviderError(
      'PRICE_PROVIDER_UNAVAILABLE',
      'CoinGecko is unavailable.',
    ),
  });

  await assert.rejects(service.calculate({ amount: '10' }), (error) => {
    assert.equal(error.getStatus(), 503);
    assert.equal(error.getResponse().code, 'PRICE_PROVIDER_UNAVAILABLE');
    return true;
  });
});
