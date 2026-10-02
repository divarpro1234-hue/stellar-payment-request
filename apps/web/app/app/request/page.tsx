'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FilePlus2,
  LoaderCircle,
  QrCode,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ApiError, apiRequest, getApiErrorMessage } from '../../lib/api';
import { paymentRequestSchema } from '../../lib/validation';
import type { PaymentRequestInput } from '../../lib/validation';
import { FieldError } from '../../components/field-error';
import { RegistryPanel } from '../../components/registry-panel';
import { StatusMessage } from '../../components/status-message';
import type { StatusKind } from '../../components/status-message';

interface PaymentRequestResult {
  requestId: string;
  existing: boolean;
  network: 'TESTNET' | 'PUBLIC';
  uri: string;
  qrDataUrl?: string;
  requestHash: string;
  trustline: {
    required: boolean;
    exists: boolean;
    authorized: boolean;
  } | null;
  warnings: string[];
}

const warningMessages: Record<string, string> = {
  MISSING_TRUSTLINE: 'El destino aún no tiene trustline para este activo.',
  UNAUTHORIZED_TRUSTLINE:
    'La trustline existe, pero no está autorizada para recibir el activo.',
  ACCOUNT_NOT_FOUND: 'No se pudo encontrar la cuenta de destino en Horizon.',
  TRUSTLINE_CHECK_UNAVAILABLE:
    'No se pudo consultar la trustline en este momento.',
};

