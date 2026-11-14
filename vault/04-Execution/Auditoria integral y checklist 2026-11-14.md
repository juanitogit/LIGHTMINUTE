---
tags: [exec, audit, checklist]
status: verified
updated: 2026-11-14
sources: [revision local sobre 45188ca, codigo y documentos de project, notas de tether-vault, build local, pruebas controladas del verificador, snapshots locales]
---
# Auditoría integral y checklist — 14 de noviembre de 2026

## Dictamen

TETHER tiene un MVP sustancial implementado. Su núcleo es la comparación con la línea base personal, detección de cambios coordinados y tarjetas de apoyo a decisiones. No debe describirse como un sistema clínicamente validado ni como una plataforma operacional completa. Las prioridades son cerrar fallos del contrato de tarjetas, hacer reproducible la verificación local, comprobar la integración visual y consolidar documentación y entrega. Añadir 3D, voz o infraestructura no es la prioridad.

La bóveda contiene buenas decisiones y evidencia, pero mezcla planes iniciales, estados intermedios y cierres posteriores. Que una nota diga `verified` no garantiza que todas sus afirmaciones sigan vigentes.

## Alcance y límites de esta auditoría

- Se inventariaron las 42 notas originales, sus temas y pendientes; se contrastaron alcance, ADR, Board, checklist, investigación y cierres con código, configuración, datos y handoffs. No se verificó externamente cada referencia científica o de competidores.
- Base: `project` en `45188ca`, 264 archivos versionados antes de este informe. El fetch de la revisión anterior confirmó igualdad de `main` y `origin/main`. No se hizo una nueva consulta remota para este informe.
- Las 42 notas externas y su copia versionada coincidían en la revisión anterior. Este informe se copia a ambas bóvedas.
- Verificado ahora: build de tablet, 8 comprobaciones de auditoría JS, hashes de ambos snapshots, dimensiones de escenarios, ausencia de asignaciones de protocolo y fallos concretos del verificador/adaptador.
- No se certifican las 77 pruebas Python históricas ni los 30 casos red-team en esta máquina: Python global carece de FastAPI y el intento usando paquetes del venv no produjo salida y se interrumpió. Esto no demuestra fallo del motor; deja la ejecución local pendiente.
- No se ejecutó la validación estadística completa ni una revisión visual del navegador. No se verificaron visibilidad GitHub, última CI, despliegue, bases del evento o cierre local.
- Se revisó el contenido textual del documento AstroVital en la revisión anterior. El PDF de mockups y el DOCX no recibieron comparación visual página por página: queda pendiente.

## 1. Qué está bien y debe conservarse

- [x] **Tesis y alcance:** resolver evaluación y acción de una tripulación con comunicación demorada; MoSCoW y no objetivos explícitos. Evidencia: `02-Product/Alcance MoSCoW.md`, `project/AGENTS.md`.
- [x] **Separación de responsabilidades:** motor numérico, explicación opcional y respaldo por plantilla. Existe en `pipeline.py` y `llm/card_service.py`. La arquitectura es apropiada para el prototipo; el cumplimiento del verificador necesita las correcciones P0.
- [x] **Motor individual implementado:** NIG, predictiva Student-t, actualización robusta, CUSUM, síndrome y atribución persistente. Evidencia: `services/engine/tether_engine/{bayes,crew}`. Existencia y lectura de código; suite completa pendiente en esta auditoría.
- [x] **Corrección de alpha presente:** `bayes/nof1.py::update` descuenta alpha hacia el prior y existe `test_interval_stays_honest_after_many_updates`. No volver a listar este parche como trabajo ausente.
- [x] **Escenarios reproducibles:** tres escenarios, variantes strong/mild y etiquetas separadas. Se comprobaron 24 días y cuatro tripulantes en cada escenario strong exportado; seis indicadores en el contrato/pipeline.
- [x] **QC antes de aprendizaje:** descarta lecturas imposibles; cada lectura se compara antes de actualizar su línea base. Evidencia: `pipeline.py`, `qc/basic.py`.
- [x] **Tablet real construida:** Glance, Why, Act, Radiation y Validation, selector de escenarios, estado URL y respaldo estático. `npm run build` pasó en esta revisión: 60 módulos, JS principal 294,28 kB / gzip 91,89 kB.
- [x] **Consola y runner existen:** componentes estáticos y protocolos sin dosis; integración del runner en React. Evidencia: `apps/ground-console`, `packages/protocol-runner`, `kb/protocols`, `components/ProtocolRunner.tsx`.
- [x] **Auditoría reproducible:** `node apps/ground-console/src/audit.test.mjs` pasó sus ocho comprobaciones, incluida detección de manipulación. Una cadena hash no equivale por sí sola a firma o autenticación.
- [x] **Procedencia de snapshots:** NOAA y MMASH existen localmente y sus SHA-256 coinciden con `data/snapshots/manifest.json`.
- [x] **Evidencia con límites explícitos:** model card, data card, benchmark comparativo y diagnóstico antes/después. MMASH se declara proxy de cobertura, sin eventos etiquetados para medir detección.
- [x] **Entrega técnica preparada en gran parte:** LICENSE Apache-2.0, ATTRIBUTIONS, workflow CI, README, descripción, guiones y Q&A existen. Existencia no equivale a entrega publicada.

