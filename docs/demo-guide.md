# Guía de demostración (5–10 minutos)

## Antes de presentar

- Levanta API y web localmente, o comprueba ambos dominios Vercel.
- Abre la aplicación y genera una solicitud antes de empezar; eso despierta el
  compute de Neon, que puede estar en scale-to-zero.
- Freighter instalado, desbloqueado, seleccionado en **Test Net** y con XLM de
  Testnet para fees.
- Desactiva la traducción automática del navegador para que no altere labels,
  URI ni controles.
- Ten preparada una solicitud nueva con memo fresco `demo-HHMM`, pues
  solicitudes idénticas reutilizan la misma URI/huella y una huella ya
  registrada no se vuelve a registrar.
- Abre una segunda pestaña en Stellar Expert Testnet. Ten preparadas capturas
  del Contract ID, transacciones de despliegue y un registro SUCCESS reciente.
- Deja [QA_REPORT.md](../QA_REPORT.md) disponible como respaldo.

## Guion

| Tiempo     | Acción / explicación                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–1:00  | Abre la landing. Explica el problema: una petición debe compartir importe, activo, destino y referencia de forma interpretable.                                                                         |
| 1:00–2:00  | Navega a Solicitud y genera una solicitud XLM con memo `demo-HHMM`.                                                                                                                                     |
| 2:00–3:00  | Enseña URI SEP-7 y QR. Explica que una wallet compatible interpreta el enlace; no afirmes compatibilidad universal.                                                                                     |
| 3:00–4:00  | Abre Trustline y muestra una consulta. Explica que XLM no requiere trustline; activos emitidos sí dependen del par code+issuer.                                                                         |
| 4:00–5:00  | Usa Calculadora XLM/USD. Aclara que es referencia CoinGecko, no cotización ni garantía de ejecución.                                                                                                    |
| 5:00–7:00  | Conecta Freighter en Testnet. Prepara el registro, revisa la transacción y firma con la wallet.                                                                                                         |
| 7:00–8:00  | Muestra el `txHash`, estado SUCCESS y transacción en Stellar Expert. Enseña el Contract ID actual.                                                                                                      |
| 8:00–9:00  | Abre DevTools → Network y selecciona `POST /registry/submit`: el body incluye `requestId` y `signedXdr`. La private key nunca sale de Freighter; signedXdr es la transacción firmada, no la secret key. |
| 9:00–10:00 | Cierre: Soroban registra una huella verificable; no procesa ni garantiza el pago. Un hash es una huella, no cifrado.                                                                                    |

## Plan B

Si Testnet, Freighter, Neon o CoinGecko fallan, enseña el Registro de prueba con
estado SUCCESS en Testnet, ledger 4978095:
[transacción `07c780…794ef5`](https://stellar.expert/explorer/testnet/tx/07c7805d72e545e9ff3f2bda9c874764024c59b5a50713dbb3d1d78cf9794ef5),
el contrato actual en Stellar Expert, las capturas preparadas y `QA_REPORT.md`.
