# API

Base URL local: `http://localhost:3001/api/v1`. Swagger UI está en
`http://localhost:3001/api/docs`. JSON; las rutas con body usan
`Content-Type: application/json`.

## Endpoints

| Método | Ruta                                                             | Función                                                                                                |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET`  | `/health`                                                        | `{"status":"ok"}`.                                                                                     |
| `POST` | `/payment-requests`                                              | Crea o reutiliza una solicitud SEP-7. Nueva: 201 y `existing:false`; duplicada: 200 y `existing:true`. |
| `GET`  | `/calculator/xlm-usd?amount=10`                                  | Referencia XLM/USD con Decimal, caché y fuente CoinGecko.                                              |
| `GET`  | `/trustlines/check?account=G...&assetCode=USDC&assetIssuer=G...` | Compara simultáneamente el código y el issuer. Para XLM, omite issuer.                                 |
| `POST` | `/registry/prepare`                                              | Valida estado on-chain y devuelve una transacción sin firmar para Freighter.                           |
| `POST` | `/registry/submit`                                               | Valida y envía el XDR firmado por el usuario.                                                          |
| `GET`  | `/registry/:requestId`                                           | Consulta/reconcilia el estado Soroban de una solicitud.                                                |

## Crear solicitud

```json
{
  "destination": "GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG",
  "assetCode": "XLM",
  "amount": "12.34",
  "memoType": "TEXT",
  "memo": "demo-1234"
}
```

Para activos emitidos, incluye `assetIssuer`; para XLM debe omitirse. `memo`
y `memoType` se proporcionan juntos. La respuesta incluye `requestId`,
`existing`, `network`, `uri`, `qrDataUrl`, `requestHash`, `trustline` y
`warnings`. Al repetir exactamente los mismos datos URI/network, se devuelve el
mismo ID, URI, QR y hash.

## Registro Soroban

Preparar:

```json
{
  "requestId": "123e4567-e89b-42d3-a456-426614174000",
  "registrant": "G..."
}
```

La respuesta contiene `xdr`, `networkPassphrase`, `contractId` y
`requestHash`. La wallet firma ese XDR fuera del backend.

Enviar:

```json
{
  "requestId": "123e4567-e89b-42d3-a456-426614174000",
  "signedXdr": "<XDR firmado por Freighter>"
}
```

El valor firmado solo vive en memoria para la petición, validación y envío; no
se persiste ni se registra. La respuesta contiene `requestId`, `txHash`,
`status` (`SUCCESS`, `FAILED` o `PENDING`) y `ledger`.

## Errores

El filtro uniforme responde `statusCode`, `error`, `message`, `timestamp` y
`path`, con `code` cuando existe. Errores de validación tienen códigos como
`INVALID_DESTINATION`, `INVALID_AMOUNT`, `MEMO_TOO_LONG`, `INVALID_MEMO_ID`;
errores de trustline incluyen `ACCOUNT_NOT_FOUND`. Errores de envío Soroban
usan `SOROBAN_SUBMIT_FAILED` y pueden incluir `rpcResultCode` (por ejemplo,
`txBAD_SEQ`). Errores internos son genéricos y no devuelven stack.

La validación global aplica `whitelist` y `forbidNonWhitelisted`: los campos no
declarados por DTO se rechazan.
