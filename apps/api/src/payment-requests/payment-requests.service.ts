import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NATIVE_ASSET_CODE,
  buildSep7Uri,
  isValidAmount,
  isValidAsset,
  isValidMemo,
  isValidStellarAccount,
} from '@stellar-payment-request/stellar-domain';
import type {
  Sep7PaymentRequest,
  StellarNetwork,
} from '@stellar-payment-request/stellar-domain';
import QRCode from 'qrcode';
import { PrismaService } from '../database/prisma.service';
import {
  HorizonAccountNotFoundError,
  HorizonUnavailableError,
} from '../trustlines/horizon.client';
import type {
  PaymentRequestTrustlineWarning,
  TrustlineResult,
} from '../trustlines/trustline.types';
import { TrustlinesService } from '../trustlines/trustlines.service';
import { CreatePaymentRequestDto } from './create-payment-request.dto';

interface PaymentRequestResponse {
  requestId: string;
  existing: boolean;
  network: StellarNetwork;
  uri: string;
  qrDataUrl: string;
  requestHash: string;
  trustline: TrustlineResult | null;
  warnings: PaymentRequestTrustlineWarning[];
}

type PaymentRequestErrorCode =
  | 'INVALID_DESTINATION'
  | 'INVALID_AMOUNT'
  | 'MEMO_TOO_LONG'
  | 'INVALID_MEMO_ID'
  | 'ASSET_ISSUER_REQUIRED'
  | 'INVALID_ASSET_ISSUER'
  | 'INVALID_MEMO';

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function isUniqueConstraintError(error: unknown): error is { code: 'P2002' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function badRequest(code: PaymentRequestErrorCode, message: string): never {
  throw new BadRequestException({ code, message });
}

@Injectable()
export class PaymentRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly trustlinesService: TrustlinesService,
  ) {}

  async create(dto: CreatePaymentRequestDto): Promise<PaymentRequestResponse> {
    this.validate(dto);

    const network = this.getNetwork();
    const requestBase = {
      destination: dto.destination,
      assetCode: dto.assetCode,
      ...(dto.assetIssuer === undefined
        ? {}
        : { assetIssuer: dto.assetIssuer }),
      amount: dto.amount,
      network,
    };
    const request: Sep7PaymentRequest =
      dto.memo !== undefined && dto.memoType !== undefined
        ? { ...requestBase, memo: dto.memo, memoType: dto.memoType }
        : requestBase;
    const uri = buildSep7Uri(request);
    const requestHash = sha256(uri);
    const destinationHash = sha256(dto.destination);
    const memoHash = dto.memo === undefined ? null : sha256(dto.memo);
    const { trustline, warnings } = await this.checkTrustline(dto);
    const qrDataUrl = await QRCode.toDataURL(uri, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
    });
    const existingRequest = await this.prisma.paymentRequest.findUnique({
      where: { requestHash },
      select: { id: true },
    });
    if (existingRequest) {
      return this.buildResponse(existingRequest.id, true, {
        network,
        uri,
        qrDataUrl,
        requestHash,
        trustline,
        warnings,
      });
    }

    let paymentRequest: { id: string };
    try {
      paymentRequest = await this.prisma.paymentRequest.create({
        data: {
          requestHash,
          destinationHash,
          assetCode: dto.assetCode,
          assetIssuer: dto.assetIssuer ?? null,
          amount: dto.amount,
          memoType: dto.memoType ?? 'NONE',
          memoHash,
          network,
          trustlineStatus: this.getTrustlineStatus(trustline),
        },
        select: { id: true },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const racedRequest = await this.prisma.paymentRequest.findUnique({
        where: { requestHash },
        select: { id: true },
      });
      if (!racedRequest) {
        throw error;
      }

      return this.buildResponse(racedRequest.id, true, {
        network,
        uri,
        qrDataUrl,
        requestHash,
        trustline,
        warnings,
      });
    }

    return this.buildResponse(paymentRequest.id, false, {
      network,
      uri,
      qrDataUrl,
      requestHash,
      trustline,
      warnings,
    });
  }

  private buildResponse(
    requestId: string,
    existing: boolean,
    response: Omit<PaymentRequestResponse, 'requestId' | 'existing'>,
  ): PaymentRequestResponse {
    return { requestId, existing, ...response };
  }

  private async checkTrustline(dto: CreatePaymentRequestDto): Promise<{
    trustline: TrustlineResult | null;
    warnings: PaymentRequestTrustlineWarning[];
  }> {
    try {
      const trustline = await this.trustlinesService.check({
        account: dto.destination,
        assetCode: dto.assetCode,
        ...(dto.assetIssuer === undefined
          ? {}
          : { assetIssuer: dto.assetIssuer }),
      });

      if (!trustline.required || trustline.authorized) {
        return { trustline, warnings: [] };
      }

      return {
        trustline,
        warnings: [
          trustline.exists ? 'UNAUTHORIZED_TRUSTLINE' : 'MISSING_TRUSTLINE',
        ],
      };
    } catch (error) {
      if (error instanceof HorizonAccountNotFoundError) {
        return { trustline: null, warnings: ['ACCOUNT_NOT_FOUND'] };
      }

      if (error instanceof HorizonUnavailableError) {
        return { trustline: null, warnings: ['TRUSTLINE_CHECK_UNAVAILABLE'] };
      }

      throw error;
    }
  }

  private getTrustlineStatus(trustline: TrustlineResult | null): string {
    if (!trustline) {
      return 'UNKNOWN';
    }

    if (!trustline.required) {
      return 'NOT_REQUIRED';
    }

    if (!trustline.exists) {
      return 'MISSING';
    }

    return trustline.authorized ? 'AUTHORIZED' : 'UNAUTHORIZED';
  }

  private validate(dto: CreatePaymentRequestDto): void {
    if (!isValidStellarAccount(dto.destination)) {
      badRequest(
        'INVALID_DESTINATION',
        'Destination must be a valid Stellar account public key.',
      );
    }

    if (!isValidAmount(dto.amount)) {
      badRequest(
        'INVALID_AMOUNT',
        'Amount must be positive and have at most seven decimal places.',
      );
    }

    if (!isValidAsset(dto)) {
      if (
        dto.assetCode !== NATIVE_ASSET_CODE &&
        dto.assetIssuer === undefined
      ) {
        badRequest(
          'ASSET_ISSUER_REQUIRED',
          'An issuer is required for non-native assets.',
        );
      }

      badRequest(
        'INVALID_ASSET_ISSUER',
        'Asset issuer must be a valid Stellar account; XLM must not include an issuer.',
      );
    }

    if ((dto.memo === undefined) !== (dto.memoType === undefined)) {
      badRequest(
        'INVALID_MEMO',
        'memo and memoType must be provided together.',
      );
    }

    if (
      dto.memo !== undefined &&
      dto.memoType !== undefined &&
      !isValidMemo(dto.memo, dto.memoType)
    ) {
      if (dto.memoType === 'TEXT') {
        badRequest('MEMO_TOO_LONG', 'Text memo cannot exceed 28 UTF-8 bytes.');
      }

      badRequest(
        'INVALID_MEMO_ID',
        'Memo ID must be an unsigned 64-bit integer.',
      );
    }
  }

  private getNetwork(): StellarNetwork {
    const network = this.configService.get<string>(
      'STELLAR_NETWORK',
      'TESTNET',
    );

    if (network === 'PUBLIC' || network === 'TESTNET') {
      return network;
    }

    throw new InternalServerErrorException(
      'STELLAR_NETWORK must be PUBLIC or TESTNET.',
    );
  }
}
