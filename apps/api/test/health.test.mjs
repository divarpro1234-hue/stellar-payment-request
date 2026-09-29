import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../dist/app.js';

globalThis.process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/stellar_test';

test('GET /api/v1/health returns HTTP 200 and ok', async () => {
  const app = await createApp();
  try {
    await app.listen(0, '127.0.0.1');
    const response = await globalThis.fetch(
      `${await app.getUrl()}/api/v1/health`,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  } finally {
    await app.close();
  }
});
