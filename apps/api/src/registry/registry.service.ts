import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { isValidStellarAccount } from '@stellar-payment-request/stellar-domain';
import { PrismaService } from '../database/prisma.service';
import {
  SorobanAccountNotFoundError,
  SorobanRpcClient,
} from './soroban-rpc.client';
import type { RegistrationInvocation } from './soroban-rpc.client';

const RESULT_TIMEOUT_MS = 30_000;
const RESULT_POLL_INTERVAL_MS = 1_000;
const TRANSACTION_TIMEOUT_MS = 180_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function codedError(
  Exception: new (response: { code: string; message: string }) => HttpException,
  code: string,
  message: string,
): HttpException {
  return new Exception({ code, message });
}

@Injectable()
export class RegistryService {
  private readonly logger = new Logger(RegistryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sorobanRpc: SorobanRpcClient,
  ) {}

  async prepare(requestId: string, registrant: string) {
    if (!isValidStellarAccount(registrant)) {
      throw codedError(
        BadRequestException,
        'INVALID_REGISTRANT',
        'registrant must be a valid Stellar G... account.',
      );
    }

    const paymentRequest = await this.findRequest(requestId);
    const savedRegistration = await this.reconcilePending(paymentRequest.id);
    if (savedRegistration && savedRegistration.status !== 'FAILED') {
      throw codedError(
        ConflictException,
        'ALREADY_REGISTERED',
        'This payment request already has an on-chain registration.',
      );
    }

    try {
      const account = await this.sorobanRpc.getAccount(registrant);
      if (
        await this.sorobanRpc.isRegistered(account, paymentRequest.requestHash)
      ) {
        throw codedError(
          ConflictException,
          'ALREADY_REGISTERED',
          'This payment request is already registered on-chain.',
        );
      }
      const xdr = await this.sorobanRpc.prepareRegistration(
        account,
        registrant,
        paymentRequest.requestHash,
      );
      return {
        xdr,
        networkPassphrase: this.sorobanRpc.networkPassphrase,
        contractId: this.sorobanRpc.contractId,
        requestHash: paymentRequest.requestHash,
      };
    } catch (error) {
      if (error instanceof SorobanAccountNotFoundError) {
        throw codedError(
          BadRequestException,
          'ACCOUNT_NOT_FOUND',
          'The registrant account does not exist on the selected Stellar network.',
        );
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw codedError(
        BadGatewayException,
        'SOROBAN_PREPARE_FAILED',
        'Soroban could not prepare the registration transaction.',
      );
    }
  }

  async submit(requestId: string, signedXdr: string) {
    const paymentRequest = await this.findRequest(requestId);
    const savedRegistration = await this.reconcilePending(paymentRequest.id);
    if (savedRegistration && savedRegistration.status !== 'FAILED') {
      throw codedError(
        ConflictException,
        'ALREADY_REGISTERED',
        'This payment request already has an on-chain registration.',
      );
    }

    let invocation: RegistrationInvocation;
    try {
      invocation = this.sorobanRpc.parseSignedRegistration(
        signedXdr,
        paymentRequest.requestHash,
      );
      if (!isValidStellarAccount(invocation.registrant)) {
        throw new Error('Invalid registrant in signed XDR.');
      }
    } catch {
      throw codedError(
        BadRequestException,
        'INVALID_SIGNED_XDR',
        'Signed XDR is invalid or does not match the expected payment request.',
      );
    }

    let sendResult;
    try {
      sendResult = await this.sorobanRpc.sendTransaction(
        invocation.transaction,
      );
    } catch {
      throw codedError(
        BadGatewayException,
        'SOROBAN_SUBMIT_FAILED',
        'Soroban RPC rejected the signed transaction.',
      );
    }

    if (sendResult.status === 'ERROR') {
      const resultType = sendResult.errorResult?.result.type;
      const rpcResultCode = resultType
        ? `tx${resultType
            .slice(2)
            .replace(/[A-Z]/g, (letter) => `_${letter}`)
            .replace(/^_/, '')
            .toUpperCase()}`
        : undefined;
      this.logger.warn(
        `Soroban RPC rejected registration: ${rpcResultCode ?? 'UNKNOWN'}`,
      );
      throw new BadGatewayException({
        code: 'SOROBAN_SUBMIT_FAILED',
        message: 'Soroban RPC could not accept the signed transaction.',
        ...(rpcResultCode ? { rpcResultCode } : {}),
      });
    }

    if (sendResult.status === 'TRY_AGAIN_LATER') {
      throw codedError(
        BadGatewayException,
        'SOROBAN_SUBMIT_FAILED',
        'Soroban RPC could not accept the signed transaction.',
      );
    }

    await this.prisma.onchainRegistration.upsert({
      where: { paymentRequestId: paymentRequest.id },
      create: {
        paymentRequestId: paymentRequest.id,
        contractId: this.sorobanRpc.contractId,
        registrant: invocation.registrant,
        txHash: sendResult.hash,
        status: 'PENDING',
      },
      update: {
        contractId: this.sorobanRpc.contractId,
        registrant: invocation.registrant,
        txHash: sendResult.hash,
        status: 'PENDING',
        createdAt: new Date(),
        ledgerSequence: null,
        registeredAt: null,
      },
    });

    const result = await this.waitForResult(sendResult.hash);
    await this.prisma.onchainRegistration.updateMany({
      where: {
        paymentRequestId: paymentRequest.id,
        txHash: sendResult.hash,
      },
      data: {
        status: result.status,
        ledgerSequence: result.ledger ?? null,
        registeredAt: result.status === 'SUCCESS' ? new Date() : null,
      },
    });

    if (result.status === 'FAILED') {
      throw codedError(
        ConflictException,
        'TRANSACTION_FAILED',
        'The Stellar transaction failed on-chain.',
      );
    }

    return {
      requestId,
      txHash: sendResult.hash,
      status: result.status,
      ledger: result.ledger ?? null,
    };
  }

  async get(requestId: string) {
    const paymentRequest = await this.findRequest(requestId);
    const registration = await this.reconcilePending(paymentRequest.id);
    return {
      requestId,
      requestHash: paymentRequest.requestHash,
      registration: registration
        ? {
            contractId: registration.contractId,
            registrant: registration.registrant,
            txHash: registration.txHash,
            status: registration.status,
            ledger: registration.ledgerSequence?.toString() ?? null,
            registeredAt: registration.registeredAt,
          }
        : null,
    };
  }

  private async findRequest(requestId: string) {
    if (!UUID_PATTERN.test(requestId)) {
      throw codedError(
        NotFoundException,
        'REQUEST_NOT_FOUND',
        'Payment request was not found.',
      );
    }

    const request = await this.prisma.paymentRequest.findUnique({
      where: { id: requestId },
      select: { id: true, requestHash: true },
    });
    if (!request) {
      throw codedError(
        NotFoundException,
        'REQUEST_NOT_FOUND',
        'Payment request was not found.',
      );
    }
    return request;
  }

  private async reconcilePending(paymentRequestId: string) {
    const registration = await this.prisma.onchainRegistration.findUnique({
      where: { paymentRequestId },
    });
    if (
      !registration ||
      registration.status !== 'PENDING' ||
      !registration.txHash
    ) {
      return registration;
    }

    try {
      const result = await this.sorobanRpc.getTransaction(registration.txHash);
      if (result.status === 'SUCCESS' || result.status === 'FAILED') {
        await this.prisma.onchainRegistration.updateMany({
          where: {
            paymentRequestId,
            txHash: registration.txHash,
          },
          data: {
            status: result.status,
            ledgerSequence:
              'ledger' in result && typeof result.ledger === 'number'
                ? result.ledger
                : null,
            registeredAt: result.status === 'SUCCESS' ? new Date() : null,
          },
        });
      } else if (
        result.status === 'NOT_FOUND' &&
        Date.now() - registration.createdAt.getTime() > TRANSACTION_TIMEOUT_MS
      ) {
        await this.prisma.onchainRegistration.updateMany({
          where: {
            paymentRequestId,
            txHash: registration.txHash,
          },
          data: {
            status: 'FAILED',
            ledgerSequence: null,
            registeredAt: null,
          },
        });
      }
    } catch {
      return registration;
    }

    return this.prisma.onchainRegistration.findUnique({
      where: { paymentRequestId },
    });
  }

  private async waitForResult(hash: string): Promise<{
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    ledger?: number;
  }> {
    const deadline = Date.now() + RESULT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const response = await this.sorobanRpc.getTransaction(hash);
        if (response.status === 'SUCCESS' || response.status === 'FAILED') {
          return {
            status: response.status,
            ...('ledger' in response && typeof response.ledger === 'number'
              ? { ledger: response.ledger }
              : {}),
          };
        }
      } catch {
        await new Promise((resolve) =>
          setTimeout(resolve, RESULT_POLL_INTERVAL_MS),
        );
        continue;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RESULT_POLL_INTERVAL_MS),
      );
    }
    return { status: 'PENDING' };
  }
}
