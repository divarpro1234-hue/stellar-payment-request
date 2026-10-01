'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  CircleHelp,
  Hexagon,
  LoaderCircle,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ApiError, apiRequest, getApiErrorMessage } from '../../lib/api';
import { trustlineSchema } from '../../lib/validation';
import { FieldError } from '../../components/field-error';
import { StatusMessage } from '../../components/status-message';
import type { StatusKind } from '../../components/status-message';

interface TrustlineResult {
  account: string;
  assetCode: string;
  assetIssuer?: string;
  required: boolean;
  exists: boolean;
  authorized: boolean;
  balance?: string;
  limit?: string;
}

export default function TrustlinePage() {
  const [result, setResult] = useState<TrustlineResult | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: StatusKind;
    message: string;
  } | null>(null);
  const form = useForm({
    resolver: zodResolver(trustlineSchema),
    defaultValues: { account: '', assetCode: 'XLM', assetIssuer: '' },
  });
  const assetCode = useWatch({ control: form.control, name: 'assetCode' });
  const xlmSelected = (assetCode ?? '').trim().toUpperCase() === 'XLM';

  async function checkTrustline(values: {
    account: string;
    assetCode: string;
    assetIssuer?: string;
  }) {
    setResult(null);
    if (values.assetCode.trim().toUpperCase() === 'XLM') {
      setResult({
        account: values.account.trim(),
        assetCode: 'XLM',
        required: false,
        exists: true,
        authorized: true,
      });
      setFeedback({
        kind: 'success',
        message: 'XLM es el activo nativo y no requiere trustline.',
      });
      return;
    }

    setFeedback({
      kind: 'loading',
      message: 'Consultando cuenta y trustline en Horizon…',
    });
    const params = new URLSearchParams({
      account: values.account.trim(),
      assetCode: values.assetCode.trim().toUpperCase(),
      assetIssuer: values.assetIssuer?.trim() ?? '',
    });
    try {
      const response = await apiRequest<TrustlineResult>(
        `/trustlines/check?${params.toString()}`,
      );
      setResult(response);
      setFeedback({
        kind: !response.exists || !response.authorized ? 'warning' : 'success',
        message: !response.exists
          ? 'La cuenta no tiene esta trustline.'
          : !response.authorized
            ? 'La trustline existe, pero no está autorizada.'
            : 'Trustline activa y autorizada.',
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ACCOUNT_NOT_FOUND') {
        setFeedback({
          kind: 'warning',
          message: 'Cuenta no encontrada en la red configurada.',
        });
      } else {
        setFeedback({ kind: 'error', message: getApiErrorMessage(error) });
      }
    }
  }

  return (
    <>
      <header className="page-intro">
        <p className="eyebrow">02 / Asset access</p>
        <h1 className="page-title">Comprueba una trustline</h1>
        <p className="page-description">
          Consulta si una cuenta puede recibir un activo emitido. XLM es nativo
          y no necesita trustline.
        </p>
      </header>
      <div className="workspace single">
        <section
          className="surface form-surface"
          aria-labelledby="trustline-heading"
        >
          <div className="section-heading">
            <div>
              <h2 className="section-title" id="trustline-heading">
                Cuenta y activo
              </h2>
              <p className="section-note">
                La consulta se realiza contra Horizon; el resultado no mueve
                fondos.
              </p>
            </div>
          </div>
          <form
            className="fields"
            noValidate
            onSubmit={form.handleSubmit(checkTrustline)}
          >
            <div className="field">
              <label className="field-label" htmlFor="account">
                Cuenta Stellar
              </label>
              <input
                className="field-control mono"
                id="account"
                placeholder="G..."
                autoComplete="off"
                aria-invalid={!!form.formState.errors.account}
                {...form.register('account')}
              />
              <FieldError id="account-error">
                {form.formState.errors.account?.message}
              </FieldError>
            </div>
            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="assetCode">
                  Código de activo
                </label>
                <input
                  className="field-control"
                  id="assetCode"
                  placeholder="XLM o USDC"
                  {...form.register('assetCode')}
                />
                <FieldError id="asset-code-error">
                  {form.formState.errors.assetCode?.message}
                </FieldError>
              </div>
              {!xlmSelected && (
                <div className="field">
                  <label className="field-label" htmlFor="assetIssuer">
                    Emisor
                  </label>
                  <input
                    className="field-control mono"
                    id="assetIssuer"
                    placeholder="G..."
                    autoComplete="off"
                    aria-invalid={!!form.formState.errors.assetIssuer}
                    {...form.register('assetIssuer')}
                  />
                  <FieldError id="asset-issuer-error">
                    {form.formState.errors.assetIssuer?.message}
                  </FieldError>
                </div>
              )}
            </div>
            {xlmSelected && (
              <div className="reference-note">
                <Hexagon size={17} />
                <div>
                  <strong>XLM no requiere trustline</strong>
                  <span>
                    Es el activo nativo de Stellar; no se consultará Horizon.
                  </span>
                </div>
              </div>
            )}
            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <Hexagon size={15} />
                )}
                Comprobar
              </button>
            </div>
          </form>
          {feedback && (
            <StatusMessage kind={feedback.kind}>
              {feedback.message}
            </StatusMessage>
          )}
        </section>
        {result && (
          <section
            className="surface result-surface"
            aria-labelledby="trustline-result-heading"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Resultado</p>
                <h2 className="section-title" id="trustline-result-heading">
                  {result.assetCode} ·{' '}
                  {result.required ? 'Activo emitido' : 'Activo nativo'}
                </h2>
              </div>
            </div>
            {!result.required ? (
              <div className="trustline-state">
                <CheckCircle2 size={19} />
                No requiere trustline
              </div>
            ) : !result.exists ? (
              <div className="trustline-state" style={{ color: '#865c15' }}>
                <CircleHelp size={19} />
                No existe
              </div>
            ) : !result.authorized ? (
              <div className="trustline-state" style={{ color: '#a34831' }}>
                <XCircle size={19} />
                No autorizada
              </div>
            ) : (
              <div className="trustline-state">
                <CheckCircle2 size={19} />
                Existe y está autorizada
              </div>
            )}
            <div className="detail-block">
              <p className="detail-label">Cuenta</p>
              <code className="request-hash">{result.account}</code>
            </div>
            {result.assetIssuer && (
              <div className="detail-block" style={{ marginTop: 13 }}>
                <p className="detail-label">Emisor</p>
                <code className="request-hash">{result.assetIssuer}</code>
              </div>
            )}
            {result.balance && (
              <div className="metric-grid">
                <div className="metric">
                  <span className="metric-label">Balance</span>
                  <strong className="metric-value">{result.balance}</strong>
                </div>
                {result.limit && (
                  <div className="metric">
                    <span className="metric-label">Límite</span>
                    <strong className="metric-value">{result.limit}</strong>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
