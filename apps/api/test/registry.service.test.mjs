import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import {
  Account,
  Address,
  Contract,
  Networks,
  StrKey,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { RegistryService } from '../dist/registry/registry.service.js';
import {
  SorobanAccountNotFoundError,
  SorobanRpcClient,
} from '../dist/registry/soroban-rpc.client.js';

const registrant = 'GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG';
const contractId = StrKey.encodeContract(Buffer.alloc(32, 1));
const request = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  requestHash: 'a'.repeat(64),
};
const signedTransaction = { xdr: 'freighter-signed-xdr' };

function makeService({
  requestResult = request,
  savedRegistration = null,
  onchainExists = false,
  transactionResult = { status: 'SUCCESS', ledger: 42 },
  rpcOverrides = {},
  rpcClient,
} = {}) {
  const writes = [];
  const calls = [];
  let currentRegistration = savedRegistration;
  const prisma = {
    paymentRequest: {
      findUnique: async () => requestResult,
    },
    onchainRegistration: {
      findUnique: async () => currentRegistration,
      upsert: async (args) => {
        writes.push({ kind: 'upsert', args });
        currentRegistration = {
          ...args.create,
          createdAt: new Date(),
        };
      },
      updateMany: async (args) => {
        writes.push({ kind: 'updateMany', args });
        if (
          currentRegistration?.paymentRequestId ===
            args.where.paymentRequestId &&
          currentRegistration?.txHash === args.where.txHash
        ) {
          currentRegistration = {
            ...currentRegistration,
            ...args.data,
          };
          return { count: 1 };
        }
        return { count: 0 };
      },
    },
  };
  const rpc = {
    contractId,
    networkPassphrase: Networks.TESTNET,
    getAccount: async () => ({ account: registrant }),
    isRegistered: async () => onchainExists,
    prepareRegistration: async (...args) => {
      calls.push({ method: 'prepareRegistration', args });
      return 'unsigned-soroban-xdr';
    },
    parseSignedRegistration: () => ({
      transaction: signedTransaction,
      registrant,
      requestHash: request.requestHash,
    }),
    sendTransaction: async () => ({
      status: 'PENDING',
      hash: 'stellar-tx-hash',
    }),
    getTransaction: async () => transactionResult,
    ...rpcOverrides,
  };
  return {
    service: new RegistryService(prisma, rpcClient ?? rpc),
    writes,
    rpc,
    calls,
  };
}

function makeSignedRegistrationXdr({
  source = registrant,
  signed = true,
} = {}) {
  const transaction = new TransactionBuilder(new Account(source, '1'), {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      new Contract(contractId).call(
        'register',
        new Address(registrant).toScVal(),
        xdr.ScVal.scvBytes(Buffer.from(request.requestHash, 'hex')),
      ),
    )
    .setTimeout(180)
    .build();
  const envelope = xdr.TransactionEnvelope.fromXDR(
    transaction.toXDR(),
    'base64',
  );
  const signatures = signed
    ? [
        new xdr.DecoratedSignature({
          hint: Buffer.alloc(4),
          signature: Buffer.alloc(64),
        }),
      ]
    : [];
  return xdr.TransactionEnvelope.envelopeTypeTx(
    new xdr.TransactionV1Envelope({
      tx: envelope.v1.tx,
      signatures,
    }),
  ).toXDR('base64');
}

function makeRpcClient() {
  return new SorobanRpcClient({
    get: (key) =>
      key === 'SOROBAN_CONTRACT_ID'
        ? contractId
        : key === 'STELLAR_NETWORK'
          ? 'testnet'
          : undefined,
  });
}

async function assertCode(promise, code, status) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.getStatus(), status);
    assert.equal(error.getResponse().code, code);
    return true;
  });
}

test('prepares an unsigned transaction for the stored request hash', async () => {
  const { service, calls } = makeService();
  const prepared = await service.prepare(request.id, registrant);

  assert.deepEqual(prepared, {
    xdr: 'unsigned-soroban-xdr',
    networkPassphrase: Networks.TESTNET,
    contractId,
    requestHash: request.requestHash,
  });
  assert.deepEqual(calls, [
    {
      method: 'prepareRegistration',
      args: [{ account: registrant }, registrant, request.requestHash],
    },
  ]);
});

