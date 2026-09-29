import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CoinGeckoPriceProvider } from '../dist/market-data/coingecko-price.provider.js';
import { PriceProviderError } from '../dist/market-data/price-provider.js';

function makeProvider() {
  return new CoinGeckoPriceProvider({
    get: (_key, fallback) => fallback,
  });
}

async function withFetch(mockFetch, callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('requests the keyless CoinGecko stellar/USD endpoint', async () => {
  await withFetch(
    async (url, options) => {
      assert.equal(
        String(url),
        'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd',
      );
      assert.deepEqual(options.headers, { accept: 'application/json' });
      return {
        ok: true,
        status: 200,
        json: async () => ({ stellar: { usd: 0.123456789 } }),
      };
    },
    async () => {
      const quote = await makeProvider().getXlmUsdPrice();

      assert.equal(quote.priceUsd, '0.123456789');
      assert.ok(quote.fetchedAt instanceof Date);
    },
  );
});

const providerFailures = [
  [
    '429 responses are rate limited',
    async () => ({ ok: false, status: 429 }),
    'COINGECKO_RATE_LIMITED',
  ],
  [
    '5xx responses are unavailable',
    async () => ({ ok: false, status: 503 }),
    'PRICE_PROVIDER_UNAVAILABLE',
  ],
  [
    'invalid JSON is rejected',
    async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw Error();
      },
    }),
    'INVALID_PRICE_RESPONSE',
  ],
  [
    'a missing price is rejected',
    async () => ({
      ok: true,
      status: 200,
      json: async () => ({ stellar: {} }),
    }),
    'PRICE_MISSING',
  ],
  [
    'a non-positive price is rejected',
    async () => ({
      ok: true,
      status: 200,
      json: async () => ({ stellar: { usd: 0 } }),
    }),
    'INVALID_PRICE_RESPONSE',
  ],
  [
    'timeouts are distinguished from other provider failures',
    async () => {
      throw Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    },
    'PRICE_PROVIDER_TIMEOUT',
  ],
];

for (const [description, mockFetch, expectedCode] of providerFailures) {
  test(`CoinGecko ${description}`, async () => {
    await withFetch(mockFetch, async () => {
      await assert.rejects(makeProvider().getXlmUsdPrice(), (error) => {
        assert.ok(error instanceof PriceProviderError);
        assert.equal(error.code, expectedCode);
        return true;
      });
    });
  });
}
