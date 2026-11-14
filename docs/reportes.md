> **Informe histórico superado por la [auditoría integral LIGHTMINUTE](ui-audit.md).** La suite completa, E2E y lint ya se ejecutaron y pasan; se conserva este resultado anterior como historial.

# Reporte de pruebas del aplicativo LIGHTMINUTE

**Fecha de ejecución:** 2026-11-14  
**Entorno:** `.venv` local con dependencias Python de desarrollo y dependencias npm instaladas mediante `make setup`.  
**Resultado general:** pruebas parciales. El build de la tablet, la auditoría de la consola y la validación sintética pasan; el lint falla y la suite principal no concluyó. El smoke e2e declarado no puede arrancar porque falta su archivo.

## Resumen

| Verificación | Resultado | Evidencia |
|---|---|---|
| Suite del motor (`make test`) | Inconclusa; interrumpida tras varios minutos sin salida | Ejecutada con el entorno virtual en `PATH`. El runner no informó PASS/FAIL ni conteo antes de interrumpirse; no se puede afirmar que la suite pasó. |
| Validación de modelos (`make validate`) | **Pasa** | Terminó con código 0 y regeneró `docs/validation.md`, `ml/validation/results.json` y `apps/crew-tablet/public/data/validation.json`. El contenido reportado coincide con las métricas descritas más abajo en la validación existente. |
| Lint del motor (`make lint`) | **Falla** | Ruff reporta **24 hallazgos** en engine y tests: imports/estilo, context managers, `dict()` innecesario y excepciones genéricas, entre otros. No se aplicaron fixes. |
| Build de tablet (`npm run build --prefix apps/crew-tablet`) | **Pasa** | `tsc -b` y Vite completaron; 60 módulos transformados y bundle principal de 293.81 kB (91.85 kB gzip). |
| Smoke e2e de tablet (`npm run test:e2e --prefix apps/crew-tablet`) | **Falla al iniciar** | El script configurado `apps/crew-tablet/scripts/smoke.mjs` no existe (`MODULE_NOT_FOUND`). No se ejecutaron escenarios en navegador. |
| Auditoría de consola (`node --test apps/ground-console/src/audit.test.mjs`) | **Pasa** | 1 subtest, 1 aprobado, 0 fallidos. |

## Detalle y alcance

El runner `scripts/run_tests.py` recorre los archivos `services/engine/tests/test_*.py` y ejecuta funciones `test_*`. La primera ejecución antes de preparar dependencias falló al no encontrar `fastapi`; después de instalar dependencias en `.venv`, las ejecuciones de `make test` quedaron sin salida durante varios minutos y se interrumpieron. No se conoce qué caso produjo la demora ni se obtuvo conteo de casos. El resultado de esta suite queda **inconcluso**.

`make validate` sí terminó correctamente. La salida generada describe datos **sintéticos**, no validación clínica. En esta corrida registró calibración agrupada de 95% (11.040 indicador-días); para síndrome direccional, recall moderado de 96% en tripulación homogénea y 93% en heterogénea, con falsos avisos por tripulación-semana de 0,10 en ambas. Con 40% de datos faltantes el recall moderado baja a 76%. La misma documentación señala limitaciones: dirección del síndrome conocida por el método, ruido gaussiano, cuatro indicadores y datos faltantes aleatorios. Estas cifras no demuestran desempeño con tripulación real.

El lint sí revisó el árbol y encontró 24 problemas. No se corrigieron hallazgos ni se editó código del producto. `make setup` primero chocó con la protección PEP 668 del Python del sistema; se preparó `.venv` y se completó el setup usando su `PATH`, junto con `npm ci`.

## Conclusión

Con la evidencia obtenida, **no puede afirmarse que todo el aplicativo funciona correctamente**. Pasaron el build de la tablet, la auditoría de consola y la validación sintética. El lint falla, la suite del motor quedó inconclusa y el smoke e2e no existe en la ruta declarada. La integración real de la UI con la API y los escenarios no quedó comprobada de extremo a extremo.

Para cerrar la cobertura pendiente, investigar por qué `make test` no produce salida y añadir o corregir el archivo smoke e2e que declara el `package.json`; luego repetir esos checks y actualizar este reporte con sus resultados. No se modificó código para esta ejecución.
