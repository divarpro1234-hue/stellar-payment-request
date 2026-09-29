import { BadRequestException, Injectable } from '@nestjs/common';
import {
  NATIVE_ASSET_CODE,
  isValidAsset,
  isValidStellarAccount,
} from '@stellar-payment-request/stellar-domain';
import { HorizonClient } from './horizon.client';
import type { TrustlineCheckQuery, TrustlineResult } from './trustline.types';

@Injectable()
export class TrustlinesService {
  constructor(private readonly horizonClient: HorizonClient) {}

  async check(query: TrustlineCheckQuery): Promise<TrustlineResult> {
    if (!isValidStellarAccount(query.account)) {
      throw new BadRequestException({
        code: 'INVALID_ACCOUNT',
        message: 'Account must be a valid Stellar account public key.',
      });
    }

    if (query.assetCode === NATIVE_ASSET_CODE) {
      if (!isValidAsset(query)) {
        throw new BadRequestException({
          code: 'INVALID_ASSET_ISSUER',
          message: 'XLM must not include an asset issuer.',
        });
      }

      return {
        account: query.account,
        assetCode: query.assetCode,
        required: false,
        exists: true,
        authorized: true,
      };
    }

    if (query.assetIssuer === undefined) {
      throw new BadRequestException({
        code: 'ASSET_ISSUER_REQUIRED',
        message: 'An issuer is required for non-native assets.',
      });
    }

    if (!isValidAsset(query)) {
      throw new BadRequestException({
        code: 'INVALID_ASSET_ISSUER',
        message: 'Asset issuer must be a valid Stellar account public key.',
      });
    }

    const horizonAccount = await this.horizonClient.getAccount(query.account);
    const balance = horizonAccount.balances.find(
      (entry) =>
        entry.asset_code === query.assetCode &&
        entry.asset_issuer === query.assetIssuer,
    );

    if (!balance) {
      return {
        ...query,
        required: true,
        exists: false,
        authorized: false,
      };
    }

    return {
      ...query,
      required: true,
      exists: true,
      authorized:
        balance.is_authorized !== false &&
        balance.is_authorized_to_maintain_liabilities !== false,
      balance: balance.balance,
      ...(balance.limit === undefined ? {} : { limit: balance.limit }),
    };
  }
}
