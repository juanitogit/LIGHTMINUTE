"""Preregistered real-public proxy analyses; imports the engine unchanged.

Run from project/: .venv/Scripts/python.exe ml/proxy/credibility_analysis.py
No network. Requires cached public OSDR files and the verified MMASH snapshot.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import math
import platform
import re
import subprocess
import sys
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import scipy

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "services" / "engine"))
from tether_engine.bayes import BaselineModel

MMASH_SHA = "ef91ee1b36b5849a6366b1918de82686ab278915d33c7f62133f07f741f70726"
START_UTC = "2026-11-14T20:35:00+00:00"  # earliest official access recorded by orchestrator


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def minute(day: str, clock: str) -> int:
    pieces = clock.strip().split(":")
    h, m = int(pieces[0]), int(pieces[1])
    d = int(float(day))
    if h not in range(24) or m not in range(60) or d not in (1, 2):
        raise ValueError("invalid dataset timestamp")
    return (d - 1) * 1440 + h * 60 + m


def rows(z: zipfile.ZipFile, name: str) -> list[dict]:
    return list(csv.DictReader(io.StringIO(z.read(name).decode("utf-8-sig"))))


def read_rr(z: zipfile.ZipFile, user: str) -> tuple[np.ndarray, np.ndarray, dict]:
    buckets = defaultdict(list)
    quality = Counter()
    for row in rows(z, f"DataPaper/{user}/RR.csv"):
        quality["source_rows"] += 1
        try:
            rr = float(row["ibi_s"])
            t = minute(row["day"], row["time"])
        except (KeyError, ValueError, TypeError, IndexError):
            quality["malformed_or_bad_timestamp"] += 1
            continue
        if not math.isfinite(rr) or rr <= 0:
            quality["nonfinite_or_nonpositive_rr"] += 1
            continue
        hr = 60.0 / rr  # official data dictionary: ibi_s in seconds
        if not math.isfinite(hr):
            quality["nonfinite_derived_hr"] += 1
            continue
        buckets[t].append(hr)
        quality["retained_rr_rows"] += 1
    times = np.array(sorted(buckets), dtype=int)
    values = np.array([float(np.median(buckets[t])) for t in times])
    quality["occupied_minutes"] = len(times)
    quality["missing_minutes_within_span"] = int(times[-1] - times[0] + 1 - len(times)) if len(times) else 0
    return times, values, dict(quality)


def sleep_flags(z: zipfile.ZipFile, user: str, times: np.ndarray) -> tuple[np.ndarray, dict]:
    flags = np.zeros(len(times), dtype=bool)
    q = Counter()
    for row in rows(z, f"DataPaper/{user}/sleep.csv"):
        try:
            start = minute(row["Onset Date"], row["Onset Time"])
            end = minute(row["Out Bed Date"], row["Out Bed Time"])
            if end <= start:
                raise ValueError("invalid sleep interval")
        except (ValueError, TypeError, KeyError, IndexError):
            q["unaligned_sleep_rows"] += 1
            continue
        flags |= (times >= start) & (times < end)
        q["aligned_sleep_intervals"] += 1
    return flags, dict(q)


def clock_design(times: np.ndarray) -> np.ndarray:
    phase = 2 * np.pi * (times % 1440) / 1440
    return np.column_stack([np.ones(len(times)), np.sin(phase), np.cos(phase)])


def lag1(values: list[float], times: np.ndarray) -> float | None:
    a = np.asarray(values)
    adjacent = np.diff(times) == 1
    x, y = a[:-1][adjacent], a[1:][adjacent]
    if len(x) < 2 or np.std(x) == 0 or np.std(y) == 0:
        return None
    return float(np.corrcoef(x, y)[0, 1])


def score_stream(values: np.ndarray, times: np.ndarray, training_n: int,
                 sleeping: np.ndarray) -> dict:
    train = values[:training_n]
    prior_sd = max(float(np.std(train, ddof=1)), 1e-6)
    model = BaselineModel(float(np.mean(train)), prior_sd)
    for x in train:
        model.robust_update(float(x))
    covered, widths, residuals = [], [], []
    for x in values[training_n:]:
        s = model.surprise(float(x))
        lo, hi = s["ci95"]
        covered.append(bool(lo <= x <= hi))
        widths.append(float(hi - lo))
        residuals.append(float(x - s["baseline"]))
        model.robust_update(float(x))
    mask = sleeping[training_n:]
    n = len(covered)
    counts = {}
    for label, selector in (("sleep_interval", mask), ("other", ~mask)):
        counts[label] = {"n": int(np.sum(selector)),
                         "covered": int(np.sum(np.asarray(covered)[selector]))}
    return {"report_n": n, "covered": sum(covered), "coverage": sum(covered) / n,
            "outside_band_flags_per_observed_person_day": (n - sum(covered)) * 1440 / n,
            "median_width_bpm": float(np.median(widths)), "mean_width_bpm": float(np.mean(widths)),
            "lag1_innovation_correlation": lag1(residuals, times[training_n:]),
            "training_sd_bpm": prior_sd, "annotation_strata": counts}


def longest_constant(values: np.ndarray, times: np.ndarray) -> int:
    best = run = 1
    for i in range(1, len(values)):
        run = run + 1 if values[i] == values[i-1] and times[i] == times[i-1]+1 else 1
        best = max(best, run)
    return best


def mmash() -> dict:
    archive = ROOT / "data" / "snapshots" / "MMASH.zip"
    if sha(archive) != MMASH_SHA:
        raise ValueError("MMASH archive differs from official SHA256SUMS")
    people, excluded = [], []
    with zipfile.ZipFile(archive) as z:
        users = sorted({p.split("/")[1] for p in z.namelist()
                        if re.fullmatch(r"DataPaper/user_\d+/RR.csv", p)},
                       key=lambda s: int(s.split("_")[1]))
        for user in users:
            t, y, quality = read_rr(z, user)
            training_n = int(len(y) * 0.20)
            if training_n < 60 or len(y) - training_n < 60:
                excluded.append({"subject": user, "reason": "insufficient occupied train/report minutes", "quality": quality})
                continue
            sleeping, sleep_quality = sleep_flags(z, user, t)
            design = clock_design(t)
            coefficients = np.linalg.lstsq(design[:training_n], y[:training_n], rcond=None)[0]
            adjusted = y - design @ coefficients
            raw = score_stream(y, t, training_n, sleeping)
            context = score_stream(adjusted, t, training_n, sleeping)
            record = {"subject": user, "training_n": training_n, "quality": quality,
                      "sleep_alignment": sleep_quality,
                      "training_clock_span_hours": float((t[training_n-1]-t[0]+1)/60),
                      "clock_design_condition_number": float(np.linalg.cond(design[:training_n])),
                      "longest_constant_minute_segment": longest_constant(y,t),
                      "hr_min_bpm": float(np.min(y)), "hr_max_bpm": float(np.max(y)),
                      "fixed_training_circadian_coefficients": coefficients.tolist(),
                      "raw": raw, "circadian_residual": context}
            people.append(record)
            print("MMASH", user, "train", training_n, "report", raw["report_n"],
                  "raw", round(raw["coverage"], 4), "context", round(context["coverage"], 4), flush=True)
    pooled = {}
    for method in ("raw", "circadian_residual"):
        n = sum(p[method]["report_n"] for p in people)
        cov = sum(p[method]["covered"] for p in people)
        pooled[method] = {"report_n": n, "covered": cov, "coverage": cov/n,
                          "outside_band_flags_per_observed_person_day": (n-cov)*1440/n,
                          "median_of_person_median_widths_bpm": float(np.median([p[method]["median_width_bpm"] for p in people])),
                          "median_person_lag1_correlation": float(np.median([p[method]["lag1_innovation_correlation"] for p in people if p[method]["lag1_innovation_correlation"] is not None])),
                          "calibration_gate_pass": 0.90 <= cov/n <= 0.98}
    a, b = pooled["raw"], pooled["circadian_residual"]
    helpful = (abs(b["coverage"]-.95) < abs(a["coverage"]-.95)
               and b["median_of_person_median_widths_bpm"] <= a["median_of_person_median_widths_bpm"])
    return {"label": "proxy", "synthetic": False, "status": "DONE",
            "archive_sha256": sha(archive), "users": len(people), "excluded": excluded,
            "pooled": pooled, "context_helpful_by_preregistered_rule": helpful,
            "per_person": people, "annotated_disease_detection": "NOT DONE: no labelled disease events",
            "annotated_sleep_association": "Coverage stratified by explicit sleep onset/out-of-bed intervals; awakenings are not minute-resolved truth."}


def read_json_cache(name: str) -> dict:
    return json.loads((HERE / "cache" / (name + ".bin")).read_bytes())


def osdr() -> dict:
    meta = read_json_cache("osdr-575-meta-legacy")["study"]["OSD-575"]
    sample_table = next(iter(meta["additionalInformation"]["samples"].values()))
    sample_meta = {r["a100001samplename"]: r for r in sample_table["raw"]}
    manifest = read_json_cache("osdr-575-files-legacy")
    source = next(e for e in manifest["studies"]["OSD-575"]["study_files"]
                  if e["file_name"] == "LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv")
    assert source["restricted"] is False
    path = HERE / "cache" / "osdr-575-cmp.bin"
    if sha(path) != "5eb1e7f025dd8443a9e70111e62bc32afae3432753024489c5c013e401d709d9":
        raise ValueError("CMP archive differs from the audited public release")
    table = list(csv.DictReader(io.StringIO(path.read_text(encoding="utf-8-sig"))))
    indicators = [c for c in table[0] if c.endswith("_value") or "_value_" in c]
    grouped = defaultdict(list)
    for row in table:
        m = sample_meta[row["Sample Name"]]
        if m["a100012unit"] != "day":
            raise ValueError("undocumented visit-time units")
        phase = m["a100015factorvaluespaceflight"]
        visit = m["a100011factorvaluetime"]
        if phase == "Pre-flight" and re.fullmatch(r"Launch minus \d+", visit):
            order = -int(visit.rsplit(" ", 1)[1])
        elif phase == "Post-flight" and re.fullmatch(r"Return plus \d+", visit):
            order = int(visit.rsplit(" ", 1)[1])
        else:
            raise ValueError("unknown visit metadata; do not infer from sample names")
        grouped[m["a100000sourcename"]].append((phase, order, row))
    outputs, exclusions = [], []
    for subject, visits in sorted(grouped.items()):
        for indicator in indicators:
            pre, post = [], []
            missing = 0
            for phase, order, row in visits:
                try:
                    value = float(row[indicator])
                    if not math.isfinite(value):
                        raise ValueError("nonfinite")
                except (TypeError, ValueError):
                    missing += 1
                    continue
                (pre if phase == "Pre-flight" else post).append((order, value))
            pre.sort(); post.sort()
            if len(pre) < 2 or not post:
                exclusions.append({"subject": subject, "indicator": indicator,
                                   "pre_n": len(pre), "post_n": len(post), "missing": missing})
                continue
            train = np.array([v for _, v in pre])
            scale = max(float(np.std(train, ddof=1)), 1e-6)
            model = BaselineModel(float(np.mean(train)), scale)
            for value in train:
                model.robust_update(float(value))
            lo, hi = model.surprise(float(train[-1]))["ci95"]
            for day, value in post:
                # Every post-flight observation uses the same frozen preflight interval.
                outputs.append({"subject": subject, "indicator": indicator,
                                "units_from_column": indicator.split("_value_",1)[1] if "_value_" in indicator else "dimensionless ratio",
                                "pre_n": len(pre), "post_visit_return_plus_days": day,
                                "pre_mean": float(np.mean(train)), "training_sd": scale,
                                "pre_constant": bool(np.std(train) == 0),
                                "value": value, "direction_from_pre_mean": "up" if value > float(np.mean(train)) else "down" if value < float(np.mean(train)) else "unchanged",
                                "ci95": [float(lo), float(hi)],
                                "outside_preflight_predictive_band": not lo <= value <= hi,
                                "missing_in_subject_indicator": missing})
    return {"label": "real-public", "synthetic": False, "status": "DONE-EXPLORATORY",
            "study": "OSD-575", "csv_sha256": sha(path), "subjects": len(grouped),
            "source_csv_rows": len(table), "indicator_columns": len(indicators),
            "eligible_subject_indicators": len({(r["subject"],r["indicator"]) for r in outputs}),
            "post_predictions": len(outputs),
            "outside_band_predictions": sum(r["outside_preflight_predictive_band"] for r in outputs),
            "constant_preflight_subject_indicators": len({(r["subject"],r["indicator"]) for r in outputs if r["pre_constant"]}),
            "exclusions": exclusions, "predictions": outputs,
            "literature_direction_concordance": "NOT DONE: no preregistered indicator-specific directional comparison; no concordance claim.",
            "interpretation": "Sparse pre-flight empirical-Bayes exploration, not calibrated sensitivity/coverage or clinical detection. Post-flight does not update baseline."}


def plot(result: dict) -> None:
    sys.path.insert(0, str(HERE / ".plotdeps"))
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    people = result["mmash"]["per_person"]
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.8), layout="constrained")
    for method, label, color in (("raw", "Raw HR", "#1e526b"), ("circadian_residual", "Training-only circadian residual", "#d37424")):
        axes[0].plot(range(1,len(people)+1), [p[method]["coverage"]*100 for p in people], "o-", label=label, color=color)
    axes[0].axhline(95,color="black",linestyle="--",linewidth=1,label="Nominal 95%")
    axes[0].set(xlabel="MMASH participant index (public de-identified IDs)", ylabel="Held-out predictive coverage (%)", title="PROXY: real healthy RR-derived minute HR", ylim=(0, 102))
    axes[0].legend(fontsize=8)
    os = result["osdr"]
    counts = Counter()
    totals = Counter()
    for r in os["predictions"]:
        counts[r["subject"]] += r["outside_preflight_predictive_band"]
        totals[r["subject"]] += 1
    keys = sorted(totals)
    axes[1].bar(keys,[counts[k] for k in keys],color="#1e526b")
    for i,k in enumerate(keys):
        axes[1].text(i,counts[k],f"{counts[k]}/{totals[k]}",ha="center",va="bottom")
    axes[1].set(xlabel="Public de-identified participant",ylabel="Post-flight values outside pre-flight band", title="REAL-PUBLIC OSD-575: exploratory only")
    axes[1].set_ylim(0,max(counts.values(),default=1)*1.25)
    fig.suptitle("Unchanged TETHER engine — descriptive results, no clinical validation",fontsize=12)
    fig.savefig(HERE / "credibility-results.png",dpi=160)
    plt.close(fig)
    result["environment"]["matplotlib"] = matplotlib.__version__


def main() -> None:
    before = sha(ROOT / "services/engine/tether_engine/bayes/nof1.py")
    result = {"started_official_access_utc": START_UTC, "analysis_started_at": stamp(),
              "analysis_round": "v2 (post-fix engine)",
              "preregistration": "PREREG-MMASH-v2.md (uncommitted working copy); v1 in 2fea48f",
              "preregistration_commit": "2fea48f",
              "repo_revision": subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip(),
              "environment": {"python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__},
              "engine_commit": subprocess.check_output(["git","log","-1","--format=%H","--","services/engine/tether_engine/bayes/nof1.py"],cwd=ROOT,text=True).strip(),
              "engine_source_sha256": before,
              "mmash": mmash(), "osdr": osdr()}
    plot(result)
    result["ended_at"] = stamp()
    result["engine_unchanged_during_run"] = before == sha(ROOT / "services/engine/tether_engine/bayes/nof1.py")
    (HERE / "credibility-results.json").write_text(json.dumps(result, indent=2, allow_nan=False),encoding="utf-8")
    print(json.dumps({"mmash": result["mmash"]["pooled"],
                      "context_helpful": result["mmash"]["context_helpful_by_preregistered_rule"],
                      "osdr": {k:v for k,v in result["osdr"].items() if k not in ("predictions","exclusions")},
                      "ended_at":result["ended_at"]},indent=2),flush=True)


if __name__ == "__main__":
    main()
