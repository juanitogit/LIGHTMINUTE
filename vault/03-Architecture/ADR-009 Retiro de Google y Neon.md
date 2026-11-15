---
tags: [architecture, auth, storage]
status: decided
updated: 2026-11-15
sources:
  - Solicitud del propietario del 2026-11-15 en este chat
---
# ADR-009 Retiro de Google y Neon

**Decisión:** retirar el inicio de sesión Google y la conexión opcional Neon,
incluidas sus rutas y dependencias. [[ADR-008 Google OAuth en Pages y localhost]]
queda como registro histórico. Se conserva SQLite para el enlace de misión y
su inicio de sesión de demostración, independiente de Google.

**Consecuencias:** `/api/database/health` deja de existir; no se introdujo otro
proveedor. El sitio público estático y el motor local no requieren esas cuentas.
Los secretos o recursos externos preexistentes no se eliminan automáticamente.

Relacionado: [[00-Home]] · [[ADR-001 Motor decide LLM explica]].
