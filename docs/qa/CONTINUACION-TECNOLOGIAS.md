# Continuación: diez tecnologías de LIGHTMINUTE

> **Actualización 15-nov, continuación:** el runtime Pyodide y los paquetes NumPy/SciPy
> ya se sirven desde el mismo origen y una prueba real generó un escenario sin red.
> Se añadieron firmas Ed25519 de escenarios y verificación de auditorías en navegador.
> Estas modificaciones están en el árbol local y requieren revisión final y CI antes
> de considerarlas listas para publicar; el resto de esta nota conserva el handoff anterior.

Estado guardado el 14 de noviembre de 2026, 23:34 aproximadamente, hora de Bogotá.
El árbol de trabajo contiene cambios de esta tarea y archivos modificados previos;
no hacer reset ni sobrescribirlos. El usuario pidió continuar a las 03:40 de Bogotá.

## Hecho y verificado durante esta sesión

- PWA: manifest, iconos derivados del logo, service worker con precache del build
  y exclusión de `/api/`; recarga offline real en Playwright pasó. No implica que
  el backend de comunicaciones funcione offline.
- FHIR: exportación sintética de ejemplo para FC/temperatura; test pasa. No afirma
  conformidad con perfiles FHIR: faltan fecha de adquisición y validación formal.
- Voz: dictado con Web Speech para notas sintéticas, con aviso de posible proveedor
  externo; prueba Playwright con reconocimiento simulado pasó antes de integrar Pyodide.
- Bluetooth: lectura local y separada de simulación, sin guardar ni enviar datos;
  decodificador 8/16 bits probado. No se probó con dispositivo físico.
- Propiedades: Hypothesis verifica orden de urgencia y números inventados en
  titular; la prueba pasa en `%TEMP%/lightminute-property-env`. CI preparado.
- Dependencias: `docs/supply-chain/` contiene CycloneDX npm, npm audit y pip-audit;
  cero hallazgos conocidos en esa resolución puntual, sin lock Python reproducible.
- Conformal: preregistro commit `684767c`; código y resultados sintéticos locales
  en `ml/proxy/`. `python ml/proxy/test_adaptive_conformal.py` pasó 3 tests.
  No sustituye el motor ni prueba garantías clínicas.

## Registro histórico: motor en navegador

El primer intento desde jsDelivr no completó la carga. Posteriormente se sirvieron
el runtime y las ruedas desde el mismo origen y se verificó el motor real en un
worker con la red desactivada, además de comparar el escenario contra Python.
El botón tiene límite de tiempo y conserva el escenario estático ante errores.

Se descargaron las ruedas NumPy y SciPy en
`apps/crew-tablet/public/assets/pyodide/`; sus SHA-256 coinciden con el lock
Pyodide 314.0.8. El runtime también se copia desde el paquete fijado en npm.
Las ruedas tienen 2.960.568 y 14.029.750 bytes; el build verifica sus hashes.
El resultado se probó en Chromium, no en todos los navegadores.

## Pendiente

- Las firmas Ed25519 de escenarios y auditoría están implementadas y probadas;
  falta establecer respaldo seguro, verificación independiente y política de
  rotación de la clave privada. Firma no es cifrado.
- DOI/Zenodo: el repositorio se comprobó privado. No hacerlo público sin orden
  explícita y no inventar DOI.
- Confirmar integración real del sensor Bluetooth con hardware y consentimiento.
- Completar documentación, tests de accesibilidad/interacciones, verificar PWA
  después de todos los cambios y actualizar SBOM/audit tras cambiar dependencias.
- Revisar los nuevos preregistros, ejecutar CI y no presentar los experimentos
  sintéticos como evidencia clínica. No subir pesos SLM ni claves privadas.

El servicio `npm run preview` puede seguir activo en el puerto 4173 (sesión de
herramienta 85012); detenerlo únicamente si estorba. No se hizo push de estos
cambios. El commit local `684767c` contiene únicamente el preregistro conformal.
