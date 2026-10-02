# Preparación de despliegue

Esta guía configura, pero no despliega automáticamente. No requiere ni solicita
credenciales de Vercel, Neon, la wallet ni el deployer.

## Configuración compartida

El repositorio usa un único `.env` en la raíz. Nest `ConfigModule` carga
`resolve(__dirname, '../../../.env')` desde `apps/api/src` o `apps/api/dist`;
`apps/api/prisma.config.ts` carga `resolve(__dirname, '../../.env')`. No crees
`apps/api/.env`, `apps/web/.env.local` ni archivos alternativos. En producción,
Vercel inyecta variables de proyecto y no sube `.env`.

Prisma ORM 7 usa `provider = "prisma-client"` con
`@prisma/adapter-neon`. En Vercel, configura:

- `DATABASE_URL`: endpoint **pooled** de Neon (hostname con `-pooler`), para las
  consultas serverless de PrismaNeon.
- `DIRECT_URL`: endpoint directo, sin `-pooler`, que `prisma.config.ts` prioriza
  para `migrate deploy`/CLI.

En Prisma 7 `directUrl` fue eliminado de `schema.prisma`; no lo añadas ahí. El
archivo config es el origen de la URL de migración, y el runtime recibe
`DATABASE_URL` por el adapter. En local ambas variables pueden usar la misma URL
directa de Neon. `prisma generate` se ejecuta en `apps/api` dentro del build.
Este generador `prisma-client` con driver adapter no requiere `binaryTargets`:
no se configura el motor binario antiguo específico de Vercel.

## Workspace pnpm en Vercel

El lockfile y `pnpm-workspace.yaml` están en la raíz; `stellar-domain` vive en
`packages/stellar-domain`, fuera de `apps/api` y `apps/web`. Para cada proyecto
Vercel, elige Root Directory `apps/api` o `apps/web`, respectivamente, y habilita
la opción del proyecto para incluir archivos fuente fuera del Root Directory.
Así el build puede ver `pnpm-workspace.yaml`, `pnpm-lock.yaml` y
`packages/stellar-domain`. Conserva la instalación de workspace detectada por
Vercel; si configuras un comando manual, instala también dependencias transitivas
del workspace, por ejemplo `pnpm install --filter @stellar-payment-request/api...`.

El API usa la detección nativa de NestJS de Vercel: `src/main.ts` es un
entrypoint reconocido y la aplicación completa se empaqueta como una Function.
`apps/api/vercel.json` configura `maxDuration: 60` para esa Function. Vercel
Hobby permite hasta 300 s con Fluid Compute; 60 s supera el polling de 30 s que
usa `RegistryService` y reserva margen para RPC. Si el cliente/function se
interrumpe, el registro ya enviado queda `PENDING`; consulta
`GET /api/v1/registry/:requestId` para reconciliarlo.

Los tests no forman parte de los build commands de Vercel: API `build` compila
dominio, genera Prisma y compila Nest; web `build` ejecuta `next build`. No
configures Vercel para ejecutar `pnpm test`/Playwright.

## Pasos

1. **Crear Neon.** Crea un proyecto PostgreSQL Free en la región más cercana a
   la Function API y conserva sus dos connection strings.
2. **Configurar conexión.** Copia `.env.example` a la raíz como `.env`. Pon el
   URL pooled con `-pooler` en `DATABASE_URL` y el directo sin pooler en
   `DIRECT_URL`; ambos requieren TLS (`sslmode=require`). En Vercel se
   configurarán como variables del proyecto API, no en archivos versionados.
3. **Aplicar migraciones.** Desde la raíz, con `DIRECT_URL` disponible localmente:

   ```powershell
   corepack pnpm --filter @stellar-payment-request/api prisma:deploy
   ```

   Prisma CLI usa `DIRECT_URL`; genera primero con
   `corepack pnpm --filter @stellar-payment-request/api prisma:generate` si hace
   falta. No ejecutes migraciones durante el build de cada request.

4. **Compilar contrato.** Instala/usa Rust con `wasm32v1-none`, SDK `28.0.0` y
   Stellar CLI `28.1.0`:

   ```powershell
   Push-Location contracts/request-registry
   cargo test
   stellar contract build
   Get-FileHash -Algorithm SHA256 target/wasm32v1-none/release/request_registry.wasm
   Pop-Location
   ```

5. **Crear cuenta deployer local en Testnet.** En la misma sesión PowerShell y
   antes de ejecutar `stellar`, define la RPC y passphrase; no confíes en que la
   variable de aplicación `SOROBAN_RPC_URL` sea la variable CLI `STELLAR_RPC_URL`:

   ```powershell
   $env:STELLAR_RPC_URL = "https://soroban-testnet.stellar.org"
   $env:STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
   stellar network add testnet --rpc-url $env:STELLAR_RPC_URL --network-passphrase $env:STELLAR_NETWORK_PASSPHRASE
   stellar keys generate stellar-desk-deployer --network testnet --fund --secure-store
   stellar keys address stellar-desk-deployer
   ```

   La CLI 28.1.0 también acepta `STELLAR_RPC_URL` y
   `STELLAR_NETWORK_PASSPHRASE` desde el entorno de la sesión. La app usa
   `SOROBAN_RPC_URL`; son nombres distintos. No uses `--as-secret` ni imprimas
   la seed.

