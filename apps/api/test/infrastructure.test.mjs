import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../dist/app.js';

globalThis.process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/stellar_test';
globalThis.process.env.FRONTEND_ORIGIN = 'https://frontend.example';

test('configures Swagger, Helmet, CORS and uniform HTTP errors', async () => {
  const app = await createApp();

  try {
    await app.listen(0, '127.0.0.1');
    const baseUrl = await app.getUrl();

    const healthResponse = await globalThis.fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: 'https://frontend.example' },
    });
    assert.equal(
      healthResponse.headers.get('access-control-allow-origin'),
      'https://frontend.example',
    );
    assert.equal(
      healthResponse.headers.get('x-content-type-options'),
      'nosniff',
    );

    const docsResponse = await globalThis.fetch(`${baseUrl}/api/docs`);
    assert.equal(docsResponse.status, 200);
    assert.match(docsResponse.headers.get('content-type') ?? '', /text\/html/);

    const notFoundResponse = await globalThis.fetch(
      `${baseUrl}/api/v1/not-found`,
    );
    assert.equal(notFoundResponse.status, 404);
    const error = await notFoundResponse.json();
    assert.equal(error.statusCode, 404);
    assert.equal(error.path, '/api/v1/not-found');
    assert.equal(typeof error.timestamp, 'string');
    assert.ok(error.message);
  } finally {
    await app.close();
  }
});
