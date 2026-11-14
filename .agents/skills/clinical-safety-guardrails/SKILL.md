---
name: clinical-safety-guardrails
description: Safety, ethics and honesty rules for TETHER - not a medical device, no diagnosis, synthetic-data policy, uncertainty display, escalation wording, privacy/consent tiers, AI-use disclosure. Use before shipping any copy, alert, recommendation, demo script, README or LLM prompt, and whenever someone asks to "make it sound more clinical/certain" or to use real health data.
---
# Clinical safety & honesty

1. **Not a medical device.** Say so on first screen, README, pitch. Decision support for *trained* crew following mission protocols, not diagnosis.
2. **No diagnosis language** in UI or LLM output ("you have", "definitely"). Use "pattern consistent with", "worth checking".
3. **Uncertainty is a feature.** Show credible intervals and confidence; never hide low-n.
4. **Escalation is conservative.** Engine may raise urgency freely; LLM may never lower it; ambiguity => higher level + "re-measure".
5. **Synthetic only.** No real personal health data in repo, prompts, logs or demos. Public OSDR data stays labelled proxy/real-public.
6. **Privacy by design (pitch-able):** crew-owned data; consent tiers for what goes to ground (vitals summary / symptoms / behavioral free-text). Behavioral free-text never leaves the device by default.
7. **Fail safe.** LLM down, sensor missing, or verifier rejects -> template card + visible "limited data" state. Never a blank screen, never a silent failure.
8. **Medication/dosing:** never output doses. Point to the onboard medical protocol.
9. **Honest claims.** No "validated", "clinical-grade", "detects X with N% accuracy" beyond what `ml/validation` reports on synthetic/proxy data, with the label.
10. **AI disclosure.** State which AI tools helped (DeepSeek, coding agents) in README per Space Apps participant guidance; the team reviews and owns all content. Read the official Terms & Conditions/Judging Guide before submitting (they reference eligibility rules).
11. **Third-party model risk.** Keep the provider swappable and the product LLM-optional; be ready to answer "what if the vehicle has no connectivity or the vendor is unavailable?".