export default function RequestPage() {
  const [result, setResult] = useState<PaymentRequestResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [feedback, setFeedback] = useState<{
    kind: StatusKind;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm<PaymentRequestInput>({
    resolver: zodResolver(paymentRequestSchema),
    defaultValues: {
      destination: '',
      assetCode: 'XLM',
      assetIssuer: '',
      amount: '',
      memoType: 'NONE',
      memo: '',
    },
  });
  const memoType = useWatch({ control: form.control, name: 'memoType' });
  const assetCode = useWatch({ control: form.control, name: 'assetCode' });
  const isIssuedAsset = (assetCode ?? '').trim().toUpperCase() !== 'XLM';

  async function submitRequest(values: PaymentRequestInput) {
    setFeedback({
      kind: 'loading',
      message: 'Creando la solicitud y generando su QR…',
    });
    setResult(null);
    setCopied(false);
    const body = {
      destination: values.destination.trim(),
      assetCode: values.assetCode.trim().toUpperCase(),
      ...(isIssuedAsset ? { assetIssuer: values.assetIssuer?.trim() } : {}),
      amount: values.amount.trim(),
      ...(values.memoType !== 'NONE'
        ? { memoType: values.memoType, memo: values.memo?.trim() }
        : {}),
    };

    try {
      const response = await apiRequest<PaymentRequestResult>(
        '/payment-requests',
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );
      const qr =
        response.qrDataUrl ??
        (await QRCode.toDataURL(response.uri, {
          errorCorrectionLevel: 'M',
          width: 300,
        }));
      setResult(response);
      setQrDataUrl(qr);
      setFeedback({
        kind: response.existing ? 'warning' : 'success',
        message: response.existing
          ? 'Esta solicitud ya existía. Se muestra la misma URI y huella. Para generar un cobro distinto con los mismos datos, agrega un memo.'
          : 'Solicitud creada. La URI mostrada es exactamente la que devolvió el backend.',
      });
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldByCode: Record<string, keyof PaymentRequestInput> = {
          INVALID_DESTINATION: 'destination',
          INVALID_AMOUNT: 'amount',
          ASSET_ISSUER_REQUIRED: 'assetIssuer',
          INVALID_ASSET_ISSUER: 'assetIssuer',
          MEMO_TOO_LONG: 'memo',
          INVALID_MEMO_ID: 'memo',
          INVALID_MEMO: 'memoType',
        };
        const field = fieldByCode[error.code ?? ''];
        if (field)
          form.setError(field, { type: 'server', message: error.message });
      }
      setFeedback({ kind: 'error', message: getApiErrorMessage(error) });
    }
  }

  async function copyUri() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.uri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setFeedback({
        kind: 'warning',
        message:
          'El navegador bloqueó el portapapeles. Selecciona y copia la URI manualmente.',
      });
    }
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `stellar-request-${result?.requestId ?? 'qr'}.png`;
    link.click();
  }

  return (
    <>
      <header className="page-intro">
        <p className="eyebrow">01 / Payment requests</p>
        <h1 className="page-title">Genera una solicitud SEP-7</h1>
        <p className="page-description">
          Define activo, importe y destino. La URI y su huella se generan en el
          backend y no se reconstruyen en el navegador.
        </p>
      </header>
      <div className="workspace">
        <section
          className="surface form-surface"
          aria-labelledby="request-form-heading"
        >
          <div className="section-heading">
            <div>
              <h2 className="section-title" id="request-form-heading">
                Detalles de solicitud
              </h2>
              <p className="section-note">
                Los campos se validan antes de consultar el servicio.
              </p>
            </div>
          </div>
          <form
            className="fields"
            noValidate
            onSubmit={form.handleSubmit(submitRequest)}
          >
            <div className="field">
              <label className="field-label" htmlFor="destination">
                Cuenta de destino
              </label>
              <input
                className="field-control mono"
                id="destination"
                autoComplete="off"
                placeholder="G..."
                aria-invalid={!!form.formState.errors.destination}
                aria-describedby={
                  form.formState.errors.destination
                    ? 'destination-error'
                    : 'destination-hint'
                }
                {...form.register('destination')}
              />
              <p className="field-hint" id="destination-hint">
                Dirección pública Stellar de recepción.
              </p>
              <FieldError id="destination-error">
                {form.formState.errors.destination?.message}
              </FieldError>
            </div>
            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="assetCode">
                  Activo
                </label>
                <input
                  className="field-control"
                  id="assetCode"
                  list="asset-codes"
                  autoComplete="off"
                  placeholder="XLM"
                  aria-invalid={!!form.formState.errors.assetCode}
                  {...form.register('assetCode')}
                />
                <datalist id="asset-codes">
                  <option value="XLM" />
                  <option value="USDC" />
                </datalist>
                <FieldError id="asset-error">
                  {form.formState.errors.assetCode?.message}
                </FieldError>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="amount">
                  Importe
                </label>
                <input
                  className="field-control"
                  id="amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-invalid={!!form.formState.errors.amount}
                  {...form.register('amount')}
                />
                <FieldError id="amount-error">
                  {form.formState.errors.amount?.message}
                </FieldError>
              </div>
            </div>
            {isIssuedAsset ? (
              <div className="field">
                <label className="field-label" htmlFor="assetIssuer">
                  Emisor del activo
                </label>
                <input
                  className="field-control mono"
                  id="assetIssuer"
                  autoComplete="off"
                  placeholder="G..."
                  aria-invalid={!!form.formState.errors.assetIssuer}
                  {...form.register('assetIssuer')}
                />
                <FieldError id="issuer-error">
                  {form.formState.errors.assetIssuer?.message}
                </FieldError>
              </div>
            ) : null}
            <div className="field">
              <span className="field-label" id="memo-label">
                Memo
              </span>
              <div
                className="segmented"
                role="group"
                aria-labelledby="memo-label"
              >
                {(['NONE', 'TEXT', 'ID'] as const).map((type) => (
                  <button
                    className="segment"
                    type="button"
                    key={type}
                    aria-pressed={memoType === type}
                    onClick={() =>
                      form.setValue('memoType', type, { shouldValidate: true })
                    }
                  >
                    {type}
                  </button>
                ))}
              </div>
              {memoType !== 'NONE' ? (
                <div style={{ marginTop: 10 }}>
                  <label className="sr-only" htmlFor="memo">
                    {memoType === 'TEXT' ? 'Memo de texto' : 'Memo ID'}
                  </label>
                  <input
                    className="field-control"
                    id="memo"
                    placeholder={
                      memoType === 'TEXT'
                        ? 'Referencia breve'
                        : 'Identificador numérico'
                    }
                    aria-invalid={!!form.formState.errors.memo}
                    {...form.register('memo')}
                  />
                  <FieldError id="memo-error">
                    {form.formState.errors.memo?.message}
                  </FieldError>
                </div>
              ) : (
                <p className="field-hint">Sin memo adjunto.</p>
              )}
            </div>
            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <FilePlus2 size={15} />
                )}
                Crear solicitud
              </button>
              {result && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setFeedback(null);
                  }}
                >
                  Nueva solicitud
                </button>
              )}
            </div>
          </form>
          {feedback && (
            <StatusMessage kind={feedback.kind}>
              {feedback.message}
            </StatusMessage>
          )}
        </section>

        <aside
          className="surface result-surface"
          aria-live="polite"
          aria-label="Resultado de la solicitud"
        >
          {result ? (
            <>
              <div className="result-topline">
                <h2 className="result-title">Solicitud lista</h2>
                <span className="network-pill">
                  <span className="network-dot" />
                  {result.network ?? 'TESTNET'}
                </span>
              </div>
              <div className="qr-frame">
                <Image
                  src={qrDataUrl}
                  alt="Código QR de la URI SEP-7"
                  width={204}
                  height={204}
                  unoptimized
                />
              </div>
              <div className="result-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={copyUri}
                >
                  <Copy size={14} />
                  {copied ? 'Copiada' : 'Copiar enlace'}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={downloadQr}
                >
                  <Download size={14} />
                  Descargar QR
                </button>
              </div>
              <div className="detail-block">
                <p className="detail-label">Enlace SEP-7</p>
                <a className="uri-link" href={result.uri}>
                  {result.uri}
                </a>
              </div>
              <div className="detail-block" style={{ marginTop: 15 }}>
                <p className="detail-label">Request hash · SHA-256</p>
                <code className="request-hash">{result.requestHash}</code>
              </div>
              {result.warnings.length > 0 && (
                <div
                  className="warning-list"
                  aria-label="Advertencias de trustline"
                >
                  {result.warnings.map((warning) => (
                    <div className="warning-item" key={warning}>
                      <AlertTriangle size={14} />
                      {warningMessages[warning] ?? warning}
                    </div>
                  ))}
                </div>
              )}
              {result.trustline?.required &&
                result.trustline.exists &&
                result.trustline.authorized && (
                  <div
                    className="warning-item"
                    style={{ marginTop: 14, color: '#42663a' }}
                  >
                    <Check size={14} />
                    Trustline autorizada.
                  </div>
                )}
              <RegistryPanel requestId={result.requestId} />
            </>
          ) : (
            <div className="result-empty">
              <div>
                <QrCode size={26} />
                <strong>El QR aparecerá aquí</strong>
                <span>
                  El backend devuelve la URI canónica y la huella de esta
                  solicitud.
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>
      <p className="footer-note">
        Solo se comparte una solicitud SEP-7. El backend almacena hashes, no
        claves ni fondos.
      </p>
    </>
  );
}
