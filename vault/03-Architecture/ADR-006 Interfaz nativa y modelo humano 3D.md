---
tags: [architecture, adr, design, 3d]
status: decided
updated: 2026-11-14
sources: [petición explícita del propietario, docs/native-design.md, assets/models/manifest.json]
---
# ADR-006 — Interfaz sin cards y humano 3D

Actualización: [[ADR-007 Anatomia y flujos de referencia]] sustituye el modelo activo por anatomía
masculina/femenina CC BY 4.0. El resto conserva la decisión de diseño original.

El propietario rechazó cards, píldoras y la silueta 2D. Esta instrucción reemplaza esa parte del
[[ADR-005 Identidad y fuente de verdad]], manteniendo el logo oficial y los invariantes del motor.

La interfaz usa listas, separadores, espacio y tipografía de sistema conforme a principios de Apple HIG.
Los estados son icono y texto sin cápsulas. Navegación lateral en ancho regular y barra inferior en compacto.

Se adopta un GLB humano existente de Innerscene/MakeHuman bajo CC0-1.0, alojado localmente.
El archivo y su SHA-256 están en `apps/crew-tablet/public/assets/models/manifest.json`.
Three.js muestra el modelo con rotación manual y controles accesibles, sin bucle de render en reposo.
Los marcadores solo muestran veredictos del motor; no representan anatomía medida ni diagnóstico.
Sin WebGL, la lista de señales sigue disponible y se explica que la vista 3D no está disponible.

El antiguo no-objetivo de 3D queda modificado por la petición explícita del propietario: se integra un
modelo existente, no un simulador anatómico. Esto no completa automáticamente la fase F2 del documento
maestro histórico, que exigía otro GLB específico y evidencia de rendimiento y aceptación propia.

Verificación: build TypeScript/Vite y 14 grupos E2E, incluidos modelo real, rotación, fallback WebGL,
ausencia de cards/píldoras, cuatro anchos y las cinco vistas. Detalle: `docs/native-design.md`.

Relacionado: [[00-Home]] · [[Pulido visual - plan]] · [[Auditoria integral LIGHTMINUTE]].
