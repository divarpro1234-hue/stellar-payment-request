'use client';

import {
  getAddress,
  getNetworkDetails,
  isConnected,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';
import {
  ArrowUpRight,
  Check,
  LoaderCircle,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, apiRequest } from '../lib/api';
import { StatusMessage } from './status-message';
import type { StatusKind } from './status-message';

interface PreparedRegistration {
  xdr: string;
  networkPassphrase: string;
  contractId: string;
  requestHash: string;
}

interface SubmittedRegistration {
  txHash: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  ledger?: number | null;
}

interface RegistryLookup {
  registration: null | {
    txHash: string | null;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    ledger: string | null;
  };
}

function walletErrorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return '';
}

function wasRejected(error: unknown): boolean {
  return /reject|declin|denied|cancel/i.test(walletErrorText(error));
}

function explorerUrl(txHash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${encodeURIComponent(txHash)}`;
}

function friendbotUrl(address: string): string {
  return `https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`;
}

export function RegistryPanel({ requestId }: { requestId: string }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{
    kind: StatusKind;
    message: string;
  } | null>(null);
  const [registration, setRegistration] =
    useState<SubmittedRegistration | null>(null);
  const [address, setAddress] = useState('');

  useEffect(() => {
    let active = true;

    async function checkRegistration() {
      setBusy(true);
      setStatus({
        kind: 'loading',
        message: 'Consultando el registro en Soroban…',
      });
      try {
        const result = await apiRequest<RegistryLookup>(
          `/registry/${encodeURIComponent(requestId)}`,
        );
        if (!active) return;

        const current = result.registration;
        if (!current) {
          setRegistration(null);
          setStatus({
            kind: 'warning',
            message: 'Esta huella todavía no está registrada en Soroban.',
          });
          return;
        }

        setRegistration({
          txHash: current.txHash ?? '',
          status: current.status,
          ledger: current.ledger ? Number(current.ledger) : null,
        });
        setStatus(
          current.status === 'SUCCESS'
            ? {
                kind: 'success',
                message: 'Huella registrada en Stellar Testnet.',
              }
            : current.status === 'PENDING'
              ? {
                  kind: 'warning',
                  message: 'El registro de la huella está pendiente.',
                }
              : { kind: 'error', message: 'El registro de la huella falló.' },
        );
      } catch (error) {
        if (active) {
          setStatus({
            kind: 'error',
            message:
              error instanceof ApiError
                ? error.message
                : 'No se pudo consultar el registro en Soroban.',
          });
        }
      } finally {
        if (active) setBusy(false);
      }
    }

    void checkRegistration();
    return () => {
      active = false;
    };
  }, [requestId]);

  async function registerFingerprint() {
    setBusy(true);
    setStatus({
      kind: 'loading',
      message: 'Comprobando Freighter y preparando la transacción…',
    });
    setRegistration(null);

    try {
      const connection = await isConnected();
      if (connection.error || !connection.isConnected) {
        setStatus({
          kind: 'error',
          message:
            'Freighter no está instalado o no está disponible en este navegador.',
        });
        return;
      }

      const access = await requestAccess();
      if (access.error) {
        setStatus({
          kind: wasRejected(access.error) ? 'warning' : 'error',
          message: wasRejected(access.error)
            ? 'Se rechazó el acceso a la cuenta en Freighter.'
            : walletErrorText(access.error) ||
              'No se pudo obtener acceso a Freighter.',
        });
        return;
      }
      const addressResult = await getAddress();
      if (addressResult.error) {
        setStatus({
          kind: 'error',
          message:
            walletErrorText(addressResult.error) ||
            'No se pudo leer la cuenta activa de Freighter.',
        });
        return;
      }
      const registrant = access.address || addressResult.address;
      if (!registrant || registrant !== addressResult.address) {
        setStatus({
          kind: 'error',
          message: 'La cuenta activa de Freighter cambió. Vuelve a intentarlo.',
        });
        return;
      }
      setAddress(registrant);

      const prepared = await apiRequest<PreparedRegistration>(
        '/registry/prepare',
        {
          method: 'POST',
          body: JSON.stringify({ requestId, registrant }),
        },
      );

      const network = await getNetworkDetails();
      if (network.error) {
        setStatus({
          kind: 'error',
          message:
            walletErrorText(network.error) ||
            'No se pudo comprobar la red activa de Freighter.',
        });
        return;
      }
      if (network.networkPassphrase !== prepared.networkPassphrase) {
        setStatus({
          kind: 'warning',
          message: 'Cambia Freighter a Testnet para esta operación.',
        });
        return;
      }

      const signature = await signTransaction(prepared.xdr, {
        networkPassphrase: prepared.networkPassphrase,
        address: registrant,
      });
      if (signature.error) {
        setStatus({
          kind: wasRejected(signature.error) ? 'warning' : 'error',
          message: wasRejected(signature.error)
            ? 'Firma rechazada en Freighter. No se envió ninguna transacción.'
            : walletErrorText(signature.error) ||
              'Freighter no pudo firmar la transacción.',
        });
        return;
      }

      const signedXdr = signature.signedTxXdr;
      if (!signedXdr) {
        setStatus({
          kind: 'error',
          message: 'Freighter no devolvió una transacción firmada.',
        });
        return;
      }
      const submitted = await apiRequest<SubmittedRegistration>(
        '/registry/submit',
        {
          method: 'POST',
          body: JSON.stringify({ requestId, signedXdr }),
        },
      );

      setRegistration(submitted);
      setStatus(
        submitted.status === 'SUCCESS'
          ? {
              kind: 'success',
              message: 'Huella registrada en Stellar Testnet.',
            }
          : submitted.status === 'PENDING'
            ? {
                kind: 'warning',
                message: 'La transacción está pendiente de confirmación.',
              }
            : { kind: 'error', message: 'La transacción falló en la red.' },
      );
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'ACCOUNT_NOT_FOUND') {
          setStatus({
            kind: 'warning',
            message:
              'La cuenta aún no existe en Testnet. Fúndala con Friendbot y vuelve a intentar.',
          });
        } else if (error.code === 'ALREADY_REGISTERED') {
          setStatus({
            kind: 'warning',
            message: 'Esta huella ya está registrada en Soroban.',
          });
        } else if (error.code === 'TRANSACTION_FAILED') {
          setStatus({
            kind: 'error',
            message: 'La transacción fue incluida, pero falló en Stellar.',
          });
        } else {
          setStatus({
            kind: 'error',
            message: error.rpcResultCode
              ? `${error.message} Código RPC: ${error.rpcResultCode}.`
              : error.message,
          });
        }
      } else if (wasRejected(error)) {
        setStatus({
          kind: 'warning',
          message:
            'Firma rechazada en Freighter. No se envió ninguna transacción.',
        });
      } else {
        setStatus({
          kind: 'error',
          message: walletErrorText(error) || 'No se pudo registrar la huella.',
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function refreshStatus() {
    setBusy(true);
    setStatus({
      kind: 'loading',
      message: 'Consultando el estado en Soroban…',
    });
    try {
      const result = await apiRequest<RegistryLookup>(
        `/registry/${encodeURIComponent(requestId)}`,
      );
      const current = result.registration;
      if (!current?.txHash) {
        setStatus({
          kind: 'warning',
          message: 'Todavía no hay una transacción asociada a esta solicitud.',
        });
        return;
      }
      setRegistration({
        txHash: current.txHash,
        status: current.status,
        ledger: current.ledger ? Number(current.ledger) : null,
      });
      setStatus(
        current.status === 'SUCCESS'
          ? {
              kind: 'success',
              message: 'Huella registrada en Stellar Testnet.',
            }
          : current.status === 'PENDING'
            ? { kind: 'warning', message: 'La transacción continúa pendiente.' }
            : { kind: 'error', message: 'La transacción falló en Stellar.' },
      );
    } catch (error) {
      setStatus({
        kind: 'error',
        message:
          error instanceof ApiError
            ? error.message
            : 'No se pudo actualizar el estado.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="registry-panel" aria-labelledby="registry-heading">
      <div className="registry-head">
        <span className="registry-icon">
          <ShieldCheck size={18} aria-hidden="true" />
        </span>
        <div>
          <h3 className="registry-title" id="registry-heading">
            Registrar huella en Soroban
          </h3>
          <p className="registry-description">
            La solicitud de firma aparece en Freighter. El servidor no recibe ni
            almacena claves privadas.
          </p>
        </div>
      </div>
      <div className="registry-action">
        {!registration || registration.status !== 'PENDING' ? (
          <button
            className="secondary-button"
            type="button"
            onClick={registerFingerprint}
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Wallet size={15} />
            )}
            Firmar con Freighter
          </button>
        ) : (
          <button
            className="secondary-button"
            type="button"
            onClick={refreshStatus}
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Check size={15} />
            )}
            Actualizar estado
          </button>
        )}
      </div>
      {status && (
        <StatusMessage kind={status.kind}>{status.message}</StatusMessage>
      )}
      {status?.message.includes('Freighter no está instalado') && (
        <p className="field-hint">
          <a href="https://freighter.app/" target="_blank" rel="noreferrer">
            Instalar Freighter <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        </p>
      )}
      {status?.message.includes('Fúndala con Friendbot') && address && (
        <p className="field-hint">
          <a href={friendbotUrl(address)} target="_blank" rel="noreferrer">
            Abrir Friendbot de Testnet{' '}
            <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        </p>
      )}
      {registration?.txHash && (
        <p className="field-hint">
          Estado: <strong>{registration.status}</strong>
          {registration.ledger ? ` · Ledger ${registration.ledger}` : ''} ·{' '}
          <a
            className="tx-link"
            href={explorerUrl(registration.txHash)}
            target="_blank"
            rel="noreferrer"
          >
            {registration.txHash} <ArrowUpRight size={11} aria-hidden="true" />
          </a>
        </p>
      )}
      {status?.message.includes('Esta huella ya está registrada') && (
        <button
          className="text-button"
          type="button"
          onClick={refreshStatus}
          disabled={busy}
        >
          Consultar registro
        </button>
      )}
    </section>
  );
}
