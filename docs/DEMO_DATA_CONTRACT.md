# demo-data.json contract (for any front end)
Generate: `python scripts/export_demo_json.py [--effect 1.6]` -> `apps/crew-tablet/public/demo-data.json` (real engine output, SYNTHETIC crew).

```
{ synthetic: true, indicators: [rest_hr,temp_c,sleep_h,pvt_ms],
  days: [ { day: 1..24,
    attribution: { mode: none|individual|shared, affected: [..], advice },
    crew: { A|B|C|D: {
      level: info|watch|act|escalate, syndrome_z, learning: bool,
      indicators: { <name>: { value, baseline, ci95:[lo,hi], z, p, n_seen, unit, hrp_risk, hazard,
                              change_pending, unresolved_change, pending_z, pending_p,
                              lens: { earth, space, personal, pattern } } },
      card: { level, headline, what_changed, why_it_matters, confidence, do_now[], monitor[], escalate_if[], ground_message, citations[] },
      card_source: "template",            // later: "llm" when verified
      routing: { expected_reply_s, act_onboard_first, send_now, priority, message_budget_chars, note } } } } ] }
```
Rules for the UI: show `learning` as a visible state; show `ci95` as the personal band; headline the `lens.pattern` when lenses disagree; label everything SYNTHETIC; never recompute numbers in the front end.

The daily synthetic pipeline uses `day * 86400` as a relative observation time, not a real sensor timestamp. The `z` and `p` values describe the adaptive band; during a pending shift the engine may use the more significant `pending_z` / `pending_p` against the pre-change reference for the personal verdict and syndrome score. Show pending and unresolved states; an adaptive band must not hide a sustained shift. Time guards are demonstration policy and remain unverified for clinical use.
