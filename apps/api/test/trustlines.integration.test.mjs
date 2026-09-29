import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { test } from 'node:test';
import { createApp } from '../dist/app.js';
import { HorizonClient } from '../dist/trustlines/horizon.client.js';

const account = 'GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG';
const issuer = 'GDFJHLAXAUMHA4OWPOB4P7YO72AQR2HMIUYFOXLXE2DZGM633K7HZDQP';

globalThis.process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/stellar_test';

test('GET trustlines/check returns the exact matching Horizon balance', async () => {
  const app = await createApp();
  const horizonClient = app.get(HorizonClient);
  const originalGetAccount = horizonClient.getAccount;
  horizonClient.getAccount = async () => ({
    balances: [
      {
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        asset_issuer: issuer,
        balance: '3.5',
        limit: '20',
        is_authorized: true,
      },
    ],
  });

  try {
    await app.listen(0, '127.0.0.1');
    const url = new URL(`${await app.getUrl()}/api/v1/trustlines/check`);
    url.searchParams.set('account', account);
    url.searchParams.set('assetCode', 'USDC');
    url.searchParams.set('assetIssuer', issuer);
    const response = await globalThis.fetch(url);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      account,
      assetCode: 'USDC',
      assetIssuer: issuer,
      required: true,
      exists: true,
      authorized: true,
      balance: '3.5',
      limit: '20',
    });
  } finally {
    horizonClient.getAccount = originalGetAccount;
    await app.close();
  }
});
