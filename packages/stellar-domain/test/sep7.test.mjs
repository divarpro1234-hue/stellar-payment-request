import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TESTNET_NETWORK_PASSPHRASE, buildSep7Uri } from '../dist/index.js';

const destination = 'GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG';
const issuer = 'GDFJHLAXAUMHA4OWPOB4P7YO72AQR2HMIUYFOXLXE2DZGM633K7HZDQP';

test('builds a public XLM payment without asset or network parameters', () => {
  assert.equal(
    buildSep7Uri({
      destination,
      amount: '10.1234567',
      assetCode: 'XLM',
      assetIssuer: issuer,
      network: 'PUBLIC',
    }),
    `web+stellar:pay?destination=${destination}&amount=10.1234567`,
  );
});

test('uses canonical parameter order for a Testnet issued asset', () => {
  const uri = buildSep7Uri({
    destination,
    amount: '2',
    assetCode: 'USDC',
    assetIssuer: issuer,
    memo: 'invoice 42',
    memoType: 'TEXT',
    network: 'TESTNET',
  });

  assert.equal(
    uri,
    `web+stellar:pay?destination=${destination}` +
      `&amount=2&asset_code=USDC&asset_issuer=${issuer}` +
      '&memo=invoice%2042&memo_type=MEMO_TEXT' +
      `&network_passphrase=${encodeURIComponent(TESTNET_NETWORK_PASSPHRASE)}`,
  );
});

test('maps ID memos to MEMO_ID', () => {
  const uri = buildSep7Uri({
    destination,
    amount: '1',
    assetCode: 'XLM',
    memo: '18446744073709551615',
    memoType: 'ID',
    network: 'PUBLIC',
  });

  assert.match(uri, /&memo=18446744073709551615&memo_type=MEMO_ID$/);
});

test('percent-encodes UTF-8 and reserved URL characters', () => {
  const uri = buildSep7Uri({
    destination,
    amount: '1',
    assetCode: 'XLM',
    memo: 'café & pan?',
    memoType: 'TEXT',
    network: 'PUBLIC',
  });

  assert.match(uri, /&memo=caf%C3%A9%20%26%20pan%3F&memo_type=MEMO_TEXT$/);
});

test('produces exactly the same URI for the same request', () => {
  const request = {
    destination,
    amount: '1.5',
    assetCode: 'USDC',
    assetIssuer: issuer,
    memo: '42',
    memoType: 'ID',
    network: 'TESTNET',
  };

  assert.equal(buildSep7Uri(request), buildSep7Uri(request));
});

test('rejects invalid domain data before building a URI', () => {
  assert.throws(() =>
    buildSep7Uri({
      destination: 'GINVALID',
      amount: '1',
      assetCode: 'XLM',
      network: 'PUBLIC',
    }),
  );

  assert.throws(() =>
    buildSep7Uri({
      destination,
      amount: '0',
      assetCode: 'XLM',
      network: 'PUBLIC',
    }),
  );
});
