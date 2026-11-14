"""Deterministic Decision Card (no LLM). Only engine facts go in; passes verify_card."""
from __future__ import annotations


def _f(v) -> str:
    return f"{v:.1f}".rstrip("0").rstrip(".") if isinstance(v, float) else str(v)


def syndrome_level(z_dir: float) -> str:
    return "act" if z_dir >= 2.33 else "watch" if z_dir >= 1.5 else "info"


def template_card(facts: dict) -> dict:
    n, lvl = facts["numbers"], facts["level"]
    learning = facts.get("learning", facts.get("confidence") == "low")
    hr_available = all(k in n for k in ("hr_now", "hr_lo", "hr_hi"))
    changed = (f"HR {_f(n['hr_now'])} vs your usual band {_f(n['hr_lo'])} to {_f(n['hr_hi'])}."
               if hr_available else "Current heart rate unavailable; repeat the measurement.")
    if "z_dir" in n:
        changed += f" Combined score {_f(n['z_dir'])}."
    if lvl == "info":
        steps, esc = ["Continue routine measurements"], ["Any new symptom"]
        head = "Learning your personal pattern" if learning else "No coordinated alert detected"
    else:
        steps = ["Repeat available measurements following the onboard protocol",
                 "Log temperature and sleep tonight", "Ask a crew member to check how you look and feel"]
        esc = ["Follow the onboard protocol if the pattern persists or symptoms worsen", "Any new symptom"]
        head = "Several signals moved together away from your normal"
    if not hr_available:
        steps = ["Repeat the missing heart-rate measurement"] + steps[:4]
    shared = (facts.get("attribution") or {}).get("mode") == "shared"
    if shared and lvl != "info":
        head = "A shared crew pattern needs checking"
        steps = ["Check cabin readings and follow the onboard environmental protocol"] + steps[:4]
    return {
        "level": lvl, "headline": head,
        "what_changed": changed,
        "why_it_matters": "A pattern worth checking, not a diagnosis; shifts that move together are more informative than one reading.",
        "confidence": facts.get("confidence", "moderate"),
        "do_now": steps, "monitor": ["Temperature", "Sleep", "Reaction time"], "escalate_if": esc,
        "ground_message": (f"{facts['crew']}: routine monitoring; no coordinated alert detected."
                           if lvl == "info" else
                           f"{facts['crew']}: shared crew pattern; checking cabin and repeating measurements."
                           if shared else f"{facts['crew']}: combined score alert; repeating measurements, will update."),
        "citations": ["HRP-RISKS-OVERVIEW"],
    }
