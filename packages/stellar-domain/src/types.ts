export type MemoType = 'TEXT' | 'ID';

export type StellarNetwork = 'PUBLIC' | 'TESTNET';

export interface StellarAsset {
  assetCode: string;
  assetIssuer?: string;
}

interface Sep7PaymentRequestBase extends StellarAsset {
  destination: string;
  amount: string;
  network: StellarNetwork;
}

interface Sep7PaymentRequestWithoutMemo extends Sep7PaymentRequestBase {
  memo?: never;
  memoType?: never;
}

interface Sep7PaymentRequestWithMemo extends Sep7PaymentRequestBase {
  memo: string;
  memoType: MemoType;
}

export type Sep7PaymentRequest =
  Sep7PaymentRequestWithoutMemo | Sep7PaymentRequestWithMemo;
