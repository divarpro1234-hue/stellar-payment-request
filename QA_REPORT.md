# Informe QA, seguridad y pruebas E2E

**Fecha:** 2026-10-02  
**Alcance:** monorepo, API NestJS, frontend Next.js, paquete `stellar-domain` y contrato Soroban.

## Resumen

- `pnpm lint`, `pnpm test`, `pnpm build` y `cargo test` pasan en la revisión final.
- La auditoría de dependencias termina sin vulnerabilidades conocidas. Se aplicaron overrides transitivos para versiones corregidas, sin cambiar la versión principal de Prisma.
- Se corrigió la conversión de `requestHash`: ahora exige exactamente 64 caracteres hexadecimales antes de convertirlos a `BytesN<32>`.
- Los errores HTTP y los fallos de inicio en producción no incluyen stack traces. Los logs HTTP no imprimen el objeto de excepción ni datos de pago.
- No se encontró rate limiting en `/registry/submit` ni en `/calculator/xlm-usd`.

## Pruebas automatizadas

| Comando                                      | Resultado                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm lint`                                  | Aprobado: ESLint recursivo y Prettier limpios.                                            |
| `pnpm test`                                  | Aprobado: 14 tests de dominio, 6 Vitest, 6 Playwright y 61 tests del API; 87 en total.    |
| `pnpm build`                                 | Aprobado: Next.js, TypeScript del dominio, Prisma Client y NestJS.                        |
| `cargo test` en `contracts/request-registry` | Aprobado: 4 tests; 0 doc-tests. Rust mostró un warning informativo del linker de Windows. |
| `pnpm audit`                                 | Aprobado tras remediación: sin vulnerabilidades conocidas.                                |

El primer `pnpm audit` encontró 2 vulnerabilidades altas y 2 moderadas en dependencias transitivas: `deepmerge-ts`, `mysql2` y `js-yaml`. Se ejecutó `pnpm audit --fix`, se instalaron las resoluciones y el audit posterior quedó limpio. Los overrides están declarados en `pnpm-workspace.yaml`.

Los seis E2E Playwright usan Chromium y `page.route` para mockear las respuestas de API; no dependen de Testnet, Horizon ni CoinGecko. Cubren landing y navegación, validación de solicitud/calculadora sin llamada API, respuesta mock de calculadora, URI/hash/QR SEP-7 y desbordamiento horizontal en viewport móvil. El flujo Freighter queda fuera de la automatización.

## Seguridad

El barrido recursivo equivalente a `grep -rniE 'Keypair|fromSecret|secret|seed|\.sign\('` se ejecutó sobre `apps/api/src`, `apps/web` y `packages`, excluyendo dependencias y artefactos compilados. Estas son todas las coincidencias encontradas:

| Archivo y línea                                                       | Coincidencia                       | Justificación                                                                                              |
| --------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps/api/src/registry/soroban-rpc.client.ts:8`                       | `Keypair`                          | Import del SDK para obtener el XDR de una clave pública; no contiene una clave secreta.                    |
| `apps/api/src/registry/soroban-rpc.client.ts:61`                      | `Keypair.fromPublicKey(accountId)` | Construye una clave pública a partir del account ID para consultar el ledger; no carga un secret ni firma. |
| `apps/api/src/generated/prisma/internal/prismaNamespace.ts:105`       | `secret`                           | Nombre de parámetro generado por Prisma, tipado como `never`; no es material secreto.                      |
| `apps/api/src/generated/prisma/internal/prismaNamespace.ts:106`       | `secret`                           | Igual: firma de tipo generada para `JsonNull`.                                                             |
| `apps/api/src/generated/prisma/internal/prismaNamespace.ts:107`       | `secret`                           | Igual: firma de tipo generada para `AnyNull`.                                                              |
| `apps/api/src/generated/prisma/internal/prismaNamespaceBrowser.ts:27` | `secret`                           | Nombre de parámetro generado por Prisma, tipado como `never`; no es material secreto.                      |
| `apps/api/src/generated/prisma/internal/prismaNamespaceBrowser.ts:28` | `secret`                           | Igual: firma de tipo generada para `JsonNull`.                                                             |
| `apps/api/src/generated/prisma/internal/prismaNamespaceBrowser.ts:29` | `secret`                           | Igual: firma de tipo generada para `AnyNull`.                                                              |
| `apps/web/app/page.tsx:64`                                            | “seed o clave privada”             | Texto informativo: aclara que la wallet retiene las claves.                                                |
| `apps/web/app/page.tsx:693`                                           | “seeds o frases”                   | Texto informativo: aclara que la aplicación no solicita ni almacena esos datos.                            |

Fuera del alcance literal del barrido, `.env.example:12` contiene una advertencia para no añadir claves, seeds ni frases semilla; no contiene un secreto. No se encontraron `fromSecret`, llamadas `.sign(` ni claves secretas Stellar en código, ejemplos de entorno, logs o tests. Tampoco se encontraron entradas para secret seed: los formularios solo piden destination/account, activo, importe, memo y emisor.

El backend prepara la transacción y transmite el XDR firmado por Freighter; no crea firmas. `signedXdr` se mantiene en memoria para validarlo y enviarlo a Soroban RPC, pero no existe un campo para él en Prisma, no se escribe en storage del navegador y ningún log lo imprime. El esquema persiste hashes de destination/memo y metadatos de registro, no el memo ni la destination completos.

