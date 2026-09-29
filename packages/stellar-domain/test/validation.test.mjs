import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isValidAmount,
  isValidAsset,
  isValidMemoId,
  isValidMemoText,
  isValidStellarAccount,
} from '../dist/index.js';

const destination = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const issuer = 'GCATS5YOVB6ROX2WUNKGNQ2MP3GMXDMKSG2O4N5CLX3A6W4PZGZZI55U';

test('validates a destination using Stellar StrKey', () => {
  assert.equal(isValidStellarAccount(destination), true);
  assert.equal(
    isValidStellarAccount(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    ),
    false,
  );
  assert.equal(isValidStellarAccount('GABC'), false);
});

test('rejects zero and negative amounts', () => {
  assert.equal(isValidAmount('0'), false);
  assert.equal(isValidAmount('0.0000000'), false);
  assert.equal(isValidAmount('-1'), false);
});

test('accepts up to seven decimal places and rejects eight', () => {
  assert.equal(isValidAmount('1.1234567'), true);
  assert.equal(isValidAmount('1.12345678'), false);
});

test('rejects scientific notation without numeric parsing', () => {
  assert.equal(isValidAmount('1e3'), false);
  assert.equal(isValidAmount('1E-3'), false);
});

test('counts memo text as UTF-8 bytes', () => {
  assert.equal(isValidMemoText('a'.repeat(28)), true);
  assert.equal(isValidMemoText('a'.repeat(29)), false);
  assert.equal(isValidMemoText('á'.repeat(20)), false);
});

test('accepts memo ID boundaries and rejects values above u64', () => {
  assert.equal(isValidMemoId('0'), true);
  assert.equal(isValidMemoId('18446744073709551615'), true);
  assert.equal(isValidMemoId('18446744073709551616'), false);
});

test('requires a valid issuer for non-XLM assets', () => {
  assert.equal(isValidAsset({ assetCode: 'USDC' }), false);
  assert.equal(
    isValidAsset({ assetCode: 'USDC', assetIssuer: 'GINVALID' }),
    false,
  );
  assert.equal(isValidAsset({ assetCode: 'USDC', assetIssuer: issuer }), true);
});

test('recognizes XLM as the native asset', () => {
  assert.equal(isValidAsset({ assetCode: 'XLM' }), true);
  assert.equal(isValidAsset({ assetCode: 'XLM', assetIssuer: issuer }), false);
});
