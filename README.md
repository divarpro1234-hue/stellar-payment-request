# Generador de solicitud de pago para Stellar

Proyecto académico no custodial. Este módulo crea únicamente la estructura del
monorepo; no implementa pagos, SEP-7, autenticación ni conexión con wallets.
Nunca se deben recibir ni almacenar claves privadas Stellar, secret seeds o
frases semilla, incluyendo archivos, variables de entorno, base de datos y logs.

## Requisitos e instalación

- Node.js 22.14 o superior (recomendado: Node.js 24 LTS).
- pnpm 10.32.1, fijado en `packageManager`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Si pnpm no está en PATH, se puede usar `corepack pnpm` en lugar de `pnpm`.
Si `corepack enable` requiere permisos globales, después de instalar las
dependencias ejecutar `corepack enable --install-directory node_modules/.bin pnpm`
para que los scripts internos también encuentren pnpm sin instalación global.
Web: http://localhost:3000. API: http://localhost:3001/api/v1/health.
El endpoint devuelve `{"status":"ok"}`.

La configuración predeterminada no requiere variables de entorno. Para cambiar
el puerto de la API, copiar `.env.example` a `apps/api/.env` y ajustar `PORT`.

## Comandos

| Comando       | Función                                             |
| ------------- | --------------------------------------------------- |
| `pnpm dev`    | Inicia Next.js y NestJS en modo desarrollo          |
| `pnpm build`  | Compila las aplicaciones y el paquete compartido    |
| `pnpm lint`   | Ejecuta ESLint y comprueba el formato con Prettier  |
| `pnpm test`   | Compila la API y verifica el endpoint HTTP de salud |
| `pnpm format` | Aplica Prettier                                     |

Web y dominio todavía no contienen pruebas; `test` ejecuta las pruebas existentes.

## Estructura

```text
apps/
  web/                       Next.js, App Router y TypeScript
  api/                       NestJS y TypeScript
packages/
  stellar-domain/            Paquete vacío para reglas compartidas
contracts/
  request-registry/          Esqueleto Rust para Soroban
docs/                        Documentación
scripts/                     Automatizaciones futuras
```

TypeScript comparte las opciones estrictas de `tsconfig.base.json`; cada paquete
configura su compilación. ESLint usa configuración plana y Prettier controla el
formato. Las dependencias quedan registradas en `pnpm-lock.yaml` para GitHub.

## Módulos posteriores

PostgreSQL con Prisma, reglas Stellar, SEP-7, integración con wallets y contrato
Soroban se implementarán más adelante. No se instalan esas dependencias ahora.
Vercel es el destino final previsto; el despliegue de web y API y su configuración
se abordarán en el módulo correspondiente. No se ha creado un repositorio remoto.

Referencias oficiales para esta estructura:
[Next.js](https://nextjs.org/docs/app/getting-started/installation) y
[NestJS](https://docs.nestjs.com/first-steps).
