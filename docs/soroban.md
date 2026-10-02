# Soroban Testnet

## Contrato desplegado

| Dato                                 | Valor                                                                                                                                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID actual                   | `CBUOOQIOVHRV7HEC7KOCT6SQLM6HHPCOMDG233VLVXEDVREGLOXXKXYZ`                                                                                                                                           |
| WASM SHA-256 completo                | `f9c77c8ccd4982463d17381d30de5eda37dd9c5680c55a2e4205d32af7e05084`                                                                                                                                   |
| Subida del WASM                      | [tx `39642f020c201430041e848a471b5db82ebde2bca127e19a41b67786d9d627ea`](https://stellar.expert/explorer/testnet/tx/39642f020c201430041e848a471b5db82ebde2bca127e19a41b67786d9d627ea)                 |
| Creación del contrato                | [tx `02e522c8851af55cff1710cdf826f538cff4b62bb1d4d623fa9e7613520471d6`](https://stellar.expert/explorer/testnet/tx/02e522c8851af55cff1710cdf826f538cff4b62bb1d4d623fa9e7613520471d6)                 |
| Registro SUCCESS del contrato actual | [tx `07c7805d72e545e9ff3f2bda9c874764024c59b5a50713dbb3d1d78cf9794ef5`, ledger 4978095](https://stellar.expert/explorer/testnet/tx/07c7805d72e545e9ff3f2bda9c874764024c59b5a50713dbb3d1d78cf9794ef5) |
| Contract explorer                    | [Stellar Expert, Testnet](https://stellar.expert/explorer/testnet/contract/CBUOOQIOVHRV7HEC7KOCT6SQLM6HHPCOMDG233VLVXEDVREGLOXXKXYZ)                                                                 |
| SDK Rust                             | `soroban-sdk 28.0.0`                                                                                                                                                                                 |
| Stellar CLI                          | `28.1.0`                                                                                                                                                                                             |

El SHA-256 anterior fue comparado con el WASM local optimizado y con el hash
publicado por Stellar Expert. La cuenta creator es pública; no se publica aquí
ninguna private key/seed.

## Registro SUCCESS histórico reportado

Se reportó una invocación `SUCCESS` en ledger `4078095`:
[ver ledger en Stellar Expert](https://stellar.expert/explorer/testnet/ledger/4078095).
Ese ledger corresponde al 11 de agosto de 2026. La inspección pública de sus
transacciones no encontró una llamada `register` al Contract ID actual, que se
creó el 2 de octubre de 2026; la cifra `4078095` y su SUCCESS son una referencia
histórica reportada, no la transacción del contrato de esta página. Sí se
verificó después un `register` SUCCESS del contrato actual en ledger `4978095`,
enlazado en la tabla anterior.

## Interfaz y propiedades

El contrato expone únicamente:

- `register(registrant: Address, request_hash: BytesN<32>)`: requiere
  `registrant.require_auth()`, rechaza una clave existente y guarda registrant,
  timestamp y ledger.
- `exists(request_hash: BytesN<32>) -> bool`.
- `get(request_hash: BytesN<32>) -> Option<Registration>`.

No tiene funciones administrativas, recuperación de claves ni actualización de
código. El deployer no conserva poder sobre las entradas ni puede cambiar la
lógica del contrato desplegado. No invoca transferencias, no procesa ni
garantiza pagos y no almacena destination, importe, memo o URI. El hash es una
huella verificable, no cifrado.

El almacenamiento es Persistent con TTL renovable: las lecturas extienden el
TTL a 120.000 ledgers cuando quedan menos de 100.000. Testnet puede reiniciarse y
las entradas también pueden expirar si no se consultan; el registro no se debe
describir como almacenamiento permanente.

## Redespliegue

1. Compila el código con Stellar CLI `28.1.0` y revisa el hash SHA-256 generado.
2. Despliega el WASM a Testnet con una identidad local protegida.
3. Verifica el Contract ID, el WASM hash y las transacciones de upload/create en
   Stellar Expert.
4. Actualiza `SOROBAN_CONTRACT_ID` en el único `.env` raíz para local y en la
   variable del proyecto API en Vercel; haz un nuevo deployment del API.
5. Realiza un registro nuevo y actualiza los enlaces de evidencia.

Un nuevo Contract ID apunta a storage distinto: no hay migración de registros
entre contratos. La clave de la identidad deployer se mantiene local y jamás se
copia a Vercel, Git, `.env.example` ni a la aplicación.

## Comandos de referencia

Las instrucciones Windows completas, incluidos los valores de entorno de
Stellar CLI, están en [deployment.md](deployment.md). Build/test local:

```powershell
Push-Location contracts/request-registry
cargo fmt --check
cargo test
stellar contract build
Get-FileHash -Algorithm SHA256 target/wasm32v1-none/release/request_registry.wasm
Pop-Location
```
