import {
  NATIVE_ASSET_CODE,
  SEP7_SCHEME,
  TESTNET_NETWORK_PASSPHRASE,
} from './constants';
import type { MemoType, Sep7PaymentRequest } from './types';
import {
  isValidAmount,
  isValidAsset,
  isValidMemo,
  isValidStellarAccount,
} from './validation';

const SEP7_MEMO_TYPES: Record<MemoType, 'MEMO_TEXT' | 'MEMO_ID'> = {
  TEXT: 'MEMO_TEXT',
  ID: 'MEMO_ID',
};

function encodeParameter(name: string, value: string): string {
  return `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
}

export function buildSep7Uri(request: Sep7PaymentRequest): string {
  if (!isValidStellarAccount(request.destination)) {
    throw new Error('Invalid Stellar destination account');
  }

  if (!isValidAmount(request.amount)) {
    throw new Error('Invalid payment amount');
  }

  if (!isValidAsset(request)) {
    throw new Error('Invalid Stellar asset');
  }

  if (
    request.memo !== undefined &&
    !isValidMemo(request.memo, request.memoType)
  ) {
    throw new Error('Invalid payment memo');
  }

  const parameters: Array<[string, string]> = [
    ['destination', request.destination],
    ['amount', request.amount],
  ];

  if (request.assetCode !== NATIVE_ASSET_CODE) {
    parameters.push(['asset_code', request.assetCode]);
    parameters.push(['asset_issuer', request.assetIssuer!]);
  }

  if (request.memo !== undefined) {
    parameters.push(['memo', request.memo]);
    parameters.push(['memo_type', SEP7_MEMO_TYPES[request.memoType]]);
  }

  if (request.network === 'TESTNET') {
    parameters.push(['network_passphrase', TESTNET_NETWORK_PASSPHRASE]);
  }

  const query = parameters
    .map(([name, value]) => encodeParameter(name, value))
    .join('&');

  return `${SEP7_SCHEME}?${query}`;
}
