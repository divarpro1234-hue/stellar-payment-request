import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  StrKey,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import type { Transaction } from '@stellar/stellar-sdk';

export interface RegistrationInvocation {
  transaction: Transaction;
  registrant: string;
  requestHash: string;
}

export class SorobanAccountNotFoundError extends Error {
  constructor(accountId: string) {
    super(`Stellar account ${accountId} was not found on Soroban RPC.`);
    this.name = 'SorobanAccountNotFoundError';
  }
}

@Injectable()
export class SorobanRpcClient {
  private server?: rpc.Server;

  constructor(private readonly configService: ConfigService) {}

  get contractId(): string {
    const contractId = this.configService.get<string>('SOROBAN_CONTRACT_ID');
    if (!contractId || !StrKey.isValidContract(contractId)) {
      throw new Error('SOROBAN_CONTRACT_ID must be a valid contract ID.');
    }
    return contractId;
  }

  get networkPassphrase(): string {
    const network = this.configService
      .get<string>('STELLAR_NETWORK', 'testnet')
      .toLowerCase();
    if (network === 'testnet') {
      return Networks.TESTNET;
    }
    if (network === 'public') {
      return Networks.PUBLIC;
    }
    throw new Error('STELLAR_NETWORK must be testnet or public.');
  }

  async getAccount(accountId: string): Promise<Account> {
    const accountKey = xdr.LedgerKey.account(
      new xdr.LedgerKeyAccount({
        accountId: Keypair.fromPublicKey(accountId).xdrPublicKey(),
      }),
    );
    let response;
    try {
      response = await this.getServer().getLedgerEntry(accountKey);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('failed to find an entry for key')
      ) {
        throw new SorobanAccountNotFoundError(accountId);
      }
      throw error;
    }
    if (response.val.type !== 'account') {
      throw new Error('Soroban RPC returned a non-account ledger entry.');
    }
    return new Account(accountId, response.val.value.seqNum.toString());
  }

  async isRegistered(account: Account, requestHash: string): Promise<boolean> {
    const simulationAccount = new Account(
      account.accountId(),
      account.sequenceNumber(),
    );
    const transaction = this.buildInvocation(simulationAccount, 'exists', [
      this.hashToScVal(requestHash),
    ]);
    const simulation = await this.getServer().simulateTransaction(transaction);
    if ('error' in simulation) {
      throw new Error(simulation.error);
    }
    if (!('result' in simulation) || !simulation.result?.retval) {
      throw new Error(
        'Soroban RPC did not return the registry existence value.',
      );
    }
    return scValToNative(simulation.result.retval) === true;
  }

  async prepareRegistration(
    account: Account,
    registrant: string,
    requestHash: string,
  ): Promise<string> {
    const transaction = this.buildInvocation(account, 'register', [
      new Address(registrant).toScVal(),
      this.hashToScVal(requestHash),
    ]);
    const prepared = await this.getServer().prepareTransaction(transaction);
    return prepared.toXDR();
  }

  parseSignedRegistration(
    signedXdr: string,
    requestHash: string,
  ): RegistrationInvocation {
    const envelope = xdr.TransactionEnvelope.fromXDR(signedXdr, 'base64');
    if (envelope.type !== 'envelopeTypeTx') {
      throw new Error('Expected a standard transaction envelope.');
    }
    const transaction = envelope.v1.tx;
    if (
      transaction.operations.length !== 1 ||
      envelope.v1.signatures.length === 0
    ) {
      throw new Error('Expected a single Soroban contract invocation.');
    }

    const operation = transaction.operations[0];
    if (operation.body.type !== 'invokeHostFunction') {
      throw new Error('Expected a Soroban contract invocation.');
    }
    const hostFunction = operation.body.invokeHostFunctionOp.hostFunction;
    if (hostFunction.type !== 'hostFunctionTypeInvokeContract') {
      throw new Error('Expected a contract function invocation.');
    }

    const invocation = hostFunction.invokeContract;
    const expectedContract = new Address(this.contractId).toScAddress();
    const argumentsList = invocation.args;
    if (argumentsList.length !== 2) {
      throw new Error('Expected registrant and request hash arguments.');
    }
    const registrant = Address.fromScVal(argumentsList[0]).toString();
    const expectedHash = this.hashToScVal(requestHash);
    const parsedTransaction = TransactionBuilder.fromXDR(
      signedXdr,
      this.networkPassphrase,
    ) as Transaction;
    if (
      !Buffer.from(invocation.contractAddress.toXDR()).equals(
        Buffer.from(expectedContract.toXDR()),
      ) ||
      invocation.functionName.toString() !== 'register' ||
      !Buffer.from(argumentsList[1].toXDR()).equals(
        Buffer.from(expectedHash.toXDR()),
      ) ||
      parsedTransaction.source !== registrant
    ) {
      throw new Error('Signed XDR does not match the expected registration.');
    }

    return {
      transaction: parsedTransaction,
      registrant,
      requestHash,
    };
  }

  async sendTransaction(transaction: Transaction) {
    return this.getServer().sendTransaction(transaction);
  }

  async getTransaction(hash: string) {
    return this.getServer().getTransaction(hash);
  }

  private buildInvocation(
    account: Account,
    method: string,
    args: xdr.ScVal[],
  ): Transaction {
    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(new Contract(this.contractId).call(method, ...args))
      .setTimeout(180)
      .build();
  }

  private hashToScVal(requestHash: string): xdr.ScVal {
    if (!/^[\da-f]{64}$/i.test(requestHash)) {
      throw new Error('Request hash must be a 64-character hexadecimal value.');
    }

    return xdr.ScVal.scvBytes(Buffer.from(requestHash, 'hex'));
  }

  private getServer(): rpc.Server {
    if (this.server) {
      return this.server;
    }
    const rpcUrl = this.configService.get<string>('SOROBAN_RPC_URL');
    if (!rpcUrl) {
      throw new Error('SOROBAN_RPC_URL is not configured.');
    }
    this.server = new rpc.Server(rpcUrl);
    return this.server;
  }
}
