---
name: hackathon-pitch-submission
description: Plan, time-box and package the NASA Space Apps 2026 submission - scope control, 48h schedule, demo script, 60-second video, README, project page text, judging-criteria alignment (Impact, Creativity, Validity, Relevance, Presentation), submission checklist. Use whenever deadlines, demo, video, slides, README, "what do we show the judges", or final polish come up.
---
# Hackathon pitch & submission

Event: Sat 14 - Sun 15 Nov 2026. Teams up to 5. Confirm your local event's exact submission cutoff on the Space Apps site and finish **3 hours early**. Code must be public/open-source and linked; eligibility needs a project that responds to the official challenge; read the Judging & Awards Guide + Terms.

## Judging -> proof
| Criterion | Show |
|---|---|
| Impact | Earth-independent care; works with 20-min delay; CMO-is-the-patient scenario |
| Creativity | LLM explains but cannot decide (verifier); cache-stuffed KB; N-of-1 baselines |
| Validity | validation page, model card, real n=4 proxy test, honest weak spots |
| Relevance | immune, bone, cardiovascular, behavioral + radiation + CO2, each tied to an HRP risk |
| Presentation | 60-s video, 3 scenarios, one clear story |

## 60-second video script skeleton
0-8 s hook: "Mars is 20 light-minutes away. When the crew doctor is the one who's sick, who decides?"
8-20 s: normal day, personal baseline band. 20-40 s: scenario fires -> Decision Card (what changed, confidence, do now, send to ground with delay). 40-52 s: validation numbers incl. a limitation. 52-60 s: how it maps to NASA HRP risks + open-source link.

## Time-box
- Never start a new feature in the last 6 h. Freeze at T-4 h. Record video at T-3 h. Submit at T-3 h.
- Keep a `docs/demo-runbook.md`: exact clicks, fallback to recorded data if network dies.
- Rehearse the 3-minute live demo twice; have a no-LLM fallback visible.

## Submission checklist
public repo + LICENSE + README (setup in <= 5 commands) - live URL or video - screenshots - data card - model card - AI-use disclosure - team + roles - NASA data citations - limitations section.
