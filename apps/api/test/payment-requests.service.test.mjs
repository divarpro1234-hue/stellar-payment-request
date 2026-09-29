import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { PaymentRequestsService } from '../dist/payment-requests/payment-requests.service.js';

const destination = 'GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG';
const issuer = 'GDFJHLAXAUMHA4OWPOB4P7YO72AQR2HMIUYFOXLXE2DZGM633K7HZDQP';

function makeService() {
  let savedData;
  const prisma = {
    paymentRequest: {
      create: async ({ data }) => {
        savedData = data;
        return { id: 'request-id' };
      },
    },
  };
  const config = { get: (_name, fallback) => fallback };

  return {
    service: new PaymentRequestsService(prisma, config),
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
  assert.equal(saved.trustlineStatus, 'UNKNOWN');
  assert.equal('destination' in saved, false);
  assert.equal('memo' in saved, false);
  assert.equal(response.requestId, 'request-id');
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
