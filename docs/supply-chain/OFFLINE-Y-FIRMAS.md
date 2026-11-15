# Operación offline, motor y firmas

El service worker precarga la aplicación esencial y los escenarios, pero no
Pyodide ni los modelos 3D grandes. En esta revisión el conjunto precargado es de
unos 5,17 MiB sin comprimir. Los modelos 3D se descargan cuando se utilizan y se
guardan para usos posteriores sin red; no se promete que un modelo nunca abierto
esté disponible offline. Las rutas `/api/` no se guardan en caché. El navegador
puede limitar o borrar su almacenamiento.

El motor se descarga solo cuando el usuario pulsa su botón; la interfaz muestra
el tamaño total y el avance en MiB. Se comprueba el tamaño y SHA-256 de cada
archivo antes de guardarlo. Tras completar la preparación en línea, el motor
puede ejecutarse offline. Si una descarga falla, los archivos terminados pueden
reutilizarse al reintentar. El build completo sigue ocupando alrededor de 97 MB
en el servidor, no descargados íntegramente al entrar. Usuarios con un service
worker anterior pueden necesitar cerrar las pestañas antiguas para actualizar.

El botón de ejecución local inicia en un worker el mismo código Python del motor
con Pyodide, NumPy y SciPy locales. El escenario generado es sintético, usa la
variante fuerte y la semilla 0; los archivos de respaldo no son el motor. La
preparación opcional obtiene el runtime y los paquetes científicos.
`LIGHTMINUTE_TEST_BROWSER_ENGINE=1 npm run test:e2e` comprueba que no se descargan
antes del botón, prepara el motor en línea y prueba ejecución sin red y
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
