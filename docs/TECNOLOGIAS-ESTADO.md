# Estado de implementación de tecnologías

Actualizado 15 de noviembre de 2026, hora de Bogotá. Esta tabla describe el árbol
local y las pruebas realizadas; no implica que esté publicado o validado clínicamente.

| Capacidad | Estado | Evidencia y límite |
|---|---|---|
| PWA y uso sin conexión | Implementado | Service worker precarga el núcleo, no el motor ni modelos 3D grandes; estos se descargan al solicitarse. Solo los recursos ya preparados están disponibles sin red. La API no se guarda offline. |
| Motor en navegador | Implementado mediante botón | Python real del repositorio, Pyodide, NumPy y SciPy locales en worker. Prueba offline y comparación con la exportación de referencia para escenario sintético. Al iniciar, la app sigue mostrando JSON firmado hasta elegir ejecutar el motor. |
| Propiedades | Implementado | Hypothesis cubre la prohibición de bajar urgencia y de inventar números en el titular. No prueba todos los campos o posibles ataques. |
| SBOM y auditoría | Implementado como instantánea | CycloneDX npm, auditorías npm/pip en `docs/supply-chain/`. Python no tiene lock de dependencias; resultados cambian con el tiempo. |
| Conformal adaptativo | Investigación | Implementación y experimento sintético en `ml/proxy/CONFORMAL-RESULTS.md`. No alimenta decisiones de la app; no se afirma garantía formal ni validación clínica. |
| Firmas Ed25519 | Implementado | Escenarios estáticos firmados y verificados en cliente; firma y verificación de un archivo de auditoría. Verificar la huella por canal independiente; firma no es cifrado ni protege contra sustitución simultánea de la app y la clave confiada. |
| DOI Zenodo | No creado | El repositorio se comprobó privado; no se cambió su visibilidad ni se publicó una versión en Zenodo. No existe DOI verificado. |
| FHIR | Ejemplo parcial | Exporta FC y temperatura sintéticas con LOINC/UCUM. El escenario no aporta fecha de adquisición: no se inventa y no se afirma cumplimiento del perfil FHIR. |
| Voz | Implementación experimental | Web Speech para notas sintéticas con aviso previo de posible transmisión al proveedor del navegador. Probado con reconocedor simulado, no con micrófono real. |
| Bluetooth | Implementación experimental | GATT de ritmo cardiaco, lectura real en memoria local separada del motor y escenarios; paquete 8/16 bits y conexión simulada probados. No se verificó con una banda física. |

La información de clave de firma, fingerprint, política offline y límites está
en `docs/supply-chain/OFFLINE-Y-FIRMAS.md`. Datos sensibles o credenciales no se
incluyen en el repositorio. Los escenarios y modelos clínicos siguen siendo de
demostración, y el modo conformal no se presenta como práctica médica.

Verificación local anterior: el navegador
pasó 24 grupos incluyendo la API local y el motor Pyodide. La repetición para
el build offline posterior pasó 22 grupos con API omitida. También pasaron 8
pruebas de la CLI de investigación, 3 conformales, 2 de FHIR/Bluetooth y las
propiedades del verificador y la suite fisiológica. Auditoría de Obsidian y
ownership sin problemas. Google OAuth fue retirado. El último test de
hardware usa un emulador del navegador, no una banda física.
