# Stellar Desk

Aplicación académica no custodial para crear solicitudes SEP-7 de Stellar,
comprobar trustlines, consultar una referencia XLM/USD y registrar una huella
SHA-256 en Soroban Testnet. La aplicación no recibe ni almacena claves privadas,
no firma transacciones y no procesa ni garantiza pagos.

## Equipo

| Integrante | Rol                      |
| ---------- | ------------------------ |
| Divar      | Integración técnica      |


## Stack

- Web: Next.js App Router, React, TypeScript y Playwright.
- API: NestJS, Prisma ORM 7, Neon PostgreSQL y `@prisma/adapter-neon`.
- Dominio: package TypeScript `@stellar-payment-request/stellar-domain`.
- Blockchain: Soroban Testnet, contrato Rust con `soroban-sdk 28.0.0`.
- Datos externos: Horizon y Soroban RPC Testnet; CoinGecko keyless.
- Despliegue previsto: Vercel Hobby para web y API, Neon Free.

## Ejecución local

Requisitos: Node.js 22.14 o superior, Corepack, Rust con `wasm32v1-none` y
Stellar CLI 28.1.0 para compilar/desplegar el contrato. El repositorio fija
`pnpm@10.32.1`. En Windows, usa `corepack pnpm` si pnpm no aparece en `PATH`.

Hay un solo archivo de entorno local: copia `.env.example` a `.env` en la raíz
del repositorio y completa las URLs de Neon. No crees `apps/api/.env` ni subas
`.env` a Git. NestJS y Prisma CLI resuelven explícitamente ese `.env` raíz; en
Vercel las variables se configuran en los dashboards de los proyectos.

```powershell
Copy-Item .env.example .env
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @stellar-payment-request/web exec playwright install chromium
corepack pnpm dev
```

Web: <http://localhost:3000>. API health: <http://localhost:3001/api/v1/health>.
Swagger: <http://localhost:3001/api/docs>.

```powershell
corepack pnpm lint
corepack pnpm test
corepack pnpm build
Push-Location contracts/request-registry; cargo test; Pop-Location
```

`pnpm test` incluye Vitest, pruebas Node del API/dominio y E2E Playwright con
respuestas mock; no requiere Testnet, Horizon ni CoinGecko.

## Contrato Testnet

- Contract ID: `CBUOOQIOVHRV7HEC7KOCT6SQLM6HHPCOMDG233VLVXEDVREGLOXXKXYZ`.
- WASM SHA-256: `f9c77c8ccd4982463d17381d30de5eda37dd9c5680c55a2e4205d32af7e05084`.
- Contrato en Stellar Expert: [RequestRegistry en Testnet](https://stellar.expert/explorer/testnet/contract/CBUOOQIOVHRV7HEC7KOCT6SQLM6HHPCOMDG233VLVXEDVREGLOXXKXYZ).
- Subida WASM: [transacción `39642f…d627ea`](https://stellar.expert/explorer/testnet/tx/39642f020c201430041e848a471b5db82ebde2bca127e19a41b67786d9d627ea).
- Creación del contrato: [transacción `02e522…471d6`](https://stellar.expert/explorer/testnet/tx/02e522c8851af55cff1710cdf826f538cff4b62bb1d4d623fa9e7613520471d6).
- Registro de prueba con estado SUCCESS en Testnet, ledger 4978095: [transacción `07c780…794ef5`](https://stellar.expert/explorer/testnet/tx/07c7805d72e545e9ff3f2bda9c874764024c59b5a50713dbb3d1d78cf9794ef5).

Testnet se reinicia periódicamente: el ID anterior puede dejar de estar
disponible. El procedimiento de redespliegue y la actualización de ID están en
[Despliegue](docs/deployment.md). Consulta [Soroban](docs/soroban.md) para los
detalles del contrato.

## Documentación

- [Arquitectura](docs/architecture.md)
- [API](docs/api.md)
- [SEP-7](docs/sep7.md)
- [Contrato Soroban y datos de despliegue](docs/soroban.md)
- [Preparación de despliegue](docs/deployment.md)
- [Guía de demostración](docs/demo-guide.md)
- [QA, seguridad y pruebas](QA_REPORT.md)

## Principios del demo

- Usa la expresión “wallets compatibles con SEP-7”, no “cualquier wallet”.
- El contrato registra una huella verificable; no procesa ni garantiza el pago.
- Un hash es una huella determinista, no cifrado ni anonimización reversible.
- La secret del deployer vive solo en el equipo del operador y nunca en el
  servidor, Vercel, variables de proyecto o repositorio.

## ¿Qué es?
Stellar Desk es una aplicación web académica que ayuda a crear solicitudes de pago
para la red Stellar y a dejar una huella verificable de cada solicitud en una
blockchain de pruebas (Testnet). No maneja dinero real, no guarda claves privadas
y no procesa pagos.

## Mi participación
Desarrollé la implementación técnica del proyecto (frontend, API, base de datos y
contrato en Rust) planificando la arquitectura y dirigiendo agentes de IA que
generaron el código. [Si es cierto: Revisé, probé y ajusté el resultado.]
Este proyecto fue realizado en equipo; los roles de cada integrante están abajo.
