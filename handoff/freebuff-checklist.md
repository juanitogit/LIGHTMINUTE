# Freebuff checklist · crew-tablet (data views, contract hardening, smoke + browser E2E)

Date: 2026-11-14
Repo: `C:\Users\abel1\Desktop\tether-kit\tether-kit\project`
Branch: `main` @ `45188ca` — **sin commits, sin push, sin merge, sin remotos** (solo cambios locales)

## Alcance respetado

- Solo `apps/crew-tablet/**` (+ este handoff).
- **No** se tocó `services/`, `ml/`, `docs/`, `vault/`, `packages/`, `kb/`, `scripts/` de la raíz ni `.agents/`.
- Cero comandos git de escritura (`add/commit/push/merge/reset/checkout`).
- El árbol trae modificaciones ajenas en docs/services/scripts; no se revirtieron ni se tocaron.

## Correcciones de la revisión

| Hallazgo | Estado y arreglo |
| --- | --- |
| `faPerWeek` renderizado como porcentaje | Ya estaba en decimal desde la ronda anterior; ahora es imposible confundirlo: cabecera **False alarms**, celda **"0.103 / crew-week"**, nota bajo la tabla ("rate per crew-week, not a percentage") y la tabla de *missing data* usa decimales con la unidad en el caption. `pct()` solo se aplica a recall y cobertura. El E2E falla si una celda de esa columna trae `%` o le falta `/ crew-week`. |
| Radiación con `label: synthetic` y `synthetic: false` | `resolveLabel()` resuelve la contradicción a **`unverified`** (también el caso inverso `real-public` + flag true). La vista muestra `unverified` + chip "label conflict → unverified" y explica el motivo en Provenance. |
| Flux negativo / fecha inválida | El parser descarta el sample (`flux < 0`, no finito, o `Date.parse(ts)` inválido). Consecuencia: no se dibuja ni entra en `current`/`peak`. |
| `s_scale` ausente | `sScale` es **opcional**: si falta queda `unknown`; nunca se infiere S0. Un S0 solo aparece si el snapshot lo registra. La tira S no resalta banda y el texto dice que no se infiere del flux. |
| Eje X comprimía huecos | El eje ahora es **proporcional al timestamp** (`(t - t0) / (t1 - t0)`), no al índice de muestra; se añadió la marca del punto medio. El E2E verifica que los deltas de x no sean constantes. |
| `DataNotice` decía "SYNTHETIC DATA" sobre datos NOAA | `DataNotice` acepta `label`; Radiation y Validation usan **"SYNTHETIC CREW"**. El E2E prohíbe "SYNTHETIC NOAA" y exige "SYNTHETIC CREW". |
| Contrato pfu ≥10 MeV | `formatFlux` recibe la unidad; `unitsContracted` detecta si las unidades son pfu y, si no, aparece el chip "units are not pfu" y se imprime la unidad registrada en vez de inventar pfu. El smoke exige `units` con `pfu` y `channel` con `10 MeV`, y que ningún sample tenga flux negativo/fecha ilegible. |
| `loadScenario` caía a `cmo_fever` pidiendo `co2_creep` | `asScenarioDoc` valida identidad contra `scenario`/`name` del documento; el fallback `demo-data.json` (que es `cmo_fever`) ahora **lanza** en vez de renderizar otro escenario. La UI muestra el panel de error. Cubierto por E2E. |

## Archivos

### Nuevos

| Archivo | Qué hace |
| --- | --- |
| `apps/crew-tablet/src/lib/radiation.ts` | Parser tipado y endurecido del snapshot (label/flag, flux ≥ 0, timestamps, `s_scale` opcional, contrato pfu, umbrales S1–S5). |
| `apps/crew-tablet/src/lib/validation.ts` | Parser tipado del informe (design, métodos, calibración, missing, baseline, limitaciones). |
| `apps/crew-tablet/src/views/CheckIn.tsx` | PVT-B (10 ensayos, ISI 1.5–4 s, RT, lapsos >500 ms, falsos arranques) + check-in diario en `localStorage`. Sin ruta hacia el motor: no diagnostica ni altera urgencia. |
| `apps/crew-tablet/scripts/smoke.mjs` | Smoke de contrato sobre `dist/` servido en un puerto efímero (12 checks, sin dependencias). |
| `apps/crew-tablet/tests/e2e.mjs` | **E2E real de navegador con Playwright** sobre el Chrome instalado (`channel: "chrome"`, sin descargar navegadores): 5 vistas + check-in, snapshot manipulado, escenario equivocado, PVT completo, persistencia y móvil. |
| `apps/crew-tablet/screenshots/*.png` | Capturas finales (lista abajo). |

### Modificados

`src/views/Radiation.tsx`, `src/views/Validation.tsx`, `src/views/CheckIn.tsx`, `src/App.tsx`, `src/hooks/useHashState.ts`, `src/components/primitives.tsx` (DataNotice con `label`), `src/lib/api.ts` (identidad de escenario), `src/styles.css` (bloque de gráfico/escala/provenance y check-in), `src/lib/radiation.ts`, `package.json` (+`playwright` devDependency y script `test:e2e:browser`), `package-lock.json`.

