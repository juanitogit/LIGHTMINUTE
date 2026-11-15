# Operación offline, motor y firmas

El build genera un service worker con un caché versionado de archivos públicos.
El primer uso necesita descargar la aplicación; después de completarse la
instalación se puede recargar el escenario sintético sin red. Las rutas `/api/`
no se guardan en caché: las comunicaciones y el backend siguen necesitando su
servidor. El almacenamiento del navegador puede ser limitado o eliminado.
Tras integrar los modelos de órganos del remoto, `dist/` ocupa 96.677.713 bytes
antes de compresión en esta revisión; varía por build. La descarga y el espacio
necesarios son significativos para una conexión limitada.
Una comprobación en producción con conexión lenta superó el límite anterior de
dos minutos durante la descarga de Pyodide. El instalador ahora limita a tres las
descargas simultáneas y prioriza el runtime; el motor espera hasta diez minutos.
Esto reduce la competencia de descargas, pero no garantiza terminar en redes
lentas. En la prueba pública del despliegue `3104a5d`, Chromium completó la
ejecución sintética en aproximadamente 341 segundos desde el primer uso; el
resultado apareció etiquetado como motor Python local. La duración depende de
la conexión y del dispositivo.

El botón de ejecución local inicia en un worker el mismo código Python del motor
con Pyodide, NumPy y SciPy locales. El escenario generado es sintético, usa la
variante fuerte y la semilla 0; los archivos de respaldo no son el motor. La
primera instalación contiene también el runtime y los paquetes científicos.
`LIGHTMINUTE_TEST_BROWSER_ENGINE=1 npm run test:e2e` prueba ejecución sin red y
compara lecturas, referencias, intervalos, probabilidades, lentes y niveles de los días y tripulantes frente a los
archivos exportados por Python. Pequeñas diferencias numéricas usan tolerancia;
no es prueba de equivalencia para entradas o versiones arbitrarias.

Pyodide `314.0.8` (MPL-2.0) se instala mediante npm y se copia en el build.
NumPy `2.4.6` y SciPy `1.18.0` WebAssembly se obtuvieron de la distribución
oficial Pyodide; sus ruedas llevan sus propios archivos de licencia. El build
comprueba los SHA-256 contra el lock de Pyodide antes de empaquetarlas.

## Firmar datos y auditoría

En `apps/crew-tablet`, `node scripts/sign-scenarios.mjs` firma exactamente los
bytes de los escenarios y `demo-data.json`. Un build verifica las firmas antes
de compilar; el navegador verifica las firmas antes de mostrar JSON estático.
El firmador normaliza finales de línea a LF antes de firmar y `.gitattributes`
mantiene esos bytes al clonar en Windows o Linux.
Tras regenerar escenarios hay que volver a firmar y revisar los cambios. El
comando `--init` crea la clave privada Ed25519 solo si aún no existe, en
`%LOCALAPPDATA%/LIGHTMINUTE/signing/ed25519-private.pem` en Windows o en la
ubicación indicada por `LIGHTMINUTE_SIGNING_KEY`. La clave privada nunca debe
subirse al repositorio, enviarse por chat ni publicarse. Protege su acceso y
realiza un respaldo seguro: si se pierde, se requiere rotación de confianza.

La huella SHA-256 de la clave pública de esta revisión es
`5075ccb6f1318ef8656325486ace48541651ab1701829c661dc681f6b3d51d71`.
El código de la app incluye la clave pública; un atacante que pueda reemplazar
tanto el código como la clave puede sustituir la confianza. Verificar la huella
por un canal independiente y proteger el proceso de publicación y rotación.
Una firma aporta integridad y autenticidad respecto a una clave confiable; no
cifra ni garantiza corrección de datos, privacidad o seguridad clínica.

Para firmar una auditoría sintética existente sin sobreescribir un archivo:
`node scripts/sign-audit.mjs entrada.json salida.signed.json`. En la vista de
validación, «Verify a signed audit file» comprueba el sobre localmente y puede
comparar una huella facilitada por separado. No prueba por sí solo que el
historial sea completo: la firma solo cubre los bytes incluidos en el archivo.

## Otras capacidades y límites

- El ejemplo FHIR R4 exporta FC y temperatura con códigos LOINC y UCUM cuando
  la unidad coincide. Sin fecha real de adquisición no se afirma conformidad con
  el perfil de signos vitales; no se envía a un servidor FHIR.
- La voz funciona donde el navegador lo permita. Un proveedor de reconocimiento
  puede recibir audio; la interfaz lo advierte antes de activar el micrófono.
- La lectura opcional de una banda BLE queda en memoria, separada de escenarios
  sintéticos; no se envía ni alimenta el motor. El formato de paquetes se probó;
  no se comprobó con hardware físico en esta revisión.
- El experimento conformal y sus límites están en `ml/proxy/CONFORMAL-RESULTS.md`;
  todavía no sustituye las reglas del motor ni demuestra validación clínica.
- Zenodo requiere completar la vinculación/publicación adecuada; el repositorio
  se comprobó privado. No se ha creado un DOI ni cambiado su visibilidad.
