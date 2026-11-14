"""Delay-aware routing: what to do on board vs. what to tell Earth.

Light-time one-way: ISS ~0 s, Moon ~1.3 s, Mars ~3-22 min. The thresholds
below are DEMO POLICY parameters, not NASA procedure -- cite as such.
"""
from __future__ import annotations

PROFILES = {"iss": (0.0, 0.0), "moon": (1.3, 1.3), "mars": (180.0, 1320.0)}  # one-way s (min,max)
LEVELS = ["info", "watch", "act", "escalate"]


def triage_routing(level: str, one_way_s: float, ground_ack_s: float = 600.0,
                   onboard_first_rtt_s: float = 900.0) -> dict:
    rtt = 2.0 * one_way_s + ground_ack_s
    onboard_first = rtt > onboard_first_rtt_s and level != "info"
    return {
        "expected_reply_s": rtt,
        "act_onboard_first": onboard_first,
        "send_now": level != "info",
        "priority": 3 - LEVELS.index(level),            # 0 = most urgent
        "message_budget_chars": 140 if one_way_s > 60 else 400,
        "note": ("Reply may take too long: start the onboard protocol now and "
                 "send a self-contained summary." if onboard_first else
                 "Ground can answer in time: send and follow guidance."),
    }
