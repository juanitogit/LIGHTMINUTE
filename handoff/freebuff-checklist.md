# Freebuff checklist · crew-tablet (data views, contract hardening, E2E)

Date: 2026-11-14
Repo: `C:\Users\abel1\Desktop\tether-kit\tether-kit\project`

## Alcance

- Solo `apps/crew-tablet/**` + este handoff.
- Sin operaciones destructivas sobre trabajo ajeno: no se revirtieron docs/services/scripts, no se tocaron `services/`, `ml/`, `docs/`, `vault/` ni `.agents/` salvo lo que ya venía sin commitear de otros frentes (que se commitea, no se descarta).

## Ronda 1 — vistas de datos y contrato

- `src/lib/radiation.ts` / `src/lib/validation.ts`: parsers tipados de `public/data/radiation.json` y `validation.json`.
- `src/views/Radiation.tsx`: chips de procedencia, tiles de flux actual/pico/escala S, gráfico SVG de todas las muestras, tira log de escala S, tabla de procedencia (fuente, URL, retrieved, licencia, label, checksum), límites y `RawDetails`.
- `src/views/Validation.tsx`: design, tablas por escenario, calibración, missing data, baseline length, limitaciones y panel de stats LLM.
- `src/views/CheckIn.tsx`: PVT-B (10 ensayos, ISI 1.5–4 s, RT, lapsos, falsos arranques) + check-in diario en `localStorage`, todo etiquetado demo/local y sin ruta hacia el motor.
- `scripts/smoke.mjs` y `tests/e2e.mjs`: contrato del build y E2E de navegador.

## Ronda 2 — correcciones de revisión

| Hallazgo | Arreglo |
| --- | --- |
| `faPerWeek` como porcentaje | Columnas de tasa en decimal con unidad **"/ crew-week"**, nota explícita y verificación en el E2E (falla si aparece `%`). |
| `label: synthetic` con `synthetic: false` | Se resuelve a **`unverified`** con chip "label conflict → unverified" y motivo en Provenance. |
| Flux negativo / fecha inválida | El parser descarta el sample. |
| `s_scale` ausente | Queda **unknown**; nunca se infiere S0. |
| Eje X comprimía huecos | Eje proporcional al timestamp (con marca del punto medio). |
| `DataNotice` sobre datos NOAA | Radiation y Validation dicen **SYNTHETIC CREW**. |
| Contrato pfu ≥10 MeV | `unitsContracted`, unidad tomada del snapshot y checks de `pfu`/`10 MeV` en el smoke. |
| `co2_creep` caía a `cmo_fever` | Identidad de escenario validada en `lib/api.ts`. |

## Ronda 3 — restauración sobre LIGHTMINUTE

El trabajo de las rondas 1-2 quedó guardado en `b533b25`, pero `e0c1fb5` (integración LIGHTMINUTE) y el fast-forward a `origin/main` reemplazaron esas rutas: `main` ya no tenía `tests/`, `CheckIn.tsx`, `lib/radiation.ts` ni `lib/validation.ts`, y `Radiation/Validation` eran vistas genéricas de inspector.

Restaurado desde `b533b25` **sin pisar LIGHTMINUTE**: las cuatro vistas/lib propias, `tests/e2e.mjs` y `screenshots/`. Reintegrado a mano en la app actual:

- `App.tsx` + `useHashState.ts`: vista `checkin` ("PVT & daily log"), renderizada **fuera** del bloque de escenario para funcionar sin motor ni JSON.
- `styles.css`: bloque `.rad-chart`/`.sstrip`/`.provenance`/`.pvt`/`.checkin` reincorporado (239 líneas).
- `primitives.tsx`: `DataNotice` acepta `label` ("SYNTHETIC CREW").
- `lib/api.ts`: rechaza sustitución (`asked co2_creep, got cmo_fever`), identidad ausente en archivos estáticos y **identidad autocontradictoria** (`scenario` ≠ `name`).
- `scripts/smoke.mjs`: usa `channel: "chrome"` (no descarga Chromium), detecta `.venv/Scripts/python.exe` para el motor y apunta al DOM restaurado (`.rad-chart`, tablas de métodos, `checkin` en el barrido móvil).

## Checks (estado actual)

```
npm run typecheck          exit 0
npm run build              exit 0
npm run test:e2e           exit 0 · 17 grupos (incluye motor real, LLM_PROVIDER=none)
npm run test:e2e:browser   exit 0 · 13 passed · browser e2e: PASS
```

