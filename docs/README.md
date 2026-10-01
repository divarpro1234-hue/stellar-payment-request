# Documentación

Espacio para arquitectura, decisiones técnicas y documentación académica.

Principio obligatorio: aplicación no custodial. Nunca almacenar claves privadas
Stellar, secret seeds ni frases semilla, tampoco en variables de entorno o logs.

## Registro RequestRegistry

El backend requiere `SOROBAN_RPC_URL`, `SOROBAN_CONTRACT_ID` y
`STELLAR_NETWORK=testnet` (o `public`). NestJS no contiene claves privadas,
no usa `Keypair.fromSecret`, no firma ni altera firmas.

Flujo de firma no custodial:

Backend prepara XDR
→ navegador recibe XDR
→ Freighter solicita consentimiento
→ usuario firma
→ navegador envía XDR firmado
→ backend lo transmite.

`POST /api/v1/registry/prepare` recibe `requestId` y la cuenta pública
`registrant`; devuelve XDR sin firmar, passphrase de red, contrato y hash de la
solicitud. `POST /api/v1/registry/submit` acepta el XDR firmado por Freighter,
comprueba que invoque `register` para el contrato, cuenta y hash esperados, y lo
transmite a Soroban RPC. El estado y ledger se consultan en
`GET /api/v1/registry/:requestId`.

El contrato registra únicamente el hash SHA-256; ni el backend ni el contrato
custodian fondos o datos de pago.

La conversión XLM/USD es una referencia de mercado; no representa ni garantiza
un precio de compraventa. La interfaz deberá atribuirla con el texto: "Datos de
referencia proporcionados por CoinGecko."