## 2. Corregir antes de habilitar confianza en el LLM — P0

| Pendiente | Evidencia e impacto | Criterio de cierre |
|---|---|---|
| [ ] Validar el JSON Schema completo | `llm/verifier.py::verify_card` no aplica tipos/longitudes/enums completos. Aceptó `monitor: 42`, `confidence: garbage` y `ground_message: {}`. El esquema sí impone tipos. | Validación completa antes de reglas semánticas; entradas incompatibles siempre rechazadas y sustituidas por plantilla. Añadir tests antes del cambio. |
| [ ] Comprobar números y lenguaje en todos los campos visibles | Números solo se revisan en `what_changed`; diagnóstico solo en tres campos. Una tarjeta con `headline: HR 999` o `do_now: [You have confirmed infection]` pasó sin errores en una reproducción controlada. | Ningún campo elude controles; política explícita para números de acciones y unidades; ampliar red-team con estos casos. |
| [ ] Hacer el verificador total frente a JSON arbitrario | `citations: [{}]` provoca TypeError al buscar el dict en un set. `card_service` llama al verificador fuera del try de transporte. | Toda respuesta JSON, incluso malformada semánticamente, produce errores de validación y fallback; no una excepción de API. |
| [ ] Evitar etiquetar otra magnitud como frecuencia cardiaca | `llm/case_data.py::_band` sustituye HR ausente por otro indicador. Con solo temperatura 37 y banda 36–38, `engine_facts` produjo `hr_now: 37`, `hr_lo: 36`, `hr_hi: 38`. | HR ausente se representa como ausente; ninguna tarjeta/API cambia unidades o identidad. Prueba de dropout HR tanto en plantilla como LLM. |
| [ ] Evitar información histórica presentada como actual | `pipeline.py` reutiliza última HR si falta la actual; `case_data` sigue otro fallback. Los caminos pueden discrepar. | Misma política de ausencia en pipeline/API/export; si se muestra último dato, incluir fecha/antigüedad y estado explícito. |
| [ ] Eliminar metadatos de misión fijos del caso LLM | `card_service.MISSION_CONTEXT` siempre dice Mars transit y 11 minutos, aunque hay escenario Moon; hazards se buscan en la entrada de tripulante, mientras el pipeline los publica por día. | Contexto y hazards se derivan del documento/día real, con pruebas de escenarios Mars y Moon. |
| [ ] Corregir los grados de libertad declarados | `case_data.engine_facts` publica `df = n_seen - 1`; el modelo real usa `2 * alpha` con olvido. No es la misma cantidad. | Exportar df real desde el motor o declarar que no está disponible; jamás reconstruirlo con esa fórmula. |

Estos hallazgos son de código y reproducciones locales; no suponen que todas las tarjetas existentes estén incorrectas. Sí invalidan la afirmación general de que el verificador ya garantiza todas las restricciones anunciadas.

## 3. Corregir o mejorar producto e integración — P1

