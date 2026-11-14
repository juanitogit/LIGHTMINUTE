#!/usr/bin/env python3
"""Export REAL engine output for a 4-person synthetic crew to JSON for ANY front end.
python scripts/export_demo_json.py [--effect 1.6] [--out apps/crew-tablet/public/demo-data.json]
Crew A develops a coordinated shift at day 15; B,C,D stay healthy. All data synthetic."""
import os, sys, json, argparse
ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.join(ROOT, "services", "engine"))
from tether_engine.bayes import BaselineModel, SyndromeScore
from tether_engine.simulate.mini import INDICATORS, make_series, pop_stats
from tether_engine.protocols.thresholds import load_thresholds
from tether_engine.protocols.templates import template_card, syndrome_level
from tether_engine.lenses import three_lens
from tether_engine.crew.attribution import attribute
from tether_engine.ground.delay import triage_routing

ap = argparse.ArgumentParser()
ap.add_argument("--effect", type=float, default=1.6); ap.add_argument("--days", type=int, default=24)
ap.add_argument("--onset", type=int, default=14); ap.add_argument("--profile_one_way_s", type=float, default=660)
ap.add_argument("--out", default=os.path.join(ROOT, "apps", "crew-tablet", "public", "demo-data.json"))
a = ap.parse_args()
TH = load_thresholds(os.path.join(ROOT, "kb", "thresholds.json")); N = list(INDICATORS)
crew = {"A": (0, a.effect), "B": (1, 0.0), "C": (2, 0.0), "D": (3, 0.0)}
st = {}
for c, (seed, eff) in crew.items():
    st[c] = dict(data=make_series(seed, a.days, a.onset if eff else None, eff),
                 M={n: BaselineModel(*pop_stats(n)) for n in N},
                 syn=SyndromeScore([INDICATORS[n]["sign"] for n in N]))
days = []
for d in range(a.days):
    day = {"day": d + 1, "crew": {}}; zdirs = {}
    for c, s in st.items():
        zs, ind = [], {}
        for n in N:
            x = s["data"][n][d]; sur = s["M"][n].surprise(x); zs.append(sur["z"])
            lens = three_lens(TH[n], x, sur)
            ind[n] = {"value": round(x, 2), "baseline": round(sur["baseline"], 2),
                      "ci95": [round(sur["ci95"][0], 2), round(sur["ci95"][1], 2)], "z": round(sur["z"], 2),
                      "p": float(sur["p_two_sided"]), "n_seen": sur["n_seen"], "lens": lens,
                      "hrp_risk": TH[n].hrp_risk, "hazard": TH[n].hazard, "unit": TH[n].unit}
            s["M"][n].robust_update(x)
        sy = s["syn"].score(zs); s["syn"].observe(zs)
        mature = ind["rest_hr"]["n_seen"] >= 7          # stay silent while learning the person
        if mature: zdirs[c] = sy["z_dir"]
        lvl = syndrome_level(sy["z_dir"]) if mature else "info"
        h = ind["rest_hr"]
        facts = {"crew": c, "level": lvl, "confidence": "low" if h["n_seen"] < 7 else "moderate",
                 "numbers": {"hr_now": h["value"], "hr_lo": h["ci95"][0], "hr_hi": h["ci95"][1], "z_dir": round(sy["z_dir"], 1)}}
        day["crew"][c] = {"level": lvl, "syndrome_z": round(sy["z_dir"], 2), "indicators": ind,
                          "card": template_card(facts), "card_source": "template",
                          "learning": not mature, "routing": triage_routing(lvl, a.profile_one_way_s)}
    day["attribution"] = attribute(zdirs)
    days.append(day)
os.makedirs(os.path.dirname(a.out), exist_ok=True)
json.dump({"synthetic": True, "note": "Synthetic data. Not a medical device.",
           "indicators": N, "days": days}, open(a.out, "w"), indent=1, default=float)
print("wrote", a.out, "| days:", len(days))
