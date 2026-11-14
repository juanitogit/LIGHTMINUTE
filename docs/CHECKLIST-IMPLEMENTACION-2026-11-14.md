# TETHER — checklist de implementación y comprobación

> **Actualización de integración, 14 de noviembre:** el propietario autorizó expresamente «haz merge y luego push». Se integra el trabajo revisado con `origin/main` en `41a9da2`, conservando el nombre LIGHTMINUTE y su logo. Las referencias siguientes a HEAD `45188ca` y a ausencia de commit/push describen el cierre anterior a esta autorización. El resultado de publicación se comprueba contra el historial y el remoto; las pruebas locales no equivalen a CI remota.

Fecha: **14 de noviembre de 2026**. Evento: **Space Apps Challenge Neiva 2026**.
Repositorio local: `C:\Users\abel1\Desktop\tether-kit\tether-kit\project`.
Base Git: **45188cada0ce495e446dfd95822bad6c2a206b88**, con cambios locales sin commit.

**No se hizo push, commit, merge, despliegue, cambio de visibilidad ni envío de la candidatura. Solo el propietario puede ordenar el push.**

## Resultado y alcance

Se cerraron los defectos reproducidos del contrato de tarjetas, hechos/ausencias,
fallbacks, paneles y herramientas de demo. Se añadió PVT demo, check-in local,
pruebas reales de navegador, material visual y runbook. El MVP local fue ejercitado
con y sin API; no se presenta como software médico ni como operación de vuelo.

Las casillas marcadas describen trabajo ejecutado. Las pendientes distinguen
publicación, evidencia externa y capacidades futuras. No significan que todo el
roadmap de AstroVital o una solución clínica esté implementado.

## Orquestación realizada

| Participante | Trabajo concreto | Evidencia |
|---|---|---|
| **OpenCode instalado, por CLI** | Cuatro rondas del verificador: esquema, tipos, números, signos, urgencia, acciones deterministas y red-team | `handoff/opencode-checklist.md`; no necesitó una ventana visible |
| **FreeBuff instalado, por su interfaz** | Radiation/Validation, PVT/check-in inicial, smoke, Playwright, capturas y segunda ronda de correcciones | `handoff/freebuff-checklist.md` |
| **Agentes internos coordinados desde Codex** | Hechos/pipeline/fallbacks, tooling, consolidación documental y revisión independiente | `handoff/facts-checklist.md`, diffs y regresiones |
| **Integración final en Codex** | Revisar y corregir hallazgos de las entregas, fuentes, prompt real, teclado/storage, consola, CI preparada, ensayos y videos | Pruebas y artefactos enumerados abajo |

- [x] Se dividieron rutas para evitar ediciones simultáneas del mismo componente.
- [x] A todos los participantes se les prohibió publicar y ejecutar operaciones Git de escritura.
- [x] Se revisaron las entregas; no se aceptaron solo porque el agente dijera que pasaban.
- [x] Las revisiones encontraron bypasses adicionales, que se convirtieron en regresiones.
- [x] No se desactivaron protecciones de seguridad ni se expusieron claves.
- [x] Antigravity no se utilizó: OpenCode y FreeBuff cubrieron las tareas asignadas.

## 1. Tarjetas y verificador — correcciones prioritarias