- [ ] **Plantillas según estado y evidencia:** `protocols/templates.py` anuncia un cambio coordinado en el mensaje a Tierra incluso en nivel `info`. Ajustar rutina/aprendizaje/watch/act y evitar afirmar qué señales cambiaron sin comprobarlas. Cierre: mensajes coherentes en días normales y anomalías de los tres escenarios.
- [ ] **Acciones para exposición compartida:** el pipeline ya produce atribución de tripulación, pero la plantilla sigue centrada en HR/sueño. Asegurar que `co2_creep` presenta acciones ambientales y no solo re-medición individual. Cierre: revisar juntos atribución, tarjeta y protocolo, sin inventar pasos clínicos.
- [ ] **Escalada explícita:** `syndrome_level` solo retorna info/watch/act; escalate existe en contratos y routing. Documentar qué dispara escalate o marcarlo como reservado. Cierre: requisito y comportamiento coherentes, con prueba si se implementa.
- [ ] **Protocolo sugerido o selección claramente manual:** se contaron cero `protocol_id` en los tres escenarios strong. El runner existe, pero no hay asociación automática. Cierre: mapeo determinista revisado o UX/documentación explícitas de elección manual.
- [ ] **Radiation con contrato real:** la vista busca `kind/data_kind`, `sources` y `notes`; el JSON aporta `label`, `source/source_url` y `note/why`. Parte de la procedencia y explicación no tiene sección dedicada. Cierre: origen, etiqueta real-public, fecha, unidades, limitaciones y gráfico legibles con el snapshot actual.
- [ ] **Validation orientada a resultados:** la vista es un renderer genérico; no tiene sección dedicada para `calibration` ni `design`. Las métricas anidadas dependen de resúmenes truncados. Cierre: tabla de métodos comparable, cobertura 95 %, faltantes, baseline, protocolo de semillas y limitaciones visibles.
- [ ] **Ensayo visual completo:** cinco vistas, tres escenarios, días normales/onset, todas las personas, móvil/teclado, API activa/caída y JSON ausente. Conservar capturas y resultados. Build no prueba interacción.
- [ ] **Revisar mockup y documento maestro:** comparar visualmente `mockup/NASA_Health_Monitor_UIUX_Mockups.pdf` con la tablet y clasificar cada requisito AstroVital como vigente, futuro o descartado.
- [ ] **Diferenciar respaldo estático y PWA offline:** no se encontró registro de service worker/manifest en el código revisado. No prometer instalación o recarga offline completa; implementarla solo si pasa a alcance aprobado. Cierre: descripción precisa o ensayo offline real tras primera carga.
- [ ] **Ensayar file://:** abrir la consola y demo del runner por doble clic, además del prototipo. No inferir compatibilidad solo de scripts clásicos.

## 4. Reproducibilidad y calidad — P1

- [ ] **Completar verificación Python local:** entorno documentado y funcional; ejecutar `python scripts/run_tests.py`, red-team y smoke API sin clave. Guardar versión Python, comando, resultado y commit. CI usa 3.12; `.venv` local fue creado con 3.14.3.
- [ ] **Reparar el comando e2e declarado:** `apps/crew-tablet/package.json` apunta `test:e2e` a `scripts/smoke.mjs`, archivo ausente en la revisión. Añadir un smoke útil o retirar la promesa del script.
- [ ] **Hacer fiable check_all.sh:** falta `pipefail` para la tubería de tests; `validation FAILED` se imprime mediante `|| echo`, por lo que ese fallo puede terminar con código cero si se alcanza. Cierre: cualquier fallo requerido devuelve estado no cero.
- [ ] **Corregir ownership:** el comando reportó 5.875 problemas por recorrer `.venv` y `dist`, entre otros. En archivos versionados hay 48 sin dueño: 46 bajo vault y DOCX/PDF. Usar archivos Git o exclusiones correctas y registrar rutas; exigir cero problemas reales.
- [ ] **No ocultar fallo de instalación:** `make setup` contiene `npm ci || true`. Cierre: fallo de dependencias se comunica y devuelve error.
- [ ] **Guía Windows y runbook:** falta `docs/demo-runbook.md`; los atajos Make/bash no bastan para esta máquina PowerShell. Cierre: pasos de instalación, arranque en dos terminales, URLs, puertos y plan B ejecutados por otra persona.
- [ ] **Dependencias reproducibles:** frontend tiene lock; Python y CI instalan rangos amplios sin archivo de restricciones común. Registrar versiones verificadas y un procedimiento reproducible; evitar cambios de entorno durante el demo.
- [ ] **Fallback observable:** `_try_engine` absorbe cualquier excepción y pasa a archivos. Mantener disponibilidad, pero distinguir error de motor de ausencia esperada y dejar evidencia sin secretos; evitar que el demo o smoke oculte una regresión.
- [ ] **Revalidar escenario/API/card con la misma identidad:** los fallbacks estáticos pueden ignorar seed/days pedidos. Declarar parámetros efectivos y degradación, y comprobar correspondencia escenario/variante/día entre rutas.

## 5. Bóveda, fuentes y narrativa — P1

