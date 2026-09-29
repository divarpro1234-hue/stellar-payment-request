import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../dist/app.js';
import { Prisma } from '../dist/generated/prisma/client.js';
import { PrismaService } from '../dist/database/prisma.service.js';
import { CoinGeckoPriceProvider } from '../dist/market-data/coingecko-price.provider.js';

globalThis.process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/stellar_test';

test('GET calculator/xlm-usd returns a Decimal-based value and populates cache', async () => {
  const app = await createApp();
  const prisma = app.get(PrismaService);
  const cache = prisma.marketPriceCache;
  const originalFindUnique = cache.findUnique;
  const originalUpsert = cache.upsert;
  const provider = app.get(CoinGeckoPriceProvider);
  const originalGetPrice = provider.getXlmUsdPrice;
  let upsertArgs;

  cache.findUnique = async () => null;
  cache.upsert = async (args) => {
    upsertArgs = args;
    return {
      price: new Prisma.Decimal(args.create.price),
      fetchedAt: args.create.fetchedAt,
    };
  };
  provider.getXlmUsdPrice = async () => ({
    priceUsd: '0.1234567890123456789',
    fetchedAt: new Date('2026-09-28T12:00:00.000Z'),
  });

  try {
    await app.listen(0, '127.0.0.1');
    const response = await globalThis.fetch(
      `${await app.getUrl()}/api/v1/calculator/xlm-usd?amount=10`,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      amountXlm: '10',
      priceUsd: '0.1234567890123456789',
      valueUsd: '1.234567890123456789',
      source: 'CoinGecko',
      fetchedAt: '2026-09-28T12:00:00.000Z',
      cached: false,
    });
    assert.equal(upsertArgs.where.pair, 'XLM/USD');
    assert.equal(upsertArgs.create.source, 'CoinGecko');
  } finally {
    cache.findUnique = originalFindUnique;
    cache.upsert = originalUpsert;
    provider.getXlmUsdPrice = originalGetPrice;
    await app.close();
  }
});

test('GET calculator rejects an invalid amount before querying price data', async () => {
  const app = await createApp();
  const prisma = app.get(PrismaService);
  const cache = prisma.marketPriceCache;
  const originalFindUnique = cache.findUnique;
  let cacheWasQueried = false;
  cache.findUnique = async () => {
    cacheWasQueried = true;
    return null;
  };

  try {
    await app.listen(0, '127.0.0.1');
    const response = await globalThis.fetch(
      `${await app.getUrl()}/api/v1/calculator/xlm-usd?amount=0`,
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.code, 'INVALID_AMOUNT');
    assert.equal(cacheWasQueried, false);
  } finally {
    cache.findUnique = originalFindUnique;
    await app.close();
  }
});