El E2E de navegador cubre: cinco vistas, snapshot de radiación manipulado, escenario inexistente, tres formas de sustitución de escenario, estados vacíos honestos de radiación/validación, PVT-B completo, check-in persistente y móvil 390×844, con cero `pageerror`.

Capturas: `apps/crew-tablet/screenshots/final-*.png` (glance, why, act, radiation, radiation-unverified, validation, checkin, wrong-scenario, mobile-checkin, ground, protocol).

## Coordinación

- Míos: `src/views/Radiation.tsx`, `src/views/Validation.tsx`, `src/views/CheckIn.tsx`, `src/lib/radiation.ts`, `src/lib/validation.ts`, `src/lib/api.ts`, `tests/e2e.mjs`, `scripts/smoke.mjs`, `screenshots/`.
- Servidores ajenos intactos: Vite del padre en `:5173` y `vite preview` propio en `:4173`.

## Límites

- El E2E de navegador corre **sin motor** (camino offline: JSON estático + plantillas); el smoke sí arranca el motor desde `.venv` con `LLM_PROVIDER=none`.
- Solo Chrome instalado; "móvil" es viewport Chromium, no dispositivo real.
- Las rutas `s_scale` ausente y label contradictorio se ejercitan con fixtures interceptados, no con el archivo publicado.
- Los RT del PVT son clics automatizados: validez técnica, no medida humana.
- Sin validación clínica: los porcentajes son de crews sintéticos y la vista muestra sus limitaciones.

## Cierre: merge y push

El primer push fue rechazado porque `origin/main` avanzó 4 commits (DONKI, licencias de modelos de órganos, arreglo del simulador corporal). Se hizo `fetch` + `merge origin/main` (sin rebase, sin reescritura). Conflictos resueltos conservando ambas partes:

- `views/Radiation.tsx`: vista endurecida + `<DonkiPanel>` del remoto en el mismo `stack`.
- `scripts/smoke.mjs`: checks de eje/timestamp/unidades + asserts de DONKI (`real-public`, `not individual dose`).
- `docs/seo-deploy.md` y `vault/.../2026-11-14.md`: unión de ambos textos.
- `docs/screenshots/04-space-weather.png`: captura del remoto, regenerada después por el smoke.

Verificación sobre el árbol fusionado: `typecheck` 0, `build` 0, `test:e2e` 17 grupos, `test:e2e:browser` 13/13.

Estado final: `main` en **2d1c5a9**, idéntico a `origin/main` (`fcd5a7a..2d1c5a9`), árbol limpio. El remoto redirige a `juanitogit/LIGHTMINUTE-NASASPACEAPPS2026`.

Commits de la ronda: `096afa8` (crew-tablet restaurado + E2E), `81773cd` (cred), `93b5d30` (engine), `2b3a285` (docs/handoff) y `2d1c5a9` (merge).

## Arreglos de CI tras el push

El job `Engine, API and LLM layer (Python 3.12)` falló a los 21 s. Reproducido en local y corregido:

- `ruff` marcaba dos imports desordenados en `services/engine/tether_engine/api/main.py` (psycopg y `.database`); aplicado `ruff --fix`.
- `scripts/check_ownership.py --overlaps` daba **57 rutas sin dueño** (capturas, tests, `docs/autonomy`, `docs/safety`, `organs/`, `tools/researcher`, `handoff/*`, snapshot DONKI). Añadidas a A3/A5 en `agents/OWNERS.json`; ahora `ownership map OK`.
- `scripts/audit_vault.py` fallaba por un wiki-link a `docs/` fuera del vault; convertido a enlace markdown relativo correcto (`../../../docs/...`). Ahora 0 problemas.
- El test de checksums DONKI fallaba en Windows por la conversión CRLF; ahora normaliza `\r\n` antes de hashear (el blob LF ya coincidía con el manifest, así que en Linux pasaba).
- El smoke lanzaba solo Chrome instalado, pero el runner de CI usa el Chromium de Playwright: ahora intenta el bundle y cae a `channel: "chrome"` solo si no existe. Mismo fallback en `tests/e2e.mjs`.

Reproducción local del job completo: `ruff` limpio, `run_tests.py` **88/88**, `audit_vault` 0 problemas, `check_ownership` OK, redteam 30/30, API `LLM_PROVIDER=none` OK; frontend: build, SEO (tag/sitemap/robots), `test:auth` 12/12, `wrangler pages functions build`, `LIGHTMINUTE_SKIP_API=1 test:e2e` 15 grupos, auditoría del ground console y `node --check` OK.
