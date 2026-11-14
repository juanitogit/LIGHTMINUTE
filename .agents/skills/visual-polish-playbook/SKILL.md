---
name: visual-polish-playbook
description: Plan and checklist to reach top-tier visual polish for the TETHER UI within hackathon time - design tokens, hero visual (body silhouette or 3D from original open datasets with attribution), motion, data-viz rules, dark/light, accessibility, loading performance, screenshot-ready states. Use whenever styling, restyling, adding a hero visual, or someone says "make it look as good as / better than another team's". Pair with crew-ux-design and frontend-design.
---
# Visual polish playbook

## Ethics first
Study rivals' public UI for patterns (hierarchy, density, flows). Do NOT copy their code, assets, copy, 3D files or branding. Open datasets they credit (e.g. BodyParts3D, HRA 3D Reference Organs; CC BY 4.0 per their README - verify at the original source) may be used directly from the source with attribution in-app and in README.

## Hero visual (pick ONE, time-box 3 h)
- Cheap/fast: SVG body silhouette with region glows tied to `hrp_risk` (immune/cardio/bone/vision/behavior).
- Premium: three.js model from the original open dataset, decimated (<3 MB), lazy-loaded only on that tab, fallback to SVG if load fails.
Clicking a glowing region opens the Why view for that indicator.

## Tokens (one file, `packages/ui-kit/tokens.css`)
Dark default + light; 4 status colors with icons + text (never color alone); 1 typeface family (variable); 8-pt spacing; radius 12; 1 accent. Contrast >= 4.5:1.

## Signature views
1. Crew strip (4 members, level + one sentence). 2. Why: personal band, Earth range line, pattern badge, syndrome strip. 3. Act: big checklist + ground-message queue with light-delay countdown. 4. Validation page with the table from `docs/validation.md`.

## Motion/perf
Subtle (150-250 ms), respect prefers-reduced-motion, no autoplay on alerts, Lighthouse perf >= 90, first paint < 2 s on a laptop, demo works offline from `demo-data.json`.

## Screenshot-ready
Every key state reachable via URL hash (`#crew=A&day=16`); a "Presentation mode" that hides dev chrome; export 6 hero screenshots for the submission page.

## Definition of done
Looks intentional at 1280x720 and 390x844; no layout shift; keyboard path through Act; axe has 0 serious issues.
