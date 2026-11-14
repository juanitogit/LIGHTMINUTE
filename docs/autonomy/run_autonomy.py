"""Preregistered synthetic autonomy study; imports the shipped engine unchanged.

Run from repository root: .venv/Scripts/python.exe docs/autonomy/run_autonomy.py
Outputs are confined to docs/autonomy. No network or LLM calls.
"""
from __future__ import annotations

import csv
import hashlib
import json
import math
from pathlib import Path
import statistics
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "services" / "engine"))
from tether_engine.pipeline import run_scenario
from tether_engine.simulate.scenarios import SCENARIOS, DEFAULT_DAYS, labels_for
from tether_engine.ground.delay import PROFILES

TUNING = list(range(1000, 1010))
REPORT = list(range(2000, 2030))
PROCESSING = [300, 900, 1800, 3600]
DAY_S = 86400
LEVEL = {"info": 0, "watch": 1, "act": 2, "escalate": 3}


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def source_hashes():
    paths = sorted((ROOT / "services/engine/tether_engine").rglob("*.py"))
    paths += [ROOT / "kb/thresholds.json", ROOT / "kb/syndromes.json"]
    return {str(p.relative_to(ROOT)).replace("\\", "/"): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in paths}


def references():
    specs = json.loads((ROOT / "kb/thresholds.json").read_text(encoding="utf-8"))
    included, excluded = {}, {}
    for spec in specs:
        rule = spec.get("earth")
        if not rule:
            excluded[spec["indicator"]] = "no Earth reference"
        elif rule.get("low") is None or rule.get("high") is None:
            excluded[spec["indicator"]] = "one-sided rule has no range width; demo-parameter"
        elif rule.get("status") != "earth-standard":
            excluded[spec["indicator"]] = "not earth-standard"
        elif rule["high"] <= rule["low"]:
            excluded[spec["indicator"]] = "nonpositive width"
        else:
            included[spec["indicator"]] = rule
    return included, excluded


def population_score(indicators, refs):
    distances = []
    for name, rule in refs.items():
        value = indicators.get(name, {}).get("value")
        if value is None or not math.isfinite(value):
            continue
        low, high = rule["low"], rule["high"]
        distances.append(max(low - value, value - high, 0) / (high - low))
    return max(distances) if distances else None


def collect(seeds, refs, phase):
    records, events = [], []
    for name, spec in SCENARIOS.items():
        for variant in ("strong", "mild"):
            for seed in seeds:
                doc = run_scenario(name, variant=variant, seed=seed, days=DEFAULT_DAYS)
                labels = labels_for(name, variant=variant, seed=seed, days=DEFAULT_DAYS)
                onset = labels["onset_day"]
                duration = spec["effects"][variant]["duration_days"]
                end = min(DEFAULT_DAYS + 1, onset + duration) if duration else DEFAULT_DAYS + 1
                for crew in labels["affected"]:
                    events.append({"event_id": f"{name}/{variant}/{seed}/{crew}", "scenario": name,
                                   "variant": variant, "seed": seed, "crew": crew,
                                   "onset": onset, "effect_end_exclusive": end})
                for day in doc["days"]:
                    for crew, entry in day["crew"].items():
                        observed = bool(entry.get("indicators"))
                        affected = crew in labels["affected"] and onset <= day["day"] < end
                        records.append({"scenario": name, "variant": variant, "seed": seed,
                                        "crew": crew, "day": day["day"], "observed": observed,
                                        "affected": affected, "level": entry["level"],
                                        "population_score": population_score(entry.get("indicators", {}), refs)})
            print(f"{phase}: {name}/{variant}, {len(seeds)} seeds", flush=True)
    return records, events


def first_day(rows, predicate, onset):
    return next((row["day"] for row in rows if row["day"] >= onset and predicate(row)), None)


