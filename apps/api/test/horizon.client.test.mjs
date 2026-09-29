import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HorizonAccountNotFoundError,
  HorizonClient,
  HorizonUnavailableError,
} from '../dist/trustlines/horizon.client.js';

const account = 'GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG';

function makeClient() {
  return new HorizonClient({
    get: () => 'https://horizon.example',
  });
}

test('maps Horizon 404 to account not found', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 404, ok: false });

  try {
    await assert.rejects(
      makeClient().getAccount(account),
      HorizonAccountNotFoundError,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('maps Horizon 5xx to a temporary availability error', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 503, ok: false });

  try {
    await assert.rejects(
      makeClient().getAccount(account),
      HorizonUnavailableError,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
