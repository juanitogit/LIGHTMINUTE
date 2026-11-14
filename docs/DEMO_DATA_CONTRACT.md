# demo-data.json contract (for any front end)
Generate: `python scripts/export_demo_json.py [--effect 1.6]` -> `apps/crew-tablet/public/demo-data.json` (real engine output, SYNTHETIC crew).

```
{ synthetic: true, indicators: [rest_hr,temp_c,sleep_h,pvt_ms],
  days: [ { day: 1..24,
    attribution: { mode: none|individual|shared, affected: [..], advice },
    crew: { A|B|C|D: {
      level: info|watch|act|escalate, syndrome_z, learning: bool,
      indicators: { <name>: { value, baseline, ci95:[lo,hi], z, p, n_seen, unit, hrp_risk, hazard,
                              lens: { earth, space, personal, pattern } } },
      card: { level, headline, what_changed, why_it_matters, confidence, do_now[], monitor[], escalate_if[], ground_message, citations[] },
      card_source: "template",            // later: "llm" when verified
      routing: { expected_reply_s, act_onboard_first, send_now, priority, message_budget_chars, note } } } } ] }
```
Rules for the UI: show `learning` as a visible state; show `ci95` as the personal band; headline the `lens.pattern` when lenses disagree; label everything SYNTHETIC; never recompute numbers in the front end.
