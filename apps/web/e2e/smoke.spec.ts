import { expect, test } from '@playwright/test';

const destination = 'GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG';
const requestHash = 'a'.repeat(64);
const paymentRequest = {
  requestId: '123e4567-e89b-42d3-a456-426614174000',
  existing: false,
  network: 'TESTNET',
  uri: `web+stellar:pay?destination=${destination}&amount=2.5&network_passphrase=Test%20SDF%20Network%20%3B%20September%202015`,
  requestHash,
  trustline: {
    required: false,
    exists: true,
    authorized: true,
  },
  warnings: [],
};

test('loads the landing page and navigates between the tools', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Generador de solicitud de pago para Stellar',
    }),
  ).toBeVisible();

  await page
    .getByRole('link', { name: /Crear solicitud/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/app\/request$/);
  await expect(
    page.getByRole('heading', { name: 'Genera una solicitud SEP-7' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Calculadora' }).click();
  await expect(page).toHaveURL(/\/app\/calculator$/);
  await expect(
    page.getByRole('heading', { name: 'Calcula el valor de XLM' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Trustline' }).click();
  await expect(
    page.getByRole('heading', { name: 'Comprueba una trustline' }),
  ).toBeVisible();
});

test('rejects an invalid request form without calling the API', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) apiRequests.push(request.url());
  });
  await page.goto('/app/request');
  await page.getByLabel('Cuenta de destino').fill('GINVALID');
  await page.getByLabel('Importe').fill('1');
  await page.getByRole('button', { name: 'Crear solicitud' }).click();

  await expect(
    page.getByText('Introduce una cuenta Stellar G... válida.'),
  ).toBeVisible();
  expect(apiRequests).toHaveLength(0);
});

test('rejects an invalid calculator amount without calling the API', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) apiRequests.push(request.url());
  });
  await page.goto('/app/calculator');
  await page.getByLabel('Importe en XLM').fill('0');
  await page.getByRole('button', { name: 'Calcular referencia' }).click();

  await expect(
    page.getByText('Usa un importe positivo con hasta 7 decimales.'),
  ).toBeVisible();
  expect(apiRequests).toHaveLength(0);
});

test('renders a calculator result from a mocked API response', async ({
  page,
}) => {
  await page.route('**/api/v1/calculator/xlm-usd**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        amountXlm: '10.5',
        priceUsd: '0.25',
        valueUsd: '2.625',
        source: 'CoinGecko',
        fetchedAt: '2026-10-01T12:00:00.000Z',
        cached: false,
      }),
    });
  });

  await page.goto('/app/calculator');
  await page.getByLabel('Importe en XLM').fill('10.5');
  await page.getByRole('button', { name: 'Calcular referencia' }).click();

  await expect(
    page.getByRole('heading', { name: 'Conversión estimada' }),
  ).toBeVisible();
  await expect(page.getByText('$2.625')).toBeVisible();
  await expect(page.getByText('CoinGecko', { exact: true })).toBeVisible();
});

test('renders the mocked SEP-7 URI, hash, and generated QR', async ({
  page,
}) => {
  await page.route('**/api/v1/payment-requests', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(paymentRequest),
    });
  });
  await page.route('**/api/v1/registry/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        requestId: paymentRequest.requestId,
        requestHash,
        registration: null,
      }),
    });
  });

  await page.goto('/app/request');
  await page.getByLabel('Cuenta de destino').fill(destination);
  await page.getByLabel('Importe').fill('2.5');
  await page.getByRole('button', { name: 'Crear solicitud' }).click();

  await expect(
    page.getByRole('heading', { name: 'Solicitud lista' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: paymentRequest.uri }),
  ).toBeVisible();
  await expect(page.getByText(requestHash)).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Código QR de la URI SEP-7' }),
  ).toBeVisible();
});

test('keeps the tool layout within a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/request');
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );

  expect(scrollWidth).toBeLessThanOrEqual(390);
  await expect(page.getByLabel('Cuenta de destino')).toBeVisible();
});
