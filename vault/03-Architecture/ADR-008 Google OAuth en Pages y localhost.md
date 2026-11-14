---
tags: [architecture, auth, google, cloudflare]
status: decided
updated: 2026-11-14
sources:
  - https://developers.google.com/identity/protocols/oauth2/web-server
  - https://developers.cloudflare.com/pages/functions/routing/
---
# ADR-008 Google OAuth en Pages y localhost

El propietario solicitó vincular Google en localhost:5173 y lightminute.pages.dev.
La identidad Google usa un único manejador de servidor, ejecutado por Vite en
desarrollo y Pages Functions en producción. El secreto OAuth y la clave de sesión
permanecen en `.env` ignorado o en secretos de Cloudflare; nunca en `VITE_*`.

Se usan authorization code, PKCE, state, nonce, firma/issuer/audience del ID token
y cookies HttpOnly de una hora. No se conservan access/refresh tokens. La identidad
Google no otorga roles clínicos ni modifica la autenticación demo de Earth link.

El responsable del despliegue añadirá manualmente las variables de Cloudflare y
las URI de retorno de Google. No se desplegó desde esta cuenta ni se completó un
consentimiento Google real. Detalles y comprobaciones: [guía OAuth](../../docs/google-oauth.md).

Relacionado: [[00-Home]] · [[Board]] · [[ADR-001 Motor decide LLM explica]].