Controles revisados:

- CORS usa únicamente `FRONTEND_ORIGIN` (con `http://localhost:3000` como fallback de desarrollo).
- `ValidationPipe` está configurado con `whitelist: true` y `forbidNonWhitelisted: true`.
- Nest/Express usa el límite predeterminado del parser JSON y urlencoded: 100 KiB (`body-parser` `normalizeOptions`). No se encontró un límite explícito en la aplicación.
- El filtro global devuelve errores internos genéricos sin stack. Ahora registra solo un mensaje fijo, y la prueba de infraestructura verifica que destination/memo no llegan al logger ni a la respuesta. El arranque también evita escribir el objeto de error en logs de producción.
- No hay rate limiting implementado en `POST /registry/submit` ni `GET /calculator/xlm-usd`.

## Revisión funcional

### SEP-7

- El esquema genera `web+stellar:pay` y codifica parámetros con `encodeURIComponent`.
- XLM omite `asset_code` y `asset_issuer`; los activos emitidos requieren issuer válido.
- El importe admite hasta 7 decimales y rechaza cero, notación científica y negativos.
- Memo TEXT se valida por longitud UTF-8 de 28 bytes; memo ID usa `BigInt` y el máximo u64.
- TESTNET incorpora el passphrase oficial `Test SDF Network ; September 2015`.
- Las pruebas de dominio cubren orden/codificación, XLM, activo emitido, memo TEXT/ID y passphrase.

### Trustline y calculadora

- La trustline compara conjuntamente `asset_code` y `asset_issuer`; los tests distinguen ausente, no autorizada y cuenta no encontrada.
- XLM devuelve trustline no requerida sin llamar Horizon.
- La calculadora opera con `Prisma.Decimal`, no con aritmética `number` para el resultado.
- CoinGecko tiene timeout de 5 segundos y trata HTTP 429 y timeout como errores diferenciados; hay tests para ambos.

### Soroban e idempotencia

- El contrato solo registra/lee huellas en storage Soroban; no invoca transferencias de activos. `register` exige `require_auth` y usa `BytesN<32>`.
- `requestHash` se valida contra `^[\da-f]{64}$` antes de `Buffer.from(..., 'hex')`.
- El test con `Account` real confirma que `register` usa secuencia inicial + 1 aunque `exists()` se simule antes; la simulación usa una copia independiente.
- Las pruebas de solicitudes idénticas verifican mismo ID, URI, QR y hash en la segunda creación, y cubren la carrera `P2002`.

### Frontend y accesibilidad

- Los errores de validación/API se muestran en la interfaz; los formularios tienen labels asociados, los controles mantienen foco visible y las animaciones respetan `prefers-reduced-motion`.
- El smoke E2E móvil verifica que la pantalla de solicitud no exceda el ancho de 390 px. No se midió CLS de forma automatizada ni se hizo inspección visual manual de cada viewport.

## Pruebas manuales en Testnet

Marcadas como aprobadas según lo informado por el solicitante; no se repitieron durante esta ejecución de QA.

| Prueba                                                           | Estado                                                                                                                                               |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Solicitud XLM sin memo                                           | Aprobada                                                                                                                                             |
| Solicitud XLM con memo TEXT                                      | Aprobada                                                                                                                                             |
| Solicitud duplicada devuelve la misma URI y huella               | Aprobada                                                                                                                                             |
| Calculadora con CoinGecko real                                   | Aprobada                                                                                                                                             |
| Registro de prueba con estado SUCCESS en Testnet, ledger 4978095 | Aprobada; [transacción `07c780…794ef5`](https://stellar.expert/explorer/testnet/tx/07c7805d72e545e9ff3f2bda9c874764024c59b5a50713dbb3d1d78cf9794ef5) |

Pendientes de prueba manual:

- Pago XLM escaneando el QR desde una wallet móvil.
- Rechazo de firma en Freighter.
- Freighter configurado en una red incorrecta.
- Trustline con un activo no XLM.

## Compatibilidad SEP-7 en wallets reales

Completar manualmente con las wallets y plataformas probadas.

| Wallet | Plataforma | Escanea QR | Interpreta XLM | Interpreta activo con issuer | Interpreta memo TEXT | Interpreta memo ID | Observaciones |
| ------ | ---------- | ---------- | -------------- | ---------------------------- | -------------------- | ------------------ | ------------- |
|        |            |            |                |                              |                      |                    |               |

## Riesgos conocidos

- No hay rate limiting en registro Soroban ni en la calculadora. Riesgo de abuso, consumo de RPC/cuota y carga innecesaria; aplicar límites en gateway/API antes de exposición pública.
- No se ha completado la matriz de compatibilidad de wallets; la interoperabilidad SEP-7 real puede variar por plataforma y tipo de memo.
- Los E2E mockean la API; no validan conectividad real con Horizon, CoinGecko, RPC Soroban ni firmas Freighter.
- No se automatizó una medición de CLS ni una auditoría visual completa; el E2E móvil solo cubre el ancho de la herramienta de solicitud.
- `signedXdr` necesariamente transita por memoria y red entre Freighter, frontend y API para su validación/envío; no se persiste ni se registra.