def summary(rows, event_rows):
    unaffected = [r for r in rows if r["observed"] and not r["affected"]]
    false = sum(r["act"] for r in unaffected)
    detected = [e for e in event_rows if e["act_day"] is not None]
    watches = [e for e in event_rows if e["watch_day"] is not None]
    return {"events": len(event_rows), "detected_act": len(detected),
            "detected_watch": len(watches), "nondetected_act": len(event_rows) - len(detected),
            "nondetected_watch": len(event_rows) - len(watches),
            "act_detection_fraction": len(detected) / len(event_rows),
            "watch_detection_fraction": len(watches) / len(event_rows),
            "median_act_latency_days": statistics.median(e["act_latency_days"] for e in detected) if detected else None,
            "median_watch_latency_days": statistics.median(e["watch_latency_days"] for e in watches) if watches else None,
            "act_first_after_effect_ended": sum(e["act_day"] >= e["effect_end_exclusive"] for e in detected),
            "false_act_days": false, "observed_unaffected_crew_days": len(unaffected),
            "false_act_per_crew_week": false * 7 / len(unaffected) if unaffected else None}


def write_csv(name, rows):
    with (OUT / name).open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def write_report(result):
    frozen = result["frozen_comparator"]
    overall = {row["method"]: row for row in result["aggregates"] if row["scenario"] == "ALL"}
    def percentage(n, d):
        return f"{100 * n / d:.2f}%"
    lines = [
        "# Value of autonomy — synthetic scenario results",
        "",
        "**Task gate: DONE for the registered simulation; no mission or clinical claim.**",
        "The primary conservative autonomy-window coverage is zero for both methods across the registered delay sweep. Daily observations cannot establish that an action happened before a reply arriving within minutes. Start-of-day point estimates are secondary assumptions, not measured minute-scale benefit.",
        "",
        f"Generated: `{result['generated_at']}`. Source revision: `{result['source_revision']}`. Preregistration was committed in `2fea48f` before execution. The study imports the engine unchanged. Full source hashes and pre-existing dirty source paths are in `results.json`; those hashes were equal before/after the analysis. No product file was edited by this study.",
        "",
        "## Reproduce and inspect",
        "",
        "From repository root, with the existing environment:",
        "```powershell",
        ".\\.venv\\Scripts\\python.exe docs/autonomy/run_autonomy.py *> docs/autonomy/run.log",
        "```",
        "Actual command executed in this session (global interpreter with the existing venv packages):",
        "```powershell",
        "python -u -c \"import sys,runpy; sys.path.insert(0,r'.venv/Lib/site-packages');runpy.run_path('docs/autonomy/run_autonomy.py',run_name='__main__')\" *> docs/autonomy/run.log",
        "```",
        "The command exited successfully. `run.log` contains progress, the frozen tuning configuration and the aggregate output. `events.csv` preserves each event and null/empty nondetections; `daily.csv` preserves the scored crew-days; `aggregate.csv` and `sensitivity.csv` provide the tables without rounding. `results.json` holds provenance and machine-readable results.",
        "",
        "## Registered design and population comparator",
        "",
        f"Default mission length: {result['days']} days. Tuning seeds `{min(TUNING)}–{max(TUNING)}` and report seeds `{min(REPORT)}–{max(REPORT)}` are disjoint. All three scenario families and both strength variants are included, with every generated crew member. An event is one affected crew member in one scenario/variant/seed; shared CO2 crew events are correlated, not independent subjects.",
        "The population score is the maximum distance outside a two-sided Earth reference, divided by its range width. It is a comparator implemented for this study, not an existing clinical early-warning score. It uses the repository's HR, temperature and sleep rules; their source strings are general/approximate references, not independently verified NASA limits. PVT has no Earth reference; CO2/headache are one-sided demo parameters and have no range width, so all three are excluded rather than assigned invented widths. See `FROZEN-COMPARATOR.json` for the original rules and exclusions.",
        f"The threshold was frozen at `{frozen['threshold']:.15g}` with strict `score > threshold` before report split execution. Score ties at the cutoff stay quiet. On {frozen['tuning_observed_unaffected_crew_days']} unaffected observed tuning crew-days, engine and population each produced {frozen['tuning_engine_false_act_days']} and {frozen['tuning_population_false_act_days']} false act-days respectively. No engine threshold or scenario parameter was tuned.",
        "On held-out seeds the realized false-alert budgets differ; these results must not be described as equal-budget held-out performance. Population watch is defined as its act threshold because this comparator has one operating point; its watch latency is not a separate calibrated early-warning output.",
        "",
        "## Detection and false-action results",
        "",
        "Latencies are medians among detected events only. Nondetections remain missing, never zero. First detection is searched from onset through the final mission day, as preregistered. False act-days are counted on observed days outside the affected effect interval, including recovery days and all days of unaffected crew. Effect duration is read from the simulator specification because the labels sidecar supplies onset/affected crew but omits its end. Sustained alarms count repeatedly; these are alert-days, not independent episodes.",
        "",
        "| Method | Scenario / variant | Events | Watch detected (missed) | Median watch latency d | Act detected (missed) | Act detection | Median act latency d | False act-days / unaffected observed days | False acts / crew-week |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for row in result["aggregates"]:
        lines.append(f"| {row['method']} | {row['scenario']} / {row['variant']} | {row['events']} | {row['detected_watch']} ({row['nondetected_watch']}) | {row['median_watch_latency_days']} | {row['detected_act']} ({row['nondetected_act']}) | {percentage(row['detected_act'], row['events'])} | {row['median_act_latency_days']} | {row['false_act_days']} / {row['observed_unaffected_crew_days']} | {row['false_act_per_crew_week']:.5f} |")
    lines += [
        "",
        f"First acts after the effect ended: engine {overall['engine']['act_first_after_effect_ended']}, population {overall['population']['act_first_after_effect_ended']}. The population comparator detects more strong SEP events in this run; superiority is not universal. The overall mixture weights CO2 more heavily because it affects the full crew. No confidence intervals or significance claims are made for these correlated scripted simulations.",
        "",
        "## Reply assumptions and autonomy coverage",
        "",
        "ISS/Moon/Mars light-time inputs are imported from the repository's demo profiles, not verified mission facts. Ground-processing times below are explicit synthetic policies. Reply bounds are two-way light-time plus processing; no message loss, queueing, bandwidth, diagnosis quality or clinician availability is modeled here.",
        "A day-bin action could occur anywhere within that mission day. Primary conservative success requires **the end of the action bin to precede the earliest reply**. Secondary point-time success assumes the reading/action and message origin occur at the start of their days. Equality is not counted as before. The denominator always includes all true events, including nondetections.",
        "",
        "| Mission profile | Ground processing s | Earliest reply s | Latest reply s |",
        "|---|---:|---:|---:|",
    ]
    for row in result["sensitivity"]:
        if row["method"] == "engine" and row["message_origin"] == "true_onset":
            lines.append(f"| {row['profile']} | {row['ground_processing_s']} | {row['earliest_reply_after_origin_s']:g} | {row['latest_reply_after_origin_s']:g} |")
    lines += ["", "Full sensitivity (all registered profiles/processing policies and both message origins):", "",
              "| Method | Origin | Profile | Processing s | Events | Conservative before earliest | Point before earliest | Conservative before latest | Point before latest |",
              "|---|---|---|---:|---:|---:|---:|---:|---:|"]
    for row in result["sensitivity"]:
        d = row["event_denominator"]
        cells = [f"{row[k]}/{d} ({percentage(row[k], d)})" for k in (
            "conservative_before_earliest", "point_before_earliest", "conservative_before_latest", "point_before_latest")]
        lines.append(f"| {row['method']} | {row['message_origin']} | {row['profile']} | {row['ground_processing_s']} | {d} | " + " | ".join(cells) + " |")
    lines += [
        "",
        "The true-onset origin hypothetically sends a message at the moment of labelled onset, even if neither detector has noticed anything. The actual-first-watch alternative means the first watch on or after labelled onset, as registered; it ignores any earlier false watch. Those are different questions and must not be pooled. In particular, the population method defines watch and act identically, making its point-time act-before-reply count after watch largely tautological. The alternative does not demonstrate an independent speed advantage.",
        "",
        "## Limitations and gate",
        "",
        "- All crews, illnesses/exposures and outcomes here are synthetic, from our own simulator. This is not a clinical trial, mission validation, independent replication, diagnosis assessment or evidence of improved health outcomes.",
        "- Historical validation results were visible before this preregistration. This analysis uses held-out seeds, but is not blinded or externally independent.",
        "- Daily time resolution is coarser than every reply bound in this sweep. The zero conservative result is a valid negative outcome; positive point-time percentages cannot resolve that uncertainty.",
        "- The engine was designed for these scenario families; held-out seeds vary noise and person offsets, not the underlying causal scenario design. Population reference choices and missing rules limit comparability.",
        "- False-alert rates use unaffected crew-days, not all mission days, and repeated alarms are repeated alert-days. Detection medians exclude missed events; report misses alongside medians.",
        "- A threshold already exceeded before onset can count as an onset-day detection; the registered metric does not require a new alarm transition. The separate false-alert cost must remain visible.",
        "- No source outside the repository was needed or independently verified for these demo delay assumptions. No NASA assurance/clinical standard compliance is claimed.",
        "- Existing baseline suite verification is coordinated separately by the parent credibility run; this script checks seed separation, conservative tuning and unchanged source hashes. It does not claim a fresh baseline-suite result.",
        "",
        "| Item | Status | Evidence | Caveat |",
        "|---|---|---|---|",
        "| Preregistered analysis | DONE | `PREREG.md`, commit `2fea48f` | Historical validation already known |",
        "| Unchanged engine and separate tuning/report seeds | DONE | `results.json`, `FROZEN-COMPARATOR.json` | Exact hashes recorded; no new engine tuning |",
        "| Watch/act latency and nondetections | DONE | `events.csv`, `aggregate.csv` | Daily bins and detected-only medians |",
        "| False act budget and population comparison | DONE | `daily.csv`, frozen threshold | Tuning budget matched; held-out budgets differ |",
        "| Delay sensitivity and autonomy coverage | DONE | `sensitivity.csv` | All primary conservative coverage zero |",
        "| Mission or clinical benefit | NOT DONE | No mission/clinical data | Simulation only |",
        "",
    ]
    (OUT / "RESULTS.md").write_text("\n".join(lines), encoding="utf-8")


def main():
    assert not set(TUNING) & set(REPORT)
    before = source_hashes()
    revision = git("rev-parse", "HEAD")
    refs, excluded = references()
    training, _ = collect(TUNING, refs, "tuning")
    unaffected = [r for r in training if r["observed"] and not r["affected"]]
    budget_count = sum(LEVEL[r["level"]] >= 2 for r in unaffected)
    scores = sorted(r["population_score"] for r in unaffected if r["population_score"] is not None)
    # Threshold comparison is strict >: all score ties at the cutoff stay quiet.
    threshold = max(0.0, scores[max(0, len(scores) - budget_count - 1)])
    comparator_false = sum(score > threshold for score in scores)
    assert comparator_false <= budget_count
    frozen = {"threshold": threshold, "operator": ">", "tuning_engine_false_act_days": budget_count,
              "tuning_population_false_act_days": comparator_false,
              "tuning_observed_unaffected_crew_days": len(unaffected),
              "tuning_seeds": TUNING, "report_seeds": REPORT,
              "references": refs, "excluded_references": excluded,
              "frozen_at": datetime.now(timezone.utc).isoformat(), "source_revision": revision}
    (OUT / "FROZEN-COMPARATOR.json").write_text(json.dumps(frozen, indent=2), encoding="utf-8")
    print("Frozen comparator", json.dumps(frozen), flush=True)
    # The report split is not inspected until this immutable configuration exists.
    records, raw_events = collect(REPORT, refs, "report")
    event_rows, aggregates, classified = [], [], []
    for method in ("engine", "population"):
        rows = []
        for raw in records:
            act = LEVEL[raw["level"]] >= 2 if method == "engine" else (
                raw["population_score"] is not None and raw["population_score"] > threshold)
            watch = LEVEL[raw["level"]] >= 1 if method == "engine" else act
            rows.append({**raw, "method": method, "act": act, "watch": watch})
        classified.extend(rows)
        grouped = {}
        for row in rows:
            grouped.setdefault((row["scenario"], row["variant"], row["seed"], row["crew"]), []).append(row)
        current_events = []
        for event in raw_events:
            member = grouped[(event["scenario"], event["variant"], event["seed"], event["crew"])]
            watch = first_day(member, lambda r: r["watch"], event["onset"])
            act = first_day(member, lambda r: r["act"], event["onset"])
            current_events.append({**event, "method": method, "watch_day": watch, "act_day": act,
                                   "watch_latency_days": None if watch is None else watch - event["onset"],
                                   "act_latency_days": None if act is None else act - event["onset"]})
        event_rows.extend(current_events)
        for scenario, variant in [(None, None)] + [(n, v) for n in SCENARIOS for v in ("strong", "mild")]:
            subrows = [r for r in rows if scenario is None or (r["scenario"] == scenario and r["variant"] == variant)]
            subevents = [e for e in current_events if scenario is None or (e["scenario"] == scenario and e["variant"] == variant)]
            aggregates.append({"method": method, "scenario": scenario or "ALL", "variant": variant or "ALL",
                               **summary(subrows, subevents)})
    sensitivity = []
    for method in ("engine", "population"):
        events = [e for e in event_rows if e["method"] == method]
        for profile, (minimum, maximum) in PROFILES.items():
            for processing in PROCESSING:
                for origin in ("true_onset", "actual_first_watch"):
                    earliest, latest = 2 * minimum + processing, 2 * maximum + processing
                    counts = {"conservative_before_earliest": 0, "point_before_earliest": 0,
                              "conservative_before_latest": 0, "point_before_latest": 0}
                    missing_origins = 0
                    for event in events:
                        if event["act_day"] is None:
                            continue
                        if origin == "actual_first_watch" and event["watch_day"] is None:
                            missing_origins += 1
                            continue
                        origin_day = event["onset"] if origin == "true_onset" else event["watch_day"]
                        delta = (event["act_day"] - origin_day) * DAY_S
                        for suffix, limit in (("earliest", earliest), ("latest", latest)):
                            counts[f"conservative_before_{suffix}"] += delta + DAY_S < limit
                            counts[f"point_before_{suffix}"] += delta < limit
                    sensitivity.append({"method": method, "profile": profile, "ground_processing_s": processing,
                                        "message_origin": origin, "earliest_reply_after_origin_s": earliest,
                                        "latest_reply_after_origin_s": latest, "event_denominator": len(events),
                                        "missing_origin_among_act_detected": missing_origins,
                                        **counts, **{key + "_fraction": value / len(events) for key, value in counts.items()}})
    assert before == source_hashes(), "engine/source files changed during analysis"
    result = {"label": "synthetic", "source_revision": revision,
              "engine_source_hashes": before, "source_dirty_paths": git("status", "--porcelain", "--", "services/engine/tether_engine", "kb"),
              "generated_at": datetime.now(timezone.utc).isoformat(), "days": DEFAULT_DAYS,
              "frozen_comparator": frozen, "aggregates": aggregates, "sensitivity": sensitivity,
              "non_detection_encoding": "null in JSON, empty CSV cell; never zero latency",
              "detection_horizon": "onset through final mission day; detections after effect ended counted and flagged",
              "population_watch_definition": "same threshold as population act; no separate watch operating point"}
    write_csv("events.csv", event_rows)
    write_csv("daily.csv", classified)
    write_csv("aggregate.csv", aggregates)
    write_csv("sensitivity.csv", sensitivity)
    (OUT / "results.json").write_text(json.dumps(result, indent=2, allow_nan=False), encoding="utf-8")
    write_report(result)
    print("AGGREGATES", json.dumps(aggregates), flush=True)
    print("Outputs: docs/autonomy/{events,daily,aggregate,sensitivity}.csv and results.json", flush=True)


if __name__ == "__main__":
    main()