test('rejects an invalid registrant before calling Soroban RPC', async () => {
  let rpcCalled = false;
  const { service } = makeService({
    rpcOverrides: { getAccount: async () => (rpcCalled = true) },
  });

  await assertCode(
    service.prepare(request.id, 'GINVALID'),
    'INVALID_REGISTRANT',
    400,
  );
  assert.equal(rpcCalled, false);
});

test('returns REQUEST_NOT_FOUND when the payment request does not exist', async () => {
  const { service } = makeService({ requestResult: null });
  await assertCode(
    service.prepare(request.id, registrant),
    'REQUEST_NOT_FOUND',
    404,
  );
});

test('detects an existing on-chain registration before preparation', async () => {
  const { service } = makeService({ onchainExists: true });
  await assertCode(
    service.prepare(request.id, registrant),
    'ALREADY_REGISTERED',
    409,
  );
});

test('maps Soroban preparation failures to SOROBAN_PREPARE_FAILED', async () => {
  const { service } = makeService({
    rpcOverrides: {
      getAccount: async () => {
        throw new Error('rpc down');
      },
    },
  });
  await assertCode(
    service.prepare(request.id, registrant),
    'SOROBAN_PREPARE_FAILED',
    502,
  );
});

test('maps a missing Stellar account to ACCOUNT_NOT_FOUND', async () => {
  const { service } = makeService({
    rpcOverrides: {
      getAccount: async () => {
        throw new SorobanAccountNotFoundError(registrant);
      },
    },
  });
  await assertCode(
    service.prepare(request.id, registrant),
    'ACCOUNT_NOT_FOUND',
    400,
  );
});

test('submits the exact parsed transaction and stores final ledger status', async () => {
  let submitted;
  const { service, writes } = makeService({
    rpcOverrides: {
      sendTransaction: async (transaction) => {
        submitted = transaction;
        return { status: 'PENDING', hash: 'stellar-tx-hash' };
      },
    },
  });

  const result = await service.submit(request.id, 'signed-xdr-from-freighter');

  assert.equal(submitted, signedTransaction);
  assert.deepEqual(result, {
    requestId: request.id,
    txHash: 'stellar-tx-hash',
    status: 'SUCCESS',
    ledger: 42,
  });
  assert.equal(writes[0].kind, 'upsert');
  assert.equal(writes[0].args.create.status, 'PENDING');
  assert.equal(writes[0].args.create.registrant, registrant);
  assert.equal(writes[1].kind, 'updateMany');
  assert.equal(writes[1].args.data.status, 'SUCCESS');
  assert.equal(writes[1].args.data.ledgerSequence, 42);
  assert.deepEqual(writes[1].args.where, {
    paymentRequestId: request.id,
    txHash: 'stellar-tx-hash',
  });
});

test('rejects a signed XDR that does not match the request', async () => {
  const { service } = makeService({
    rpcOverrides: {
      parseSignedRegistration: () => {
        throw new Error('wrong hash or contract');
      },
    },
  });
  await assertCode(
    service.submit(request.id, 'signed-xdr-for-another-request'),
    'INVALID_SIGNED_XDR',
    400,
  );
});

test('rejects a signed XDR when registrant differs from transaction source', async () => {
  const { service } = makeService({ rpcClient: makeRpcClient() });
  await assertCode(
    service.submit(
      request.id,
      makeSignedRegistrationXdr({
        source: 'GDFJHLAXAUMHA4OWPOB4P7YO72AQR2HMIUYFOXLXE2DZGM633K7HZDQP',
      }),
    ),
    'INVALID_SIGNED_XDR',
    400,
  );
});

test('rejects an XDR envelope without signatures with INVALID_SIGNED_XDR', async () => {
  const { service } = makeService({ rpcClient: makeRpcClient() });
  await assertCode(
    service.submit(request.id, makeSignedRegistrationXdr({ signed: false })),
    'INVALID_SIGNED_XDR',
    400,
  );
});

