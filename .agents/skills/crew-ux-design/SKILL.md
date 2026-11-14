---
name: crew-ux-design
description: UX and visual design rules for the TETHER crew tablet and ground console - Glance->Why->Act hierarchy, cognitive-load limits, color-blind-safe status, WCAG 2.2 AA, glove/low-light friendliness, offline states, motion restraint. Use whenever you build or restyle any screen, component, chart or alert. Pairs with the frontend-design skill for distinctive (non-template) aesthetics.
---
# Crew UX design

Users are tired, isolated, possibly the patient, sometimes wearing gloves, in variable light.

## Information hierarchy: Glance -> Why -> Act
- **Glance (2 s):** one status per crew member (4 levels: info/watch/act/escalate) with icon + text + color (never color alone). Single most important sentence.
- **Why (10 s):** the "personal baseline" chart: your normal band (95% interval) vs today's value, with the shift explained in one line. Show confidence.
- **Act (30 s):** the Decision Card steps as large tappable checklist; "Re-measure", "Ask crew buddy", "Send to ground" (shows delay countdown).

## Rules
- Max 1 primary action per screen; touch targets >= 48px; high contrast; dark theme default with low-light red-shift option.
- No more than 3 colors for status + shapes/icons for redundancy (color-blind safe).
- Charts: baseline band + today's point + annotation; avoid dual axes and rainbow palettes. Always cite data source and label synthetic.
- Offline/degraded states are first-class: "limited data", "LLM offline - using protocol templates", "last sync 14 min ago".
- Reduce motion; no auto-playing animations on alerts.
- Accessibility: WCAG 2.2 AA, keyboard + screen-reader labels, tested with axe in CI.
- Ground console: crew list, trends, queue of delayed messages with a visible light-delay timeline (ISS 0 s, Moon ~1.3 s, Mars 3–22 min).
- Aesthetic: calm "mission-control instrument", not neon sci-fi. One typeface family, generous spacing, restrained accent color. Use the `frontend-design` skill for craft.
- Demo-first: every screen must be reachable in <= 2 taps from the scenario picker.
