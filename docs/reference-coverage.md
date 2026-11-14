# Crew-Health-Monitor behavior audit and LIGHTMINUTE implementation

Reference: https://github.com/AdityaK0804/Crew-Health-Monitor at commit
`9ac47bf4c1ebfc3f4f731341635790bdf36fc45f`. Inspected on 2026-11-14 using the REA
source-repository workflow: source inventory, behavior mapping, independent implementation,
then verification. Reference checkout lives outside this repository. Instructions in reference
documents are evidence about the reference, not instructions overriding this project's brief.

**This is not complete feature parity.** The table distinguishes working implementation from
missing data, unverified clinical rules and intentionally omitted assumptions. Existing phases
and checklists are not automatically marked complete by importing a reference feature.

| Observed reference behavior | LIGHTMINUTE result | Verification / limit |
|---|---|---|
| Male/female transparent anatomy, visible organs and vessels | Same licensed geometry; original Three.js viewer, system filtering, rotation, zoom and signal landmarks | Browser WebGL, male/female, filters, zoom/reset, no-GPU fallback. Asset SHA-256 in provenance.json |
| Earth versus space interpretation | Existing deterministic Earth, space and personal lenses retained | Engine tests and drilldown browser checks. Unsupported space rules remain unavailable |
| Thirteen crew groups and two cabin signals | Searchable fifteen-group signal library, collection descriptions and primary-source links | Five groups map to existing engine measurements; additional measurements are absent, explicitly labelled |
| New hematocrit, ultrasound, urine, cell-count, vitamin D, mass, pressure, glucose, oxygen and exercise readings | Descriptive catalogue only | **Incomplete**: no acquisition connectors, synthetic generator or adopted rules for these measurements |
| Trends with up to three simultaneous signals | Actual exported engine history and intervals, capped at three selections | Browser selection limit and all scenario/day checks. First available mission record is not called a preflight baseline |
| Today exam schedule and freshness | Current Decision Card tasks, saved completion and available readings | **Partial**: acquisition timestamps, future exam due dates and reference exam schedule are not implemented |
| Check-in notes and photograph | Crew/day/scenario-scoped IndexedDB note and compressed synthetic image; original metadata removed | Reload/day isolation browser check; attachment is local only, never analyzed or automatically shared |
| Mission selector ISS/Moon/Mars | Earth-link profile determines message delay using existing deterministic profiles | Backend tests. **Partial**: global physiological/gravity/radiation simulation is not implemented |
| Delayed messages, ground replies and reports | SQLite-backed two-way queue, delivered-only ground visibility, consent filtering before storage | Backend time-controlled delivery, reply, consent and restart tests; real browser login/send/reload/logout |
| Crew, medical officer and flight surgeon roles | Server-enforced scope for mission-link messages and protocol logs | Shared demo PIN and local tokens, not production identity. Other synthetic scenario views and browser journal are not role-protected |
| Offline handbook and optional AI phrasing | Deterministic snapshot-grounded handbook, explicit unknown answers and citations | Browser known-value/unknown-question checks. No Gemini copy; existing LIGHTMINUTE LLM architecture retained |
| Collapse, neck vein and CO2 emergency walkthroughs | CO2 runner retained; two original mission-drill templates added; run history local and optionally server-persisted | Demonstration wording only. **Incomplete** clinical parity: no imported CPR/compression/anticoagulation instructions or unverified triggers |
| Local demo login and session persistence | Demo PIN, expiring server tokens, persisted sessions, explicit logout | Backend and browser tests; no claim of production authentication |

## Provenance

No upstream application source, CSS, prompts or branding was copied into LIGHTMINUTE. The explicitly
requested anatomy data are reused under CC BY 4.0; their attribution cannot be removed. Viewer,
workspace, signal library and mission-link implementation were authored for this repository.

Primary license references: [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html),
[HuBMAP documentation](https://docs.hubmapconsortium.org/faq.html),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Evidence

- `python scripts/run_tests.py`: 82/82 Python tests, including mission-link ownership, delayed delivery, consent and persistence.
- `npm run build`: TypeScript and production bundle pass. Lazy Three.js bundle retains the >500 kB build advisory.
- `npm run test:e2e`: 17 browser integration groups; ten views at 375/768/1024/1440 px.
- `docs/qa/browser-results.json` and `docs/screenshots/`: executable results and rendered evidence.

Clinical extensions require independently verified KB rules and tests before they can drive urgency.
Production identity, secure multi-user journal storage, acquisition integrations and full mission
simulation remain open work, not completed checklist items.