6. **Desplegar contrato.** Desde `contracts/request-registry`:

   ```powershell
   stellar contract deploy --wasm target/wasm32v1-none/release/request_registry.wasm --source-account stellar-desk-deployer --network testnet --alias request-registry
   ```

   Guarda localmente el Contract ID devuelto y compara hash/WASM con el artefacto.

7. **Guardar Contract ID.** Actualiza `SOROBAN_CONTRACT_ID` en `.env` raíz y
   verifica operaciones de upload y create en Stellar Expert. Actualiza también
   la variable Vercel API en el siguiente paso.
8. **Proteger deployer.** La secret/seed del deployer nunca se sube al repo, a
   GitHub, Vercel, logs, `.env.example` ni al backend. El deployer es local; el
   API no lo necesita.
9. **Crear proyecto API en Vercel.** Importa el repo y establece Root Directory
   `apps/api`; activa el acceso a fuentes fuera del root para el workspace
   `packages/stellar-domain`. Elige runtime/framework NestJS detectado, Node.js
   22.14+ (o 24 LTS compatible), y build command `pnpm build`.
10. **Configurar variables del API.** En Production configura `DATABASE_URL`
    pooled, `DIRECT_URL` directo, `FRONTEND_ORIGIN` con el dominio de producción
    de la web, `STELLAR_NETWORK=TESTNET`, `HORIZON_URL`, `SOROBAN_RPC_URL`,
    `SOROBAN_CONTRACT_ID` actual y opcionalmente `COINGECKO_BASE_URL` /
    `PRICE_CACHE_TTL_SECONDS`. Vercel aporta `PORT`. CoinGecko no necesita key.
11. **Desplegar API.** Publica el proyecto y comprueba
    `https://<api-host>/api/v1/health` y `/api/docs`.
12. **Crear proyecto web.** Importa el mismo repo como segundo proyecto Vercel,
    Root Directory `apps/web`, acceso a fuentes fuera del root y framework
    Next.js detectado.
13. **Configurar frontend.** En Production configura
    `NEXT_PUBLIC_API_URL=https://<api-host>/api/v1` (puede incluir el prefijo;
    el cliente lo normaliza). Redeploy después de modificarla porque es una
    variable pública incluida en build.
14. **Desplegar web.** El build command es `pnpm build`/`next build`; no llama a
    Vitest ni Playwright. Abre la URL de producción.
15. **Cerrar CORS.** Actualiza `FRONTEND_ORIGIN` del API al origen HTTPS exacto
    de producción, guarda y redespliega API. CORS admite un origen. Los dominios
    preview de Vercel quedan bloqueados salvo que configures explícitamente el
    origen correspondiente en ese entorno y redespliegues el API.
16. **Smoke tests finales.** Prueba health, creación XLM, calculadora, endpoint
    trustline, `prepare`, `submit` con Freighter Testnet y
    `GET /registry/:requestId`. Confirma QR/URI, CORS desde dominio de producción,
    estado SUCCESS y tx hash en Stellar Expert. No registres secretos ni XDR en
    logs.

## Testnet: RPC y reinicio

Testnet se reinicia periódicamente. Después de un reset, repite compile/deploy,
actualiza Contract ID tanto en el `.env` raíz como en Vercel, redespliega API y
verifica nuevos registros. Un contrato nuevo no hereda las entradas anteriores.

El `.env` del proyecto contiene `SOROBAN_RPC_URL`, un endpoint RPC público que
no lleva passphrase. Stellar CLI 28.1.0 expone `STELLAR_RPC_URL` y
`STELLAR_NETWORK_PASSPHRASE` como variables propias; antes de usar `stellar` en
esta carpeta, define ambas explícitamente en la sesión para fijar el mismo
endpoint y la passphrase Testnet. La API continúa usando `SOROBAN_RPC_URL`.

## Restricciones y riesgos

- El API permite solo `FRONTEND_ORIGIN`; no se abren previews con wildcard.
- No existe rate limiting para `/registry/submit` ni `/calculator/xlm-usd`.
- La Function puede acabar con respuesta `PENDING`; el GET de registry
  reconcilia con RPC.
- `signedXdr` se transmite en la petición para su validación/envío y no se
  persiste. Ningún secreto de wallet/deployer viaja por el backend.

Referencias: [NestJS en Vercel](https://vercel.com/docs/frameworks/backend/nestjs),
[máxima duración Hobby](https://vercel.com/docs/functions/limitations#max-duration),
[monorepos Vercel](https://vercel.com/docs/monorepos),
[Neon + Prisma](https://neon.com/docs/guides/prisma),
[Prisma config v7](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference).
