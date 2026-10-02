import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { PaymentRequestsService } from '../dist/payment-requests/payment-requests.service.js';

const destination = 'GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG';
const issuer = 'GDFJHLAXAUMHA4OWPOB4P7YO72AQR2HMIUYFOXLXE2DZGM633K7HZDQP';

function makeService({
  trustlineResult,
  trustlineError,
  findUnique,
  create,
} = {}) {
  let savedData;
  const prisma = {
    paymentRequest: {
      create: async ({ data }) => {
        savedData = data;
        return create ? create(data) : { id: 'request-id' };
      },
      findUnique: async (args) => (findUnique ? findUnique(args) : null),
    },
  };
  const config = { get: (_name, fallback) => fallback };
  const trustlinesService = {
    check: async () => {
      if (trustlineError) {
        throw trustlineError;
      }

      return (
        trustlineResult ?? {
          account: destination,
          assetCode: 'XLM',
          required: false,
          exists: true,
          authorized: true,
        }
      );
    },
  };

  return {
    service: new PaymentRequestsService(prisma, config, trustlinesService),
    getSavedData: () => savedData,
  };
}

const validRequest = {
  destination,
  assetCode: 'XLM',
  amount: '2.5',
};

test('stores only hashes and hashes the exact SEP-7 URI', async () => {
  const { service, getSavedData } = makeService();
  const request = {
    ...validRequest,
    memoType: 'TEXT',
    memo: 'private memo',
  };
  const response = await service.create(request);
  const saved = getSavedData();
  const hash = (value) =>
    createHash('sha256').update(value, 'utf8').digest('hex');

  assert.equal(response.requestHash, hash(response.uri));
  assert.equal(saved.destinationHash, hash(destination));
  assert.equal(saved.memoHash, hash(request.memo));
  assert.equal(saved.requestHash, response.requestHash);
  assert.equal(saved.network, 'TESTNET');
  assert.equal(saved.trustlineStatus, 'NOT_REQUIRED');
  assert.equal('destination' in saved, false);
  assert.equal('memo' in saved, false);
  assert.equal(response.requestId, 'request-id');
  assert.equal(response.existing, false);
});

test('returns the same request id when creating an identical request twice', async () => {
  let existingRequest;
  const { service } = makeService({
    findUnique: async () => existingRequest,
    create: async () => {
      existingRequest = { id: 'request-id' };
      return existingRequest;
    },
  });
  const first = await service.create(validRequest);
  const second = await service.create(validRequest);

  assert.equal(first.existing, false);
  assert.equal(second.existing, true);
  assert.equal(second.requestId, first.requestId);
  assert.equal(second.uri, first.uri);
  assert.equal(second.qrDataUrl, first.qrDataUrl);
  assert.equal(second.requestHash, first.requestHash);
});

test('returns the existing request when create races on the unique hash', async () => {
  const existingRequest = { id: 'raced-request-id' };
  let lookupCount = 0;
  const { service } = makeService({
    findUnique: async () => {
      lookupCount += 1;
      return lookupCount === 1 ? null : existingRequest;
    },
    create: async () => {
      throw { code: 'P2002' };
    },
  });
  const response = await service.create(validRequest);

  assert.equal(response.requestId, existingRequest.id);
  assert.equal(response.existing, true);
});

test('warns about missing trustlines without changing the SEP-7 URI', async () => {
  const { service } = makeService({
    trustlineResult: {
      account: destination,
      assetCode: 'USDC',
      assetIssuer: issuer,
      required: true,
      exists: false,
      authorized: false,
    },
  });
  const response = await service.create({
    ...validRequest,
    assetCode: 'USDC',
    assetIssuer: issuer,
  });

  assert.deepEqual(response.warnings, ['MISSING_TRUSTLINE']);
  assert.equal(response.trustline.exists, false);
  assert.match(response.uri, /^web\+stellar:pay\?/);
  assert.match(response.uri, /asset_code=USDC/);
  assert.doesNotMatch(response.uri, /trustline/i);
});

test('turns Horizon account and availability failures into warnings', async () => {
  const { HorizonAccountNotFoundError, HorizonUnavailableError } =
    await import('../dist/trustlines/horizon.client.js');

  for (const [error, warning] of [
    [new HorizonAccountNotFoundError(destination), 'ACCOUNT_NOT_FOUND'],
    [
      new HorizonUnavailableError('Horizon down'),
      'TRUSTLINE_CHECK_UNAVAILABLE',
    ],
  ]) {
    const { service } = makeService({ trustlineError: error });
    const response = await service.create({
      ...validRequest,
      assetCode: 'USDC',
      assetIssuer: issuer,
    });

    assert.deepEqual(response.warnings, [warning]);
    assert.equal(response.trustline, null);
  }
});

const invalidInputs = [
  ['INVALID_DESTINATION', { ...validRequest, destination: 'GINVALID' }],
  ['INVALID_AMOUNT', { ...validRequest, amount: '0' }],
  [
    'MEMO_TOO_LONG',
    { ...validRequest, memoType: 'TEXT', memo: 'a'.repeat(29) },
  ],
  [
    'INVALID_MEMO_ID',
    { ...validRequest, memoType: 'ID', memo: '18446744073709551616' },
  ],
  ['ASSET_ISSUER_REQUIRED', { ...validRequest, assetCode: 'USDC' }],
  [
    'INVALID_ASSET_ISSUER',
    { ...validRequest, assetCode: 'USDC', assetIssuer: 'GINVALID' },
  ],
  ['INVALID_ASSET_ISSUER', { ...validRequest, assetIssuer: issuer }],
];

for (const [code, input] of invalidInputs) {
  test(`returns ${code} for invalid payment request data`, async () => {
    const { service } = makeService();

    await assert.rejects(service.create(input), (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().code, code);
      assert.ok(error.message);
      return true;
    });
  });
}
