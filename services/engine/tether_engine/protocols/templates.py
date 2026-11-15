"""Deterministic Decision Card (no LLM). Only engine facts go in; passes verify_card."""
from __future__ import annotations


def _f(v) -> str:
    return f"{v:.1f}".rstrip("0").rstrip(".") if isinstance(v, float) else str(v)


def syndrome_level(z_dir: float) -> str:
    return "act" if z_dir >= 2.33 else "watch" if z_dir >= 1.5 else "info"


def _hr_sentence(n: dict) -> str:
    """HR clause of what_changed. A non-current HR is never quoted as a reading.

    FI-10: when today has no HR sample, state the age of the last sample (or that
    none exists) and omit its value, so an old number cannot pass as today's.
    """
    age = n.get("hr_age_days")
    if age == 0:
        return f"HR {_f(n['hr_now'])} vs your usual band {_f(n['hr_lo'])} to {_f(n['hr_hi'])}"
    if age is None:
        return "No current HR reading; no earlier reading to show"
    unit = "day" if age == 1 else "days"
    return f"No current HR reading; last reading {age} {unit} ago"


def template_card(facts: dict) -> dict:
    n, lvl = facts["numbers"], facts["level"]
    attribution = facts.get("attribution") or {}
    indicators = facts.get("indicators") or {}
    co2 = indicators.get("co2_ppm") or {}
    if (attribution.get("mode") == "shared" and facts["crew"] in attribution.get("affected", [])
            and str((co2.get("lens") or {}).get("personal", "")).startswith("unusual")
            and co2.get("value") is not None):
        # This reports observations, not a diagnosis or a prescribed response.
        # Do not claim causation between the environment and symptoms.
        values = [f"Cabin carbon dioxide {_f(co2['value'])} ppm"]
        for key, label, unit in (("headache_score", "headache score", ""),
                                 ("pvt_ms", "reaction time", " ms")):
            reading = indicators.get(key) or {}
            if reading.get("value") is not None:
                values.append(f"{label} {_f(reading['value'])}{unit}")
        observations = "; ".join(values)
        affected = ", ".join(attribution["affected"])
        ground_message = f"{facts['crew']}: {observations}; shared crew pattern ({affected}). Review requested."
        if len(ground_message) > 140:
            ground_message = f"{facts['crew']}: {'; '.join(values[:2])}; shared pattern ({affected}). Review requested."
        return {
            "level": lvl, "headline": "Shared crew pattern and unusual cabin reading",
            "what_changed": f"{observations}. Shared pattern detected for crew {affected}.",
            "why_it_matters": "The readings and shared pattern warrant review. This is not a diagnosis; the cause is unknown.",
            "confidence": facts.get("confidence", "moderate"),
            "do_now": ["Check the cabin reading and sensor status against the onboard procedure",
                       "Record symptoms and reaction-time results for the affected crew",
                       "Share the observed pattern with mission support and consult the applicable onboard protocol"],
            "monitor": ["Cabin carbon dioxide", "Headache", "Reaction time"],
            "escalate_if": ["Symptoms worsen or new symptoms appear", "Cabin readings remain unusual"],
            "ground_message": ground_message,
            "citations": ["HRP-RISKS-OVERVIEW"],
        }
    if lvl == "info":
        steps, esc = ["Continue routine measurements"], ["Any new symptom"]
        head = "Within your normal pattern"
        ground_message = f"{facts['crew']}: routine monitoring; within the current personal pattern. Continue scheduled measurements."
    else:
        steps = ["Re-measure heart rate after 5 minutes of rest",
                 "Log temperature and sleep tonight", "Ask a crew member to check how you look and feel"]
        esc = ["Score stays above the alert line for 2 more days", "Any new symptom"]
        head = "Several signals moved together away from your normal"
        ground_message = f"{facts['crew']}: coordinated shift in HR/temp/sleep/PVT; rechecking, will update."
    return {
        "level": lvl, "headline": head,
        "what_changed": f"{_hr_sentence(n)}; combined score {_f(n['z_dir'])}.",

        "why_it_matters": "A pattern worth checking, not a diagnosis; shifts that move together are more informative than one reading.",
        "confidence": facts.get("confidence", "moderate"),
        "do_now": steps, "monitor": ["Temperature", "Sleep", "Reaction time"], "escalate_if": esc,
        "ground_message": ground_message,
        "citations": ["HRP-RISKS-OVERVIEW"],
    }
