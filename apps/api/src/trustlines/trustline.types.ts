export interface TrustlineCheckQuery {
  account: string;
  assetCode: string;
  assetIssuer?: string;
}

export interface TrustlineResult extends TrustlineCheckQuery {
  required: boolean;
  exists: boolean;
  authorized: boolean;
  balance?: string;
  limit?: string;
}

export type PaymentRequestTrustlineWarning =
  | 'MISSING_TRUSTLINE'
  | 'UNAUTHORIZED_TRUSTLINE'
  | 'ACCOUNT_NOT_FOUND'
  | 'TRUSTLINE_CHECK_UNAVAILABLE';
