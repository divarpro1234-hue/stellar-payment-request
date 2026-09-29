# RequestRegistry

Contrato Soroban no custodial que registra una huella SHA-256 de 32 bytes de
una solicitud SEP-7. No procesa ni valida pagos.

## Datos on-chain

La clave persistente es `Request(BytesN<32>)`. Su valor contiene únicamente:

- `registrant`: dirección que autorizó el registro.
- `created_at`: timestamp del ledger en segundos.
- `ledger`: secuencia del ledger del registro.

No se guarda destination, amount, memo, URI SEP-7, QR, fondos ni datos de
credenciales. El contrato no custodia fondos, no mueve XLM, no transfiere
tokens, no valida pagos y no firma ni envía transacciones. La aplicación calcula
la huella antes de invocar el contrato; el contrato sólo almacena esos bytes.

## TTL

Las entradas usan Persistent Storage y una política renovable, no permanente.
Al registrarse y al consultarse mediante `exists` o `get`, el contrato extiende
el TTL a 120.000 ledgers cuando queden menos de 100.000. Estos valores son
constantes de política operativa, no el máximo del protocolo. Leer regularmente
mantiene una entrada activa; si deja de consultarse, puede expirar y liberar su
clave. Los duplicados sólo se rechazan mientras la clave siga almacenada.

## Compilar y probar

Requiere Rust y Stellar CLI con soporte para Soroban.

```sh
cargo fmt --check
cargo test
stellar contract build
```

`stellar contract build` compila el contrato como WASM optimizado.

## Desplegar a testnet

Usa una identidad de Stellar CLI con fondos de testnet:

```sh
stellar contract deploy \
	--wasm target/wasm32v1-none/release/request_registry.wasm \
	--source <IDENTITY> \
	--network testnet
```

El comando devuelve el ID del contrato. No se requiere una clave dentro del
contrato ni se debe pasar una secret key como argumento.

## Invocar e inspeccionar

El hash se pasa como 32 bytes hexadecimales. Las invocaciones de lectura permiten
inspeccionar existencia y metadatos; `get` devuelve `None` si la clave no está
almacenada o ya expiró:

```sh
stellar contract invoke --id <CONTRACT_ID> --source <IDENTITY> --network testnet \
	-- exists --request_hash <64_HEX_CHARACTERS>

stellar contract invoke --id <CONTRACT_ID> --source <IDENTITY> --network testnet \
	-- get --request_hash <64_HEX_CHARACTERS>
```

Los eventos `RequestRegistered` pueden inspeccionarse en los eventos del ledger
de testnet. Para registrar, la dirección `registrant` debe autorizar la
invocación; los argumentos de registro no incluyen datos de pago.
