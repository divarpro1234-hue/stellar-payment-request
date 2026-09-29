import { StrKey } from '@stellar/stellar-sdk';
import {
  MAX_MEMO_ID,
  MAX_MEMO_TEXT_BYTES,
  NATIVE_ASSET_CODE,
} from './constants';
import type { MemoType, StellarAsset } from './types';

const DECIMAL_AMOUNT_PATTERN = /^\d+(?:\.\d{1,7})?$/;
const UNSIGNED_INTEGER_PATTERN = /^\d+$/;

export function isValidStellarAccount(value: string): boolean {
  return StrKey.isValidEd25519PublicKey(value);
}

export function isValidAmount(value: string): boolean {
  return DECIMAL_AMOUNT_PATTERN.test(value) && /[1-9]/.test(value);
}

export function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function isValidMemoText(value: string): boolean {
  return getUtf8ByteLength(value) <= MAX_MEMO_TEXT_BYTES;
}

export function isValidMemoId(value: string): boolean {
  if (!UNSIGNED_INTEGER_PATTERN.test(value)) {
    return false;
  }

  return BigInt(value) <= MAX_MEMO_ID;
}

export function isValidMemo(value: string, type: MemoType): boolean {
  return type === 'TEXT' ? isValidMemoText(value) : isValidMemoId(value);
}

export function isValidAsset({
  assetCode,
  assetIssuer,
}: StellarAsset): boolean {
  if (assetCode === NATIVE_ASSET_CODE) {
    return true;
  }

  return assetIssuer !== undefined && isValidStellarAccount(assetIssuer);
}
