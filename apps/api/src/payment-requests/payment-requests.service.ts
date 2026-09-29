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
import { CreatePaymentRequestDto } from './create-payment-request.dto';

interface PaymentRequestResponse {
  requestId: string;
  network: StellarNetwork;
  uri: string;
  qrDataUrl: string;
  requestHash: string;
  trustline: null;
  warnings: string[];
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

function badRequest(code: PaymentRequestErrorCode, message: string): never {
  throw new BadRequestException({ code, message });
}

@Injectable()
export class PaymentRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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
    const qrDataUrl = await QRCode.toDataURL(uri, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
    });
    const paymentRequest = await this.prisma.paymentRequest.create({
      data: {
        requestHash,
        destinationHash,
        assetCode: dto.assetCode,
        assetIssuer: dto.assetIssuer ?? null,
        amount: dto.amount,
        memoType: dto.memoType ?? 'NONE',
        memoHash,
        network,
        trustlineStatus: 'UNKNOWN',
      },
      select: { id: true },
    });

    return {
      requestId: paymentRequest.id,
      network,
      uri,
      qrDataUrl,
      requestHash,
      trustline: null,
      warnings: ['Trustline status has not been checked.'],
    };
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
