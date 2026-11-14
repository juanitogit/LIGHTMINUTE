# Submission checklist

Status as of 2026-11-14. ✅ done · ⚠️ pending · ❓ must confirm on the event site.

| Item | Status | Where / what is owed |
|---|---|---|
| Official challenge selected (not "Create Your Own") | ✅ | *Create Health Monitoring Software for Astronauts on Space Missions* |
| Public repository | ✅ | <https://github.com/juanitogit/NASA-SPACE-APPS-2026> |
| LICENSE file | ⚠️ | Apache-2.0 declared in README; the `LICENSE` file itself is A7's to add |
| README, setup in ≤5 commands | ✅ | `README.md` |
| Project description for the page | ✅ | `pitch/project-description.md` |
| 60-second video | ⚠️ | script ready: `pitch/video-script-60s.md`; recording + upload owed |
| Live URL or video link | ⚠️ | the demo is a local HTML file; if no hosting, the video is the deliverable |
| Screenshots (6 hero states) | ⚠️ | the tablet app now builds; capture Glance/Why/Act/radiation/validation from it (and the prototype as fallback) |
| Data card | ✅ | `docs/data-card.md` (sources, licenses, labels, blocked sources) |
| Model card | ✅ | `docs/model-card.md` (method, metrics, defects, failure modes) |
| Validation page / report | ✅ | `docs/validation.md` + `apps/crew-tablet/public/data/validation.json` |
| AI-use disclosure | ✅ | README + project description |
| NASA/NOAA credits | ✅ | `ATTRIBUTIONS.md` |
| Limitations section | ✅ | README, project description, model card |
| Team names and roles | ⚠️ | fill in before submitting |
| Offline demo fallback rehearsed | ✅ | `pitch/demo-3min.md` (no network needed) |
| Engine tests and tablet build on the merged tree | ✅ | 76/76 tests, `npm run build` OK (2026-11-14) |
| Judging guide + Terms read (2026 text) | ❓ | confirm eligibility, AI disclosure and repo-public rules for this edition |
| Local submission cutoff confirmed | ❓ | the vault still lists it as unconfirmed |
| Submitted ≥3 h before cutoff | ⚠️ | plan the freeze 4 h out, video 3 h out |

## Do not submit claiming
- clinical validation or diagnostic accuracy;
- that OSDR/Inspiration4 data was used (it was cited, not downloaded);
- that the app shell, API, ground console or protocol runner were clicked through on stage — they exist and build, but the demo owner must rehearse them;
- that the known forgetting-factor defect is fixed in the shared engine (a verified patch exists
  in `ml/diagnostics/`, but A1 owns the file).
