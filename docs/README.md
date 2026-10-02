# Documentación de Stellar Desk

- [Arquitectura](architecture.md): límites de confianza, servicios y diagrama Mermaid.
- [API](api.md): endpoints, payloads y errores.
- [SEP-7](sep7.md): URI, validación y codificación.
- [Soroban](soroban.md): contrato, seguridad, despliegue y referencias Testnet.
- [Despliegue](deployment.md): Vercel Hobby, Neon Free, variables y redespliegue.
- [Demo](demo-guide.md): guion de 5 a 10 minutos y plan B.

Principio obligatorio: aplicación no custodial. La clave de deployer no se sube a
Vercel ni al repositorio; el servidor no solicita private keys, no firma y no
almacena XDR firmado.
