# Submission checklist

Status reviewed 2026-11-15. ✅ done · ⚠️ pending · ❓ must confirm on the event site.
For the form, use the single labelled evidence table in
[the project description](../pitch/project-description.md); its summary does not
combine synthetic, real-proxy and exploratory numbers.

| Item | Status | Where / what is owed |
|---|---|---|
| Official challenge selected (not "Create Your Own") | ✅ | *Create Health Monitoring Software for Astronauts on Space Missions* |
| Repository visibility | ⚠️ | Private by owner decision. Confirm event rules before submission; a public demo URL does not itself prove eligibility. Do not change visibility without the owner's decision. |
| LICENSE file | ✅ | Apache-2.0 file present |
| README, setup in ≤5 commands | ✅ | `README.md` |
| Project description for the page | ✅ | `pitch/project-description.md` |
| 60-second video | ⚠️ | script ready: `pitch/video-script-60s.md`; recording + upload owed |
| Live URL or video link | ✅ | https://lightminute.pages.dev is public; the Python backend is not available on that URL. |
| Screenshots (8 states) | ✅ | `docs/screenshots/`: five views, ground console, mobile, light theme |
| Data card | ✅ | `docs/data-card.md` (sources, licenses, labels, blocked sources) |
| Model card | ✅ | `docs/model-card.md` (method, metrics, defects, failure modes) |
| Validation page / report | ✅ | `docs/validation.md` + `apps/crew-tablet/public/data/validation.json` |
| AI-use disclosure | ✅ | README + project description |
| NASA/NOAA credits | ✅ | `ATTRIBUTIONS.md` |
| Limitations section | ✅ | README, project description, model card |
| Team names and roles | ⚠️ | fill in before submitting |
| Offline demo fallback rehearsed | ✅ | `pitch/demo-3min.md` (no network needed) |
| Engine tests and tablet build on the working tree | ✅ | 123/123 tests and build OK (2026-11-15) |
| Judging guide + Terms read (2026 text) | ❓ | confirm eligibility, AI disclosure and repo-public rules for this edition |
| Local submission cutoff confirmed | ❓ | the vault still lists it as unconfirmed |
| Submitted ≥3 h before cutoff | ⚠️ | plan the freeze 4 h out, video 3 h out |
| Repo readable without login | ❌ | Private by owner decision; confirm event requirements independently. |

## Do not submit claiming
- clinical validation or diagnostic accuracy;
- that the exploratory OSDR/Inspiration4 analysis proves diagnosis, causality or clinical sensitivity;
- that the autonomy study demonstrated a time advantage over Earth response;
- that an automated local browser rehearsal is an on-stage rehearsal; the local production build, API, console and runner now have reproducible browser coverage;
- clinical or real-crew validation: the forgetting-factor defect is fixed in the shared engine and regression-tested, but this does not establish clinical performance.

Current verification and remaining blockers: [integrated audit](ui-audit.md). New changes are local and have not been submitted.
