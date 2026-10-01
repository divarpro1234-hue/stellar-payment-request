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

test('allows the local Next.js origin when FRONTEND_ORIGIN is unset', async () => {
  const configuredOrigin = globalThis.process.env.FRONTEND_ORIGIN;
  delete globalThis.process.env.FRONTEND_ORIGIN;
  const app = await createApp();

  try {
    await app.listen(0, '127.0.0.1');
    const response = await globalThis.fetch(
      `${await app.getUrl()}/api/v1/health`,
      {
        headers: { Origin: 'http://localhost:3000' },
      },
    );
    assert.equal(
      response.headers.get('access-control-allow-origin'),
      'http://localhost:3000',
    );
  } finally {
    if (configuredOrigin === undefined) {
      delete globalThis.process.env.FRONTEND_ORIGIN;
    } else {
      globalThis.process.env.FRONTEND_ORIGIN = configuredOrigin;
    }
    await app.close();
  }
});
