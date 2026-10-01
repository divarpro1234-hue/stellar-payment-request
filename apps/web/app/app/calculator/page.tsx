'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRightLeft,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, apiRequest, getApiErrorMessage } from '../../lib/api';
import { calculatorSchema } from '../../lib/validation';
import { FieldError } from '../../components/field-error';
import { StatusMessage } from '../../components/status-message';
import type { StatusKind } from '../../components/status-message';

interface Calculation {
  amountXlm: string;
  priceUsd: string;
  valueUsd: string;
  source: string;
  fetchedAt: string;
  cached: boolean;
}

export default function CalculatorPage() {
  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: StatusKind;
    message: string;
  } | null>(null);
  const form = useForm({
    resolver: zodResolver(calculatorSchema),
    defaultValues: { amount: '' },
  });

  async function calculate(values: { amount: string }) {
    setCalculation(null);
    setFeedback({
      kind: 'loading',
      message: 'Consultando el precio de referencia…',
    });
    const params = new URLSearchParams({ amount: values.amount.trim() });
    try {
      const result = await apiRequest<Calculation>(
        `/calculator/xlm-usd?${params.toString()}`,
      );
      setCalculation(result);
      setFeedback({
        kind: 'success',
        message: result.cached
          ? 'Resultado calculado con un precio en caché.'
          : 'Precio de referencia actualizado.',
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_AMOUNT') {
        form.setError('amount', { type: 'server', message: error.message });
      }
      setFeedback({ kind: 'error', message: getApiErrorMessage(error) });
    }
  }

  const formattedTime = calculation
    ? new Intl.DateTimeFormat('es', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(calculation.fetchedAt))
    : '';

  return (
    <>
      <header className="page-intro">
        <p className="eyebrow">03 / Market reference</p>
        <h1 className="page-title">Calcula el valor de XLM</h1>
        <p className="page-description">
          Convierte un importe XLM a USD con la última referencia de mercado
          disponible.
        </p>
      </header>
      <div className="workspace">
        <section
          className="surface form-surface"
          aria-labelledby="calculator-heading"
        >
          <div className="section-heading">
            <div>
              <h2 className="section-title" id="calculator-heading">
                Importe a convertir
              </h2>
              <p className="section-note">
                Hasta siete decimales. El resultado no es una cotización de
                compraventa.
              </p>
            </div>
          </div>
          <form
            className="fields"
            noValidate
            onSubmit={form.handleSubmit(calculate)}
          >
            <div className="field">
              <label className="field-label" htmlFor="amount">
                Importe en XLM
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="field-control"
                  id="amount"
                  inputMode="decimal"
                  placeholder="100.00"
                  aria-invalid={!!form.formState.errors.amount}
                  style={{ paddingRight: 58 }}
                  {...form.register('amount')}
                />
                <span
                  className="mono"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 14,
                    color: '#718076',
                    fontSize: 11,
                  }}
                >
                  XLM
                </span>
              </div>
              <FieldError id="amount-error">
                {form.formState.errors.amount?.message}
              </FieldError>
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
                  <ArrowRightLeft size={15} />
                )}
                Calcular referencia
              </button>
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
          aria-label="Resultado de conversión"
        >
          {calculation ? (
            <>
              <div className="result-topline">
                <h2 className="result-title">Conversión estimada</h2>
                <span className="network-pill">XLM / USD</span>
              </div>
              <div className="reference-note">
                <CircleDollarSign size={19} />
                <div>
                  <strong>Valor de referencia</strong>
                  <span>Datos proporcionados por CoinGecko</span>
                </div>
              </div>
              <div className="metric-grid">
                <div className="metric">
                  <span className="metric-label">XLM</span>
                  <strong className="metric-value">
                    {calculation.amountXlm}
                  </strong>
                </div>
                <div className="metric">
                  <span className="metric-label">USD estimado</span>
                  <strong className="metric-value large">
                    ${calculation.valueUsd}
                  </strong>
                </div>
                <div className="metric">
                  <span className="metric-label">Precio unitario</span>
                  <strong className="metric-value">
                    ${calculation.priceUsd}
                  </strong>
                </div>
              </div>
              <div className="detail-block">
                <p className="detail-label">
                  <Clock3
                    size={12}
                    style={{ verticalAlign: 'middle', marginRight: 5 }}
                  />
                  Hora de referencia
                </p>
                <time className="request-hash" dateTime={calculation.fetchedAt}>
                  {formattedTime}
                </time>
              </div>
              <div className="detail-block" style={{ marginTop: 13 }}>
                <p className="detail-label">Fuente</p>
                <span className="request-hash">{calculation.source}</span>
              </div>
            </>
          ) : (
            <div className="result-empty">
              <div>
                <CircleDollarSign size={27} />
                <strong>El cálculo aparecerá aquí</strong>
                <span>
                  La API devuelve el importe, el precio unitario, la hora y la
                  fuente.
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>
      <p className="footer-note">
        Valor de referencia. No representa ni garantiza un precio de
        compraventa.
      </p>
    </>
  );
}
