import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import jsQR from 'jsqr';
import pngjs from 'pngjs';
import { createApp } from '../dist/app.js';
import { PrismaService } from '../dist/database/prisma.service.js';

const { PNG } = pngjs;
const destination = 'GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG';

globalThis.process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/stellar_test';
globalThis.process.env.STELLAR_NETWORK = 'TESTNET';

test('creates a request and returns a QR decoding to the exact SEP-7 URI', async () => {
  const app = await createApp();
  const prisma = app.get(PrismaService);
  const paymentRequestDelegate = prisma.paymentRequest;
  const originalCreate = paymentRequestDelegate.create;
  let savedData;

  paymentRequestDelegate.create = async ({ data }) => {
    savedData = data;
    return { id: 'integration-request-id' };
  };

  try {
    await app.listen(0, '127.0.0.1');
    const response = await globalThis.fetch(
      `${await app.getUrl()}/api/v1/payment-requests`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          destination,
          assetCode: 'XLM',
          amount: '12.34',
          memoType: 'TEXT',
          memo: 'invoice 42',
        }),
      },
    );

    assert.equal(response.status, 201);
    const body = await response.json();
    const png = PNG.sync.read(
      Buffer.from(body.qrDataUrl.split(',')[1], 'base64'),
    );
    const decoded = jsQR(
      new Uint8ClampedArray(png.data),
      png.width,
      png.height,
    );
    const hash = (value) =>
      createHash('sha256').update(value, 'utf8').digest('hex');

    assert.ok(body.uri.startsWith('web+stellar:pay?'));
    assert.equal(decoded?.data, body.uri);
    assert.equal(body.network, 'TESTNET');
    assert.equal(body.requestId, 'integration-request-id');
    assert.equal(body.requestHash, hash(body.uri));
    assert.equal(body.trustline, null);
    assert.ok(Array.isArray(body.warnings));
    assert.equal(savedData.destinationHash, hash(destination));
    assert.equal(savedData.memoHash, hash('invoice 42'));
    assert.equal('destination' in savedData, false);
    assert.equal('memo' in savedData, false);
  } finally {
    paymentRequestDelegate.create = originalCreate;
    await app.close();
  }
});

test('returns readable error codes for shared Stellar validation failures', async () => {
  const app = await createApp();

  try {
    await app.listen(0, '127.0.0.1');
    const response = await globalThis.fetch(
      `${await app.getUrl()}/api/v1/payment-requests`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          destination: 'GINVALID',
          assetCode: 'XLM',
          amount: '1',
        }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.code, 'INVALID_DESTINATION');
    assert.match(body.message, /valid Stellar account/);
  } finally {
    await app.close();
  }
});
