# LIGHTMINUTE interface and human 3D view

Revision: 2026-11-15, adapting the owner's CRM reference while retaining the
flat content layout and licensed 3D anatomy.
This replaces the first visual pass recorded in `ui-audit.md`.

## Design decisions

The web app follows the hierarchy, alignment, progressive disclosure and adaptive navigation principles
in [Apple HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout) and
[Materials](https://developer.apple.com/design/human-interface-guidelines/materials).
It remains a React web application, not a native Apple application. The locally
bundled Inter Variable font follows the CRM reference and is licensed under OFL;
no Apple font files or proprietary UI assets are redistributed. The owner's
LIGHTMINUTE logo is unchanged. See `src/workspace-design.css` for the neutral
surfaces, violet accent, responsive navigation and motion treatments.

Each page load includes a short, silent startup animation rendered locally from
the editable HyperFrames composition in `apps/crew-tablet/media/hyperframes/`.
The overlay does not intercept input, ends on a timer if video playback fails,
and is omitted for reduced motion. Chart strokes animate when their selected
data changes; displayed values and accessibility labels update immediately,
without inventing intermediate data. Inter Variable is bundled for offline use.

The body and heart-only detail model animate at the selected scenario's resting
heart rate divided by 60. This is a stylized depiction, not live measurement or a
physiological prediction; absent or invalid data stop the heartbeat. Vascular
meshes remain static. Reduced-motion preferences stop automatic beating and
rotation and remove the camera transition. Bluetooth readings remain separate.

| Before | After | Why |
|---|---|---|
| Bordered signal and crew cards | Flat reading rows and a crew list with separators | The content has hierarchy without nested surface containers. |
| Capsule status and source labels | Plain icon/text statuses and inline source labels | Keeps state visible without visual clutter. |
| Drawn 2D silhouette | Existing male/female anatomical meshes rendered using Three.js | Gives a real 3D object that people can inspect from different angles. |
| Marketing headline and orbital sidebar block | Crew-health title, compact context and a quiet ground-delay readout | Prioritizes the task and actual mission state. |
| Small-screen navigation across the page header | Flat bottom navigation on compact screens | Keeps views reachable without consuming the top of the content area. |
| Permanently dark initial theme | Light initial theme with persistent light/dark preference | Supports the new visual direction and preserves an explicit later choice. |

Skills used: UI/UX Pro Max, Emil Design Engineering, Make Interfaces Feel Better, Accessibility.
Source files: `src/apple.css`, `src/views/Glance.tsx`, `src/components/BodyModel3D.tsx` and shared UI components.

## Model provenance and limits

The active viewer uses the exact `anatomy.json` and `anatomy.bin` datasets from
[Crew-Health-Monitor](https://github.com/AdityaK0804/Crew-Health-Monitor), reference commit
`9ac47bf4c1ebfc3f4f731341635790bdf36fc45f`. The independently authored viewer supports male/female
references, system filtering, rotation and zoom. `public/assets/anatomy/provenance.json` records hashes,
attribution and upstream changes. Male: BodyParts3D © The Database Center for Life Science. Female:
HuBMAP HRA reference organs. Both CC BY 4.0; see `ATTRIBUTIONS.md`. The earlier CC0 MakeHuman GLB
remains an unused asset with its original manifest. No upstream application source was copied.

The model is an illustrative human, not a scan of a crew member or a diagnostic representation.
Landmarks only link existing personal-lens verdicts to the existing signal detail views.
No measurements, urgency, thresholds, medical claims or source data are derived from the mesh.

The female source has limited peripheral vasculature and no vertebral-column mesh. For visual
completeness, the viewer aligns and scales the male-source peripheral vessels and spine to the female
reference, with peripheral arm vessels aligned to its silhouette; these are explicitly labelled
illustrative and are not sex-specific measurements. The heart is tilted about its own centre in the
body and inspector, without changing the selected synthetic heart-rate animation. The
male body and its lung inspector use scaled female-source lung surfaces where the original male lung
mesh does not depict a useful surface. The inspector's eye is a clearly labelled illustration. Organ
selectors use exact available mesh names; missing references are not replaced by generic geometry.
Unmodelled references such as the uterus do not display an unrelated simulated vascular trajectory.

## Interaction and performance

- Drag to rotate; keyboard-accessible rotate-left, rotate-right and front-reset controls provide an alternative.
- No automatic spinning. Rendering occurs on load, camera interaction, theme changes or resize; there is no continuous idle render loop.
- Pixel ratio is capped at 1.75. Three.js and OrbitControls load in separate chunks.
- Initial application JS is about approximately 344 kB (108 kB gzip). The lazy Three.js chunk is 753.3 kB (192.5 kB gzip), plus local anatomical data; the production build reports the normal >500 kB chunk advisory for that lazy chunk.
- The app makes no request to the model publisher at runtime. The build includes the mesh and manifest.
- A device without WebGL receives an explicit unavailable state and retains the full six-signal list. It does not silently fall back to a silhouette.
- Renderer, controls, geometries, skeletons, materials and observers are disposed when the view unmounts.
- On touch devices the viewer permits vertical page scrolling; explicit controls remain available for rotation.

## Verification

`npm run build` and `npm run test:e2e` pass. The browser suite now includes **17 groups**:
the previous mission/API/protocol checks, male/female anatomy, system filters, rotation/zoom/reset, check-in persistence, handbook and Earth-link integration, and a simulated
no-WebGL device. It checks all ten views at 375/768/1024/1440 px, including absence of capsule labels
and closed content frames, and confirms light/dark persistence and the static/API paths.

Evidence: `docs/qa/browser-results.json`, `docs/screenshots/01-overview.png`, the other view screenshots,
`07-mobile.png`, `08-light-theme.png` and `10-dark-theme.png`. This is not a full WCAG certification.
