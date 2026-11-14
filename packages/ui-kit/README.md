# @tether/ui-kit

Shared visual tokens for TETHER surfaces. One file, no build step: import
`packages/ui-kit/tokens.css` before your own stylesheet.

```ts
import "../../../packages/ui-kit/tokens.css";
```

## What is in here

- **Type**: one sans family via `--font-sans`; `--font-mono` only for numbers,
  ids and timestamps.
- **Spacing**: 8-pt scale (`--s-1` … `--s-8`), `--radius`, `--tap: 48px`.
- **Theme**: dark is the default (`html[data-theme="dark"]`), light is
  `html[data-theme="light"]`. Set the attribute on `<html>`; the crew tablet
  persists the choice in `localStorage`.
- **Status**: `--ok` / `--watch` / `--act` / `--escalate`, each with a soft
  background. These are the only semantic colours; the app pairs every one with
  an icon and a text label (colour-blind safe, WCAG AA).
- **Accent**: one accent (`--accent`, `--accent-soft`) for interaction and the
  personal band. Do not introduce a second accent.
- **Low light**: `html[data-theme="dark"][data-shift="red"]` red-shifts ink and
  accent for night ops.

## Rules

1. Never use colour alone to convey status.
2. Keep body text at `--ink`, supporting text at `--muted`; both pass AA on
   `--surface`.
3. Contrast was checked for the shipped pairs; re-check if you add a surface.
4. Motion is 150–250 ms and must respect `prefers-reduced-motion`.