test('does not persist a TRY_AGAIN_LATER submission result', async () => {
  const { service, writes } = makeService({
    rpcOverrides: {
      sendTransaction: async () => ({
        status: 'TRY_AGAIN_LATER',
        hash: 'stellar-tx-hash',
      }),
    },
  });
  await assertCode(
    service.submit(request.id, 'signed-xdr'),
    'SOROBAN_SUBMIT_FAILED',
    502,
  );
  assert.deepEqual(writes, []);
});

test('persists failed transaction results and returns TRANSACTION_FAILED', async () => {
  const { service, writes } = makeService({
    transactionResult: { status: 'FAILED', ledger: 43 },
  });
  await assertCode(
    service.submit(request.id, 'signed-xdr'),
    'TRANSACTION_FAILED',
    409,
  );
  assert.equal(writes[1].args.data.status, 'FAILED');
  assert.equal(writes[1].args.data.ledgerSequence, 43);
});

test('returns persisted registration status from the read endpoint', async () => {
  const savedRegistration = {
    contractId,
    registrant,
    txHash: 'stellar-tx-hash',
    status: 'SUCCESS',
    ledgerSequence: 42n,
    registeredAt: new Date('2026-10-01T00:00:00.000Z'),
  };
  const { service } = makeService({ savedRegistration });
  const result = await service.get(request.id);

  assert.equal(result.requestHash, request.requestHash);
  assert.equal(result.registration.ledger, '42');
  assert.equal(result.registration.status, 'SUCCESS');
});

test('reconciles a pending registration to SUCCESS when RPC has the result', async () => {
  const savedRegistration = {
    id: 'registration-id',
    paymentRequestId: request.id,
    contractId,
    registrant,
    txHash: 'stellar-tx-hash',
    status: 'PENDING',
    ledgerSequence: null,
    registeredAt: null,
    createdAt: new Date(Date.now() - 5_000),
  };
  const { service, writes } = makeService({
    savedRegistration,
    transactionResult: { status: 'SUCCESS', ledger: 77 },
  });
  const result = await service.get(request.id);

  assert.equal(result.registration.status, 'SUCCESS');
  assert.equal(result.registration.ledger, '77');
  assert.equal(writes[0].kind, 'updateMany');
  assert.deepEqual(writes[0].args.where, {
    paymentRequestId: request.id,
    txHash: 'stellar-tx-hash',
  });
});

test('marks an expired PENDING registration FAILED after RPC NOT_FOUND', async () => {
  const savedRegistration = {
    id: 'registration-id',
    paymentRequestId: request.id,
    contractId,
    registrant,
    txHash: 'stellar-tx-hash',
    status: 'PENDING',
    ledgerSequence: null,
    registeredAt: null,
    createdAt: new Date(Date.now() - 181_000),
  };
  const { service, writes } = makeService({
    savedRegistration,
    transactionResult: { status: 'NOT_FOUND' },
  });
  const result = await service.get(request.id);

  assert.equal(result.registration.status, 'FAILED');
  assert.equal(writes[0].args.data.status, 'FAILED');
  assert.deepEqual(writes[0].args.where, {
    paymentRequestId: request.id,
    txHash: 'stellar-tx-hash',
  });
});

test('does not resubmit a registration already pending in the database', async () => {
  const { service } = makeService({
    savedRegistration: { status: 'PENDING' },
  });
  await assertCode(
    service.submit(request.id, 'signed-xdr'),
    'ALREADY_REGISTERED',
    409,
  );
});

test('maps an RPC submission rejection to SOROBAN_SUBMIT_FAILED', async () => {
  const { service } = makeService({
    rpcOverrides: {
      sendTransaction: async () => {
        throw new Error('rpc unavailable');
      },
    },
  });
  await assertCode(
    service.submit(request.id, 'signed-xdr'),
    'SOROBAN_SUBMIT_FAILED',
    502,
  );
});
