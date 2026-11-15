# Revisión de evidencia tras sincronización

Revisión local del 14 de noviembre de 2026 (hora de Colombia), sobre `bff842e`.
No se repitieron los estudios científicos ni se modificó el motor.

| Comprobación | Resultado | Comando y límites |
|---|---|---|
| Herramienta offline | 7/7 pruebas pasan | `python tools/researcher/test_researcher.py`. Contratos de software; no es validación clínica. |
| Archivo MMASH | SHA-256 coincide con el manifiesto registrado: `ef91ee1b36b5849a6366b1918de82686ab278915d33c7f62133f07f741f70726` | Python `hashlib.sha256(Path('data/snapshots/MMASH.zip').read_bytes()).hexdigest()`. Coincidencia con `ml/proxy/RESULTS.md`; no se volvió a obtener el manifiesto remoto en esta revisión. |
| Código de motor del estudio | Sin diferencias registradas en Git frente a `6deea70` | `git diff --name-only 6deea70 HEAD -- services/engine/tether_engine`. La salida estuvo vacía; no equivale a repetir los cálculos ni comprueba dependencias o datasets. |
| Huellas del estudio de autonomía | 8 de 37 archivos difieren en hash de bytes en este Windows | Se compararon `docs/autonomy/results.json` y archivos locales con `hashlib.sha256(Path(path).read_bytes()).hexdigest()`. Git no muestra cambios del motor frente a la revisión del estudio; la diferencia de bytes puede incluir finales de línea. No se declara reproducibilidad bit a bit. |
| CI | Ejecución remota correcta para motor y navegador | `gh run view 43673513922 --json status,conclusion,jobs`; ejecución vinculada al commit `bff842e`. |
| Preregistro v2 | Compromiso anterior a ejecución **no demostrable** | `git log --format='%h %s' -- ml/proxy/PREREG-MMASH-v2.md docs/autonomy/PREREG-v2.md` muestra `93b1bb2`, el mismo commit que incorpora los resultados v2. `ml/proxy/credibility-results.json` indica que el preregistro era una copia sin commit al ejecutar. No se afirma preregistro comprometido antes del análisis; v1 ya era conocido. |

## Consecuencias para la presentación

- La cobertura MMASH v2 del 66,37 % y el fallo del criterio 90–98 % siguen siendo los resultados
  registrados, no una repetición independiente realizada durante esta revisión.
- La comparación de autonomía es sintética; los presupuestos de falsas alarmas observados en el
  conjunto de reporte difieren. No debe venderse como comparación a presupuesto igual en reporte.
- La dirección de cambios de Inspiration4 respecto de literatura sigue NOT DONE. No se debe
  presentar como concordancia confirmada.
- No hay evidencia de efectividad clínica ni de transferencia de resultados terrestres a astronautas.

Archivos de referencia: `ml/proxy/RESULTS.md`, `docs/autonomy/RESULTS.md`,
`tools/researcher/RESULTS.md` y `docs/safety/fault-injection-results.md`.