- [ ] **Una sola fuente vigente de estado:** enlazar esta auditoría desde Board/Home y marcar como históricos los bloques viejos de `Estado real del repo y bloqueos`, `Ideas a desarrollar` y START-HERE. No borrar el historial.
- [ ] **Actualizar SUBMISSION y ARCHITECTURE:** todavía presentan LICENSE o parche alpha como pendientes y conteos de 76 pruebas; contrastar con código y último resultado realmente ejecutado.
- [ ] **Actualizar Board:** “Página de validación dentro de la app” ya existe; mover a verificación/pulido, no desarrollo desde cero.
- [ ] **Corregir product brief:** afirma validación en datos reales n=4; la evidencia disponible aquí es simulación y proxy MMASH de 22 adultos, sin descarga OSDR acreditada. No usar esa frase como logro.
- [ ] **Unificar métricas y generación:** la nota `Resultados de validacion` aún muestra 70 % para síndrome leve homogéneo y el README/model card muestran 71 %. Vincular a artefacto/commit y regenerar tablas desde una fuente común.
- [ ] **Identidad TETHER/AstroVital:** registrar relación y alcance en ADR/nota, sin asumir un cambio de nombre. AstroVital propone plataforma más amplia, 3D y persistencia; TETHER es la implementación comprobada.
- [ ] **Citas verificables por afirmación:** varias reglas Earth usan descripciones generales, no identificadores precisos de KB; todas las reglas space son null. Mantener el estado no disponible y completar fuentes antes de prometer reglas espaciales adaptadas.
- [ ] **Revisar texto de evidencia y promoción:** “NASA validó nuestro método” o “con n=4 el promedio no existe” exceden lo demostrado. Explicar que la heterogeneidad limita reglas poblacionales y que las referencias motivan el enfoque, sin atribuir aval.
- [ ] **Aclarar política de datos:** se prohíben datos personales reales, pero hay proxy público desidentificado MMASH. Expresar con precisión que no se ingieren pacientes reales ni datos privados de tripulación y que proxies públicos tienen reglas propias.
- [ ] **Sincronización de bóvedas:** definir cuál se edita y cómo se replica a Git; actualmente son dos copias, no una sincronización automática acreditada. Comprobar diferencias antes de cada entrega.
- [ ] **Verificación externa pendiente:** fuentes NASA/NOAA, rangos, SOP, referencias de competidores, especificaciones/licencia/parámetros del proveedor. Esta auditoría no certifica esas afirmaciones externas.

## 6. Qué falta para la entrega demostrable

- [ ] Confirmar página y edición oficial, criterios, condiciones, elegibilidad y hora de cierre del evento local. Los documentos internos contienen pendientes y no sustituyen fuentes oficiales.
- [ ] Verificar acceso anónimo al repo. Las notas lo describen privado; no se comprobó su visibilidad actual en esta auditoría. Si la entrega aplicable exige publicidad, resolver antes de enviar.
- [ ] Video grabado de 60 segundos y enlace accesible: existe guion, no se acreditó grabación final.
- [ ] Capturas definitivas de Glance/Why/Act, radiación, validación y consola.
- [ ] Nombres, roles, créditos y datos del equipo completos.
- [ ] URL pública funcional o ruta de demostración por video según bases confirmadas; no se acreditó despliegue.
- [ ] Ensayo completo con `LLM_PROVIDER=none` y evidencia sin red. Llamada real al proveedor solo para afirmar que el modo LLM fue probado; no es requisito para demostrar el modo plantilla.
- [ ] Confirmar CI verde del commit que se entregue; el workflow existe y los logs históricos citan runs, pero no se consultó GitHub Actions ahora.
- [ ] Registrar commit/tag de entrega, resultados de checks y enlace final enviado. No se acreditó envío.

## 7. Futuro o fuera del MVP: no confundir con bloqueos

- [ ] **SHOULD pendiente:** prueba PVT-B interactiva y check-in diario; `pvt_ms` simulado no equivale a una prueba administrada al usuario.
- [ ] **Opcional:** visión/voz, ASR/TTS, temperatura central 24 h y 3D. Requieren priorización y fuentes; no necesarios para reparar el MVP.
- [ ] **Operación real futura:** persistencia multi-sesión, consentimiento aplicado al envío, store-and-forward durable y lotes firmados. Hoy hay simulación/preview y cadena hash, no infraestructura completa.
- [ ] **Evidencia futura:** acceso OSDR/Inspiration4 y validación prospectiva; no inventar resultados ni tratarlo como dependencia obligatoria del demo actual.
- [ ] **Revisión experta:** umbrales y protocolos antes de cualquier uso real. Las cifras sintéticas de recall y cobertura proxy no son precisión diagnóstica ni validación clínica.
- [ ] **Fuera del alcance actual:** auth, pacientes reales, hardware propio y app nativa, salvo decisión explícita posterior.

## Orden recomendado de ejecución

1. **Seguridad del contrato:** esquema, controles en todos los campos, errores de verificador y HR ausente. Tests primero.
2. **Coherencia de hechos:** misión/hazards/df y plantilla contextual; no activar LLM hasta cerrar estos puntos.
3. **Verificación reproducible:** suite Python, red-team ampliado, API, e2e, ownership y scripts que fallen correctamente.
4. **Demo:** paneles reales, protocolos, tres escenarios, API caída y ensayo visual.
5. **Documentación y entrega:** estado único, fuentes, métricas, repo/acceso, video, capturas, roles y envío.

No se corrigió código de producto en esta auditoría. Las casillas pendientes son trabajo por realizar; las marcadas describen lo observado con los límites anteriores.

Relacionado: [[Board]] · [[Checklist de entrega]] · [[Estado real del repo y bloqueos]] · [[Alcance MoSCoW]] · [[2026-11-14]]