- [x] **Esquema completo:** campos obligatorios y extra, tipos, enums, tamaños y listas se comprueban antes de aceptar una tarjeta.
- [x] **JSON arbitrario:** listas, campos con objetos y citas no hashables producen rechazo controlado; no una excepción sin fallback.
- [x] **Nivel fijo:** el LLM no puede bajar ni subir `level`; coincide con el motor y con el routing mostrado.
- [x] **Confianza fija:** tampoco puede convertir confianza baja en alta.
- [x] **Hechos fijos:** `what_changed` debe ser idéntico a la plantilla del caso. Se cerraron `HR999`, cifras pegadas a unidades, decimales iniciales, exponentes, cambios de signo y reutilización de HR como temperatura/probabilidad.
- [x] **Acciones fijas:** `do_now`, `monitor`, `escalate_if` y `ground_message` deben coincidir con la plantilla determinista. Esto incluye instrucciones con cantidades escritas en palabras.
- [x] **Explicación acotada:** solo headline/why pueden variar, sin nuevas cifras ni probabilidades; mantienen filtros de diagnóstico/dosis y citas de KB.
- [x] **Casos adversarios ampliados:** de 30 a **39**, todos rechazados con la razón esperada.
- [x] **Prompt coherente:** se eliminaron instrucciones contradictorias que permitían subir urgencia y se envía la tarjeta determinista exacta que el modelo debe conservar.
- [x] **Fallback también verificado:** el modo sin LLM no evita la comprobación de la plantilla.
- [x] **Fallos de inicialización:** importar el SDK, construir el cliente o preparar el prompt puede fallar y aun así devolver plantilla, con intentos/uso cero y error sanitizado.
- [x] **Timeout del cliente explícito:** 10 segundos y sin reintentos automáticos del SDK; se conserva el reintento controlado del servicio.

**Límite:** los filtros de lenguaje son defensa en profundidad, no prueba de
corrección semántica clínica. Una cita existente tampoco demuestra por sí sola
que todo el párrafo esté sustentado. El modo LLM real sigue sin ensayo contra el
proveedor y no debe presentarse como validado clínicamente.

## 2. Motor, hechos y datos exportados

- [x] HR ausente permanece ausente; nunca se sustituye por temperatura u otra magnitud.
- [x] Se eliminó HR histórica/prior presentada como lectura actual en tarjetas del pipeline.
- [x] Pipeline y API comparten adaptación de hechos y plantilla.
- [x] `df` procede del motor o queda desconocido; se eliminó la fórmula falsa `n_seen - 1`.
- [x] Contexto de misión, demora y hazards proceden del escenario/día real; ya no se fija Marte/11 minutos para todos.
- [x] Rutina, aprendizaje, alerta y patrón compartido producen mensajes distintos.
- [x] La tarjeta compartida incluye comprobar la cabina, sin inventar instrucciones clínicas.
- [x] Se retiraron duraciones arbitrarias de la plantilla general de acciones.
- [x] Seis escenarios strong/mild, índice y demo JSON reexportados.
- [x] El prototipo embebido muestra tarjetas, nivel, confianza y demora del motor; no vuelve a calcular urgencia en la vista.
- [x] Regresión permanente: **576 tarjetas exportadas** pasan el verificador vigente. Este chequeo encontró una regresión de signos que las pruebas anteriores no detectaban.
- [x] El parche previo de alpha se conserva y su prueba de regresión pasa.
- [x] Sugerencias de protocolo derivadas de observaciones, con estado `demo-suggestion`; la tablet muestra advertencia y exige elección manual. No se usan nombres de escenarios como criterio clínico.
- [x] `escalate` se documenta como nivel reservado: no se inventó un umbral automático para completar el enum.

## 3. Fuentes y honestidad de las referencias

- [x] Hash SHA-256 de NOAA y MMASH local coincide con `data/snapshots/manifest.json`.
- [x] Pulso terrestre: se incorporó `EARTH-REST-PULSE`, con URL precisa de MedlinePlus.
- [x] Sueño terrestre: se incorporó `EARTH-ADULT-SLEEP`, con URL precisa de NHLBI y aclaración de que una recomendación no es un límite de daño.
- [x] Temperatura 36,1–37,5 C: mantiene valores del demo, pero ahora dice **demo-parameter / unverified**; no se atribuye a una fuente que da otro rango.
- [x] Reglas espaciales siguen `null` y la UI no presenta valores adaptados como si estuvieran verificados.
- [x] NOAA se identifica como `real-public`, MMASH como `proxy` y tripulación/benchmarks como `synthetic`.
- [x] Se conserva la distinción entre cobertura de intervalos MMASH y detección de eventos; no se afirma recall real sin etiquetas.

