import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
  limit?: string;
  is_authorized?: boolean;
  is_authorized_to_maintain_liabilities?: boolean;
}

export interface HorizonAccount {
  balances: HorizonBalance[];
}

export class HorizonAccountNotFoundError extends Error {
  constructor(account: string) {
    super(`Stellar account ${account} was not found on Horizon.`);
    this.name = 'HorizonAccountNotFoundError';
  }
}

export class HorizonUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HorizonUnavailableError';
  }
}

@Injectable()
export class HorizonClient {
  constructor(private readonly configService: ConfigService) {}

  async getAccount(account: string): Promise<HorizonAccount> {
    const horizonUrl = this.configService.get<string>('HORIZON_URL');

    if (!horizonUrl) {
      throw new HorizonUnavailableError('HORIZON_URL is not configured.');
    }

    let response: Response;

    try {
      const url = new URL(
        `/accounts/${encodeURIComponent(account)}`,
        horizonUrl,
      );
      response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new HorizonUnavailableError('Horizon could not be reached.');
    }

    if (response.status === 404) {
      throw new HorizonAccountNotFoundError(account);
    }

    if (!response.ok) {
      throw new HorizonUnavailableError(
        `Horizon returned HTTP ${response.status}.`,
      );
    }

    try {
      const accountData: unknown = await response.json();

      if (
        typeof accountData !== 'object' ||
        accountData === null ||
        !('balances' in accountData) ||
        !Array.isArray(accountData.balances)
      ) {
        throw new Error('Malformed Horizon account response.');
      }

      return accountData as HorizonAccount;
    } catch {
      throw new HorizonUnavailableError(
        'Horizon returned an invalid account response.',
      );
    }
  }
}