Nota: mientras trabajaba, otro agente endureció el copy de `CheckIn.tsx` ("synthetic demo, do not enter real personal health data", mensajes de storage). No revertí ese cambio; los tests corren contra esa versión y pasan.

## Checks

```
cd apps/crew-tablet
npm run build              -> exit 0 · 63 módulos · JS 318.50 kB (gzip ~98) · CSS ~32 kB
npm run test:e2e           -> exit 0 · 12 passed, 0 failed · "smoke: PASS"
npm run test:e2e:browser   -> exit 0 · 11 passed, 0 failed · "browser e2e: PASS"
```

Browser E2E (Chrome del sistema, headless, `dist/` servido localmente):

1. Glance renderiza escenario y badges de nivel.
2. Why muestra gráfico y veredictos de lentes.
3. Act muestra tarjeta con bloque *do now*.
4. Radiation dibuja **286** muestras, eje temporal no uniforme, procedencia, canal y unidades; sin "SYNTHETIC NOAA".
5. Validation muestra métodos, calibración, missing data, baseline y tasas con `/ crew-week` (rechaza `%`).
6. Snapshot manipulado (label contradice flag, un flux negativo, un timestamp ilegible, un sample sin `s_scale`): se dibujan **2** puntos, aparece `unverified` + "label conflict" y la escala S dice **unknown**.
7. Escenario inexistente: panel de error, sin contenido de `cmo_fever`.
8. PVT-B completo: 10 ensayos reales, estado `done`, tiles y `localStorage["tether-pvt-history"]` con `trials: 10`.
9. Check-in: guarda, **sobrevive al reload**, no emite ninguna petición no-GET y queda 1 entrada en `localStorage["tether-checkin"]`.
10. Móvil 390×844 (`isMobile`, `hasTouch`): sin overflow horizontal en Glance ni Check-in.
11. Sin `pageerror` ni errores de consola (se ignora el 500 esperado de `/api/health` sin motor).

Capturas finales: `screenshots/final-glance.png`, `final-why.png`, `final-act.png`, `final-radiation.png`, `final-validation.png`, `final-checkin.png`, `final-mobile-checkin.png`, `final-wrong-scenario.png`, `final-radiation-unverified.png` (más las de la ronda anterior).

## Límites

- El E2E corre **sin motor**: cubre el camino offline documentado (JSON estático + plantillas). No valida `/api/*`, LLM ni el pipeline.
- Solo Chrome instalado (pedido explícito de no descargar navegadores); sin Firefox/WebKit. "Móvil" es viewport 390×844 en Chromium, no un dispositivo real.
- El camino `s_scale` ausente y la contradicción de label se ejercitan con un **fixture interceptado** (`page.route`), no con el archivo publicado (que trae `s_scale` en las 286 muestras).
- El rechazo de identidad se prueba con un escenario inexistente; no se sustituyó el archivo real de `co2_creep` por el de `cmo_fever`.
- Los RT del PVT son clics automatizados: validez técnica (máquina de estados, conteo, persistencia, render), no medida humana.
- `playwright` se instaló con `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`; si se quiere CI en otra máquina hay que tener Chrome (o habilitar `playwright install chromium`).
- Sigue sin haber validación clínica: los porcentajes son de crews sintéticos y las limitaciones se muestran en la propia vista.
- No se ejecutó la suite Python ni los checks de tooling (son de otros agentes).

## Coordinación y congelado

Propiedad de archivos en esta ronda (acordada):

- **Míos, congelados:** `src/views/Radiation.tsx`, `src/views/Validation.tsx`, `src/lib/radiation.ts`, `src/lib/validation.ts`, `src/lib/api.ts`, `src/components/primitives.tsx`, `tests/e2e.mjs`, `scripts/smoke.mjs`, `screenshots/`.
- **Ajeno (revisor interno):** `src/views/CheckIn.tsx` — Space, validación de storage, bounds y demo. **No lo edité en esta ronda** (sha `4835b9c34fcf`, mtime 12:37, sin cambios durante el congelado).

Estado del congelado (CheckIn.tsx del revisor todavía sin aterrizar):

```
npm run build              exit 0
npm run test:e2e           exit 0 · 12 passed · smoke: PASS
npm run test:e2e:browser   exit 0 · 11 passed · browser e2e: PASS
```

Servidores: el Vite del padre sigue en `:5173` (PID 33108, no se tocó) y mi `vite preview` en `:4173` (PID 15624, responde 200). Ningún servidor ajeno fue detenido.

Cuando el revisor aterrice `CheckIn.tsx`, volver a correr los tres comandos. Lo que mis tests asumen de esa vista: botón `Start PVT-B`, 10 ensayos con `.pvt__target`, estado `.pvt--done`, claves `localStorage` `tether-pvt-history` y `tether-checkin`, y un botón `Save check-in` que persiste tras recargar. Si cambia esos nombres o el flujo, ajustar `tests/e2e.mjs` (mi archivo), no la vista.