Fuentes abiertas durante esta revisión: [MedlinePlus: vital signs](https://www.medlineplus.gov/ency/article/002341.htm),
[NHLBI: how much sleep](https://www.nhlbi.nih.gov/health/sleep/how-much-sleep),
[MedlinePlus: temperature norms](https://medlineplus.gov/ency/article/001982.htm).
Son referencias terrestres, no validación del producto ni protocolos de misión.

## 4. Tablet, protocolos y consola

- [x] Radiation tiene gráfico, eje temporal por timestamp, procedencia, fecha, canal, unidades, etiqueta y limitaciones.
- [x] Contradicciones label/flag pasan a `unverified`; lecturas negativas/fechas ilegibles se descartan y una escala ausente no se convierte en S0.
- [x] La escala NOAA se limita al contrato pfu ≥10 MeV; otras unidades no reciben ese overlay.
- [x] Validation muestra métodos, diseño, calibración, datos faltantes, longitud de baseline y limitaciones.
- [x] Las falsas alarmas se muestran como tasas por crew-week, no como porcentajes de recall.
- [x] Avisos distinguen tripulación sintética de snapshot NOAA público.
- [x] Fallbacks del frontend y backend rechazan un escenario distinto, identidad ausente o identificadores contradictorios.
- [x] Fuentes estáticas malformadas se descartan o generan error controlado.
- [x] Errores de motor son observables sin publicar mensajes que puedan contener secretos; se muestran origen y parámetros efectivos.
- [x] Caché limitada a resultados correctos del motor; fallos/fallbacks no quedan retenidos como éxito.
- [x] **PVT demo interactivo:** diez ensayos, clic o Space, falsos arranques, resultado y persistencia local. No es prueba clínica de aptitud.
- [x] **Check-in demo local:** sueño/mood/síntomas/nota, con límites y aviso explícito de no introducir salud personal real. No alimenta la urgencia ni se envía al servidor.
- [x] Storage corrupto no rompe la vista; un fallo de borrado no oculta falsamente el historial persistido.
- [x] Se comprobó que escribir Space en una nota no cuenta como respuesta PVT y que los clics no cuentan doble.
- [x] Layout comprobado a 390×844; sin desbordamiento horizontal en los estados ensayados.
- [x] Consola y runner probados por `file://`, con done/undo/cannot y cadena de auditoría.
- [x] Fixture de consola regenerado desde el motor vigente, con identidad del escenario; no se muestra CMO al pedir CO₂ si falta su fuente.
- [x] Manipulación de auditoría funciona también con una sola alerta; reconstrucciones asíncronas obsoletas no sustituyen la cadena actual.

**Offline comprobado:** JSON estático sin API y demos embebidas por archivo.
Esto no acredita instalación PWA ni recarga de la aplicación React sin servidor
y sin caché; esa capacidad se mantiene fuera del MVP implementado.

## 5. Tooling, reproducibilidad y CI

- [x] Ownership usa archivos Git versionados y nuevos no ignorados, con nombres separados por NUL. No recorre `.venv`, `node_modules`, dist o temporales.
- [x] Se registraron bóveda, documentos, mockups, scripts de prueba y capturas.
- [x] `check_all.sh` propaga errores y no oculta fallos de tests/validación; hay equivalente PowerShell.
- [x] `make setup` ya no oculta `npm ci` fallido.
- [x] El `test:e2e` anunciado ahora existe y comprueba el contrato servido del build.
- [x] Se añadió `test:e2e:browser`, con regresiones de interacción, datos ausentes e identidad equivocada.
- [x] Se añadió `test:checkin` para corrupción/storage/teclado/conteo.
- [x] Runbook Windows/bash disponible en `docs/demo-runbook.md`.
- [x] Versiones efectivamente usadas guardadas en `docs/ENVIRONMENT-VERIFIED.txt`.
- [x] Workflow local ampliado para ejecutar smoke y navegador en CI después de un push autorizado.
- [ ] El workflow modificado todavía no corrió en GitHub: **no hubo push**. No se afirma CI remota verde de este diff.
- [ ] No hay lock Python multiplataforma certificado; se conserva snapshot de versiones, no una promesa de instalación en todo sistema.
- [ ] Ruff no está instalado en el entorno usado; no se afirma una pasada de lint. Sí pasaron suite Python, typecheck/build y comprobaciones sintácticas JS.

## 6. Resultados efectivamente ejecutados

| Comprobación | Resultado final observado | Alcance |
|---|---|---|
| `.venv/Scripts/python.exe scripts/run_tests.py` | **117/117** | API, motor, QC, escenarios, LLM falso, contratos, fallback y verificador |
| Chequeo de exports incluido en esa suite | **576/576 tarjetas** | Seis escenarios × 24 días × cuatro personas |
| Red-team offline | **39/39 rechazados** | Mutaciones concretas; no exhaustividad semántica |
| `python ml/validation/run_all.py` | **exit 0** | Regeneró informe y JSON; no validación clínica |
| `npm run build` | **exit 0**, 63 módulos | TypeScript y Vite; JS principal ~319 kB / gzip ~99 kB |
| `npm run test:e2e` | **12/12** | Contratos del build servido |
| `npm run test:e2e:browser` | **13/13** | Chrome, API ausente, seis vistas, fixtures inválidos, identidad, persistencia y móvil |
| `npm run test:checkin` | **5 bloques PASS** | Storage corrupto, límites, borrado fallido, teclado y clics |
| `node apps/ground-console/src/audit.test.mjs` | **8/8** | Canonicalización y hashes JS/Python, cadena íntegra/manipulada |
| `node apps/ground-console/browser.test.mjs` | **3 bloques PASS** | Consola y runner por archivo, fallback y recuperación |
| `node scripts/record_demo.mjs` | **PASS** | API real local de tres escenarios + tarjeta plantilla; tablet y grabación sin pageerror |
| Ownership + `git diff --check` | **correctos** | Revisar nuevamente si se añaden archivos después del informe |
| MP4 por ffprobe | **30,000 s y 60,000 s** | Video silencioso con subtítulos ingleses; fotograma revisado |

Las pruebas de fallos simulan SDK, red o storage averiados. Los logs de esa suite
incluyen avisos esperados de motor no disponible; no se confundieron con éxito
del motor ni con fallos ocultos. Algunas ejecuciones dentro del sandbox no podían
conectar a localhost o quedaban sin salida: se reejecutaron con permisos del
entorno y se acreditan únicamente sus resultados completados.

## 7. Documentación, alcance y equipo

- [x] Board es índice vigente; notas de estado/ideas/plan anteriores se marcaron como históricas sin borrar el registro.
- [x] README, arquitectura, entrega, model card y pitch distinguen implementación, prueba y publicación.
- [x] Se retiró la afirmación de validación real n=4 y el lenguaje de aval NASA.
- [x] Métricas de la nota de validación actualizadas desde `results.json`, incluido 70→71 % y cifras de z/CUSUM.
- [x] ADR-005 explica TETHER frente al borrador amplio AstroVital; no se cambió el nombre ni se aprobó automáticamente 3D/DB/auth.
- [x] PDF de mockups: se extrajo el índice de las 26 páginas y se renderizaron; se inspeccionó una muestra visual de portada/flujo/tripulación/analítica. **No se certifica comparación visual exhaustiva de todas las páginas ni del DOCX**.
- [x] Equipo y roles suministrados por el usuario incluidos en README, descripción, entrega y bóveda.
- [x] Cierre suministrado por el usuario: **15-nov-2026, 23:59 America/Bogota**. Congelación 19:59 y envío 20:59 figuran como plan, no como acciones completadas.
- [x] Informe y notas sincronizados en ambas bóvedas al cierre.

| Integrante | Rol confirmado |
|---|---|
| Abel Orlando Ramírez Amaya | Desarrollador Backend & Tester |
| Pablo Trujillo Artunduaga | Desarrollador Backend & Tester |
| Juan Sebastián Tafurth Cortes | Desarrollador DevOps & Documentación |
| Simón Santiago Puentes Peña | Documentación & Base de Datos |
| Juan Esteban Bustos Chilatra | Desarrollador Frontend & Backend & Chatbot |
| José David Correa Núñez | Desarrollador Frontend & DevOps & CI/CD |

## 8. Entregables locales preparados

- [x] Video inglés subtitulado, sin narración: `pitch/demo-assets/tether-demo-30s.mp4`.
- [x] Versión extendida interna: `pitch/demo-assets/tether-demo-60s.mp4`.
- [x] Seis capturas del recorrido grabado: `pitch/demo-assets/demo-*.png`.
- [x] Capturas de vistas, errores honestos, móvil, consola y protocolo: `apps/crew-tablet/screenshots/final-*.png`.
- [x] Script reproducible de ensayo/grabación y subtítulos SRT.
- [x] Guiones, descripción y Q&A existentes revisados junto con sus límites.
- [ ] Elección y aprobación editorial del video por el equipo; son borradores locales, no material ya enviado.
- [ ] Publicación de enlaces, acceso anónimo, revisión de las bases y candidatura efectiva.

**Formato de video:** en respuestas del foro `nasa/spaceapps` se indica un máximo
de 30 segundos o siete slides: [consulta #1947](https://github.com/nasa/spaceapps/discussions/1947),
[consulta #1973](https://github.com/nasa/spaceapps/discussions/1973).
Las páginas de la guía y FAQ devolvieron 502 al consultarlas. Esto no sustituye
la revisión de las bases aplicables a Neiva: se dejó variante de 30 s para evitar
depender del guion inicial de 60 s.

## 9. Pendientes externos y futuro: no cerrados en falso

### Para la entrega

- [x] Orden expresa del propietario para merge y push recibida el 14 de noviembre de 2026. Se conserva el historial remoto y se publica sin force-push.
- [ ] Confirmar bases, formato de presentación, atribuciones/licencias y elegibilidad con la organización; la hora local se recibió del usuario.
- [ ] Verificar visibilidad/acceso anónimo del repo y permisos de enlaces. No se cambió exposición de archivos.
- [ ] Aprobar y alojar el video/enlaces; desplegar la app si se decide incluir URL.
- [ ] Ejecutar CI remota sobre el commit que finalmente se publique y conservar recibo del envío.
- [ ] Ensayo con proveedor real si se pretende afirmar que ese modo funciona. No se usaron claves de otras apps ni se fingió ese ensayo.

### Antes de cualquier uso real

- [ ] Revisión clínica experta de umbrales, protocolos y lenguaje; validación prospectiva y clasificación regulatoria.
- [ ] Evidencia OSDR/Inspiration4 y eventos reales etiquetados; no se afirma que se descargaron o validaron.
- [ ] Privacidad operativa, consentimiento aplicado, almacenamiento multi-sesión y envío store-and-forward durable/firmado. La consola sigue siendo simulación y la cadena hash no es una firma autenticada.

### Roadmap separado del MVP comprobado

- [ ] Instalación PWA y recarga completamente desconectada con service worker.
- [ ] Voz, visión, ASR/TTS y monitoreo de temperatura central 24 h con fuentes apropiadas.
- [ ] Plataforma AstroVital ampliada, simulador 3D, DB, autenticación o hardware, solo si se adopta ese alcance. Varias de estas piezas son no objetivos explícitos del MVP TETHER.

No se incluyeron estas capacidades como funcionalidades terminadas ni se inventaron
fuentes, credenciales, revisión experta o permisos de publicación para marcarlas.

## Cómo reproducir la comprobación local

Desde `project`, con el entorno instalado:

```powershell
.\.venv\Scripts\python.exe scripts/run_tests.py
$env:PYTHONPATH = 'services/engine'
$env:LLM_PROVIDER = 'none'
.\.venv\Scripts\python.exe -m tether_engine.llm.redteam
python scripts/check_ownership.py --overlaps
node apps/ground-console/src/audit.test.mjs
node apps/ground-console/browser.test.mjs
```

Desde `apps/crew-tablet`: `npm run build`, `npm run test:e2e`,
`npm run test:e2e:browser`. `npm run test:checkin` necesita Vite activo en
`http://127.0.0.1:5173/` o `TETHER_TEST_URL`. El ensayo/grabación necesita además
API en :8000, modo `none`, Chrome instalado y el componente ffmpeg de Playwright.
El MP4 final se exportó con ffmpeg del sistema. Los pasos de arranque están en
`docs/demo-runbook.md`.

**Estado de publicación al cerrar:** archivos revisables en el árbol local,
HEAD sigue en **45188ca**. No hay un commit nuevo ni un push pendiente que se
haya ejecutado automáticamente.
