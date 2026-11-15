# Submission checklist

Status as of 2026-11-14. ✅ done · ⚠️ pending · ❓ must confirm on the event site.

| Item | Status | Where / what is owed |
|---|---|---|
| Official challenge selected (not "Create Your Own") | ✅ | *Create Health Monitoring Software for Astronauts on Space Missions* |
| Public repository | ⚠️ **blocker** | exists at <https://github.com/juanitogit/NASA-SPACE-APPS-2026> but is **private**: an anonymous request to `api.github.com/repos/juanitogit/NASA-SPACE-APPS-2026` returns 404. Space Apps needs a public repo — Settings → General → Danger zone → Change visibility → Public, then re-check in a private browser window |
| LICENSE file | ✅ | Apache-2.0 file present |
| README, setup in ≤5 commands | ✅ | `README.md` |
| Project description for the page | ✅ | `pitch/project-description.md` |
| 60-second video | ⚠️ | script ready: `pitch/video-script-60s.md`; recording + upload owed |
| Live URL or video link | ⚠️ | the demo is a local HTML file; if no hosting, the video is the deliverable |
| Screenshots (8 states) | ✅ | `docs/screenshots/`: five views, ground console, mobile, light theme |
| Data card | ✅ | `docs/data-card.md` (sources, licenses, labels, blocked sources) |
| Model card | ✅ | `docs/model-card.md` (method, metrics, defects, failure modes) |
| Validation page / report | ✅ | `docs/validation.md` + `apps/crew-tablet/public/data/validation.json` |
| AI-use disclosure | ✅ | README + project description |
| NASA/NOAA credits | ✅ | `ATTRIBUTIONS.md` |
| Limitations section | ✅ | README, project description, model card |
| Team names and roles | ⚠️ | fill in before submitting |
| Offline demo fallback rehearsed | ✅ | `pitch/demo-3min.md` (no network needed) |
| Engine tests and tablet build on the working tree | ✅ | 111/111 tests, `npm run build` OK (2026-11-15) |
| Judging guide + Terms read (2026 text) | ❓ | confirm eligibility, AI disclosure and repo-public rules for this edition |
| Local submission cutoff confirmed | ❓ | the vault still lists it as unconfirmed |
| Submitted ≥3 h before cutoff | ⚠️ | plan the freeze 4 h out, video 3 h out |
| Repo readable without login | ❌ | same blocker as above: verify with `curl -s -o /dev/null -w '%{http_code}' https://api.github.com/repos/juanitogit/NASA-SPACE-APPS-2026` → must be 200, not 404 |

## Do not submit claiming
- clinical validation or diagnostic accuracy;
- that OSDR/Inspiration4 data was used (it was cited, not downloaded);
- that an automated local browser rehearsal is an on-stage rehearsal; the local production build, API, console and runner now have reproducible browser coverage;
- clinical or real-crew validation: the forgetting-factor defect is fixed in the shared engine and regression-tested, but this does not establish clinical performance.

Current verification and remaining blockers: [integrated audit](ui-audit.md). New changes are local and have not been submitted.
