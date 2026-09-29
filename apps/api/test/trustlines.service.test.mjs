import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HorizonAccountNotFoundError,
  HorizonUnavailableError,
} from '../dist/trustlines/horizon.client.js';
import { TrustlinesService } from '../dist/trustlines/trustlines.service.js';

const account = 'GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG';
const issuer = 'GDFJHLAXAUMHA4OWPOB4P7YO72AQR2HMIUYFOXLXE2DZGM633K7HZDQP';
const otherIssuer = 'GCATS5YOVB6ROX2WUNKGNQ2MP3GMXDMKSG2O4N5CLX3A6W4PZGZZI55U';

function makeService(getAccount = async () => ({ balances: [] })) {
  const horizonClient = { getAccount };
  return new TrustlinesService(horizonClient);
}

const query = { account, assetCode: 'USDC', assetIssuer: issuer };

test('XLM does not require a Horizon request or trustline', async () => {
  let called = false;
  const service = makeService(async () => {
    called = true;
    return { balances: [] };
  });

  assert.deepEqual(await service.check({ account, assetCode: 'XLM' }), {
    account,
    assetCode: 'XLM',
    required: false,
    exists: true,
    authorized: true,
  });
  assert.equal(called, false);
});

test('matches both asset code and issuer in Horizon balances', async () => {
  const service = makeService(async () => ({
    balances: [
      {
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        asset_issuer: otherIssuer,
        balance: '99',
        limit: '100',
      },
      {
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        asset_issuer: issuer,
        balance: '5.25',
        limit: '50',
        is_authorized: true,
      },
    ],
  }));

  assert.deepEqual(await service.check(query), {
    ...query,
    required: true,
    exists: true,
    authorized: true,
    balance: '5.25',
    limit: '50',
  });
});

test('reports a missing trustline when only the same code with another issuer exists', async () => {
  const service = makeService(async () => ({
    balances: [
      {
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        asset_issuer: otherIssuer,
        balance: '1',
      },
    ],
  }));

  assert.deepEqual(await service.check(query), {
    ...query,
    required: true,
    exists: false,
    authorized: false,
  });
});

test('returns an existing trustline as unauthorized', async () => {
  const service = makeService(async () => ({
    balances: [
      {
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        asset_issuer: issuer,
        balance: '0',
        limit: '10',
        is_authorized: false,
      },
    ],
  }));

  const result = await service.check(query);
  assert.equal(result.exists, true);
  assert.equal(result.authorized, false);
});

test('propagates account-not-found instead of treating it as a missing trustline', async () => {
  const error = new HorizonAccountNotFoundError(account);
  const service = makeService(async () => {
    throw error;
  });

  await assert.rejects(service.check(query), error);
});

test('propagates temporary Horizon failures distinctly', async () => {
  const error = new HorizonUnavailableError('Horizon returned HTTP 503.');
  const service = makeService(async () => {
    throw error;
  });

  await assert.rejects(service.check(query), error);
});
