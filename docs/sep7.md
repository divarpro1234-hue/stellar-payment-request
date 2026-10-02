# SEP-7

La API genera URI canónica con esquema `web+stellar:pay`. El frontend muestra y
codifica exactamente esa URI; no vuelve a calcular sus parámetros.

## Parámetros

El orden generado es `destination`, `amount`, parámetros del asset, parámetros
de memo y `network_passphrase` cuando la red es TESTNET.

| Caso           | Parámetros                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| XLM            | `destination`, `amount`; no se incluyen `asset_code` ni `asset_issuer`.                                               |
| Activo emitido | `destination`, `amount`, `asset_code`, `asset_issuer`; el issuer es obligatorio y debe ser una cuenta Stellar válida. |
| Memo TEXT      | `memo` y `memo_type=MEMO_TEXT`; máximo 28 bytes UTF-8.                                                                |
| Memo ID        | `memo` y `memo_type=MEMO_ID`; decimal sin signo hasta `18446744073709551615` (u64).                                   |
| TESTNET        | `network_passphrase=Test SDF Network ; September 2015`.                                                               |

Cada nombre y valor se codifica con `encodeURIComponent`. El monto se conserva
como decimal textual positivo, con hasta siete decimales; no se usa float para
formatear importes.

## Ejemplos

XLM Testnet sin memo:

```text
web+stellar:pay?destination=G...&amount=2.5&network_passphrase=Test%20SDF%20Network%20%3B%20September%202015
```

Activo emitido con memo TEXT: la URI agrega `asset_code=USDC`,
`asset_issuer=G...`, `memo=demo-1234` y `memo_type=MEMO_TEXT`; los caracteres
reservados se percent-encodan.

El QR representa la URI completa. Wallets deben probarse una por una: describe
la integración como “wallets compatibles con SEP-7”, no como soporte universal.
