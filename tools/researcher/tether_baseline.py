"""Offline CSV adapter for the repository's unchanged public Bayesian engine."""
from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import hashlib
import html
import json
import math
from pathlib import Path
import statistics
import subprocess
import sys

# Support a checkout without copying/forking the engine or requiring an install.
REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "services" / "engine"))
from tether_engine.bayes import BaselineModel, CUSUM, SyndromeScore

TRAINING = 7
LABELS = ("synthetic", "real-public", "proxy")
READING_FIELDS = ["subject", "time", "indicator", "value", "status", "n_seen",
                  "baseline", "ci95_low", "ci95_high", "df", "z", "p_two_sided",
                  "change_pending", "pending_z", "pending_p_two_sided", "unresolved_change",
                  "cusum_hi", "cusum_lo", "cusum_alarm"]
SYNDROME_FIELDS = ["subject", "time", "status", "z_dir", "p_one_sided"]


def parse_signs(raw: str | None, indicators: list[str]) -> dict[str, int]:
    signs = {}
    if not raw:
        return signs
    for item in raw.split(","):
        parts = item.split(":")
        if len(parts) != 2 or parts[0] not in indicators or parts[1] not in ("+", "-"):
            raise ValueError("signs must use selected indicators, for example hr:+,sleep:-")
        if parts[0] in signs:
            raise ValueError("duplicate sign indicator")
        signs[parts[0]] = 1 if parts[1] == "+" else -1
    return signs


def _time(raw: str, row: int) -> tuple[datetime, bool]:
    try:
        parsed = datetime.fromisoformat(raw.strip().replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"row {row}: time must be ISO 8601") from exc
    assumed = parsed.tzinfo is None
    if assumed:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc), assumed


def load_csv(path: Path, subject: str, time: str, indicators: list[str]) -> tuple[list[dict], dict]:
    columns = [subject, time, *indicators]
    if not indicators or any(not name for name in columns) or len(set(columns)) != len(columns):
        raise ValueError("subject, time and indicator columns must be distinct and nonempty")
    rows = []
    seen = set()
    assumed = missing = 0
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        headers = reader.fieldnames or []
        if len(set(headers)) != len(headers):
            raise ValueError("CSV contains duplicate column names")
        if not set(columns).issubset(headers):
            raise ValueError(f"missing columns: {sorted(set(columns) - set(headers))}")
        for line, record in enumerate(reader, 2):
            if None in record or any(value is None for value in record.values()):
                raise ValueError(f"row {line}: wrong number of CSV fields")
            sid = record[subject].strip()
            if not sid:
                raise ValueError(f"row {line}: empty subject")
            moment, is_assumed = _time(record[time], line)
            assumed += int(is_assumed)
            key = (sid, moment)
            if key in seen:
                raise ValueError(f"row {line}: duplicate subject/timestamp")
            seen.add(key)
            values = {}
            for name in indicators:
                raw = record[name].strip()
                if raw == "":
                    values[name] = None
                    missing += 1
                    continue
                try:
                    value = float(raw)
                except ValueError as exc:
                    raise ValueError(f"row {line}: {name} is not a number") from exc
                if not math.isfinite(value):
                    raise ValueError(f"row {line}: {name} is not finite")
                values[name] = value
            rows.append({"subject": sid, "time": moment.isoformat(), "values": values})
    if not rows:
        raise ValueError("CSV has no observations")
    original = [(r["subject"], r["time"]) for r in rows]
    rows.sort(key=lambda row: (row["subject"], row["time"]))
    return rows, {"input_rows": len(rows), "missing_values": missing,
                  "timezone_assumed_utc_rows": assumed,
                  "input_reordered": original != [(r["subject"], r["time"]) for r in rows]}


def _finite(value):
    value = float(value)
    return value if math.isfinite(value) else None


def analyze(path: Path, *, subject: str, time: str, indicators: list[str],
            label: str, signs: dict[str, int] | None = None, timestamped_guard: bool = False) -> dict:
    """Score each held-out row before learning it. Training rows have no inference."""
    if label not in LABELS:
        raise ValueError("explicit label must be synthetic, real-public or proxy")
    signs = signs or {}
    if any(name not in indicators or sign not in (-1, 1) for name, sign in signs.items()):
        raise ValueError("invalid syndrome signs")
    rows, quality = load_csv(Path(path), subject, time, indicators)
    states = {}
    summaries = {}
    syndrome_states = {}
    readings, syndromes = [], []
    score_names = [name for name in indicators if name in signs]
    invalid_scores = 0
    for row in rows:
        sid = row["subject"]
        current_z = {}
        for name in indicators:
            key = (sid, name)
            state = states.setdefault(key, {"training": [], "training_times": [], "model": None, "cusum": CUSUM()})
            summary = summaries.setdefault(key, {"subject": sid, "indicator": name,
                                                 "observed": 0, "missing": 0,
                                                 "scored": 0, "status": "insufficient_observations"})
            value = row["values"][name]
            record = dict.fromkeys(READING_FIELDS)
            record.update(subject=sid, time=row["time"], indicator=name, value=value,
                          status="missing", n_seen=(state["model"].n_seen if state["model"] else len(state["training"])))
            if value is None:
                summary["missing"] += 1
            elif state["model"] is None:
                summary["observed"] += 1
                record["status"] = "learning"
                state["training"].append(value)
                state["training_times"].append(datetime.fromisoformat(row["time"].replace("Z", "+00:00")).timestamp())
                if len(state["training"]) == TRAINING:
                    # These values initialize only the next prediction, never any
                    # earlier training output. Each subject/indicator is isolated.
                    prior_sd = statistics.stdev(state["training"])
                    summary["status"] = "constant_training" if prior_sd == 0 else "ready"
                    model = BaselineModel(statistics.mean(state["training"]), max(prior_sd, 1e-6))
                    for training_value, training_time in zip(state["training"], state["training_times"]):
                        model.robust_update(training_value, **({"observed_at": training_time} if timestamped_guard else {}))
                    state["model"] = model
            else:
                summary["observed"] += 1
                model = state["model"]
                result = model.surprise(value)
                record.update(status="scored", n_seen=result["n_seen"],
                              change_pending=result["change_pending"], pending_z=result["pending_z"],
                              pending_p_two_sided=result["pending_p_two_sided"], unresolved_change=result["unresolved_change"],
                              baseline=_finite(result["baseline"]), df=_finite(result["df"]),
                              ci95_low=_finite(result["ci95"][0]), ci95_high=_finite(result["ci95"][1]),
                              z=_finite(result["z"]), p_two_sided=_finite(result["p_two_sided"]))
                if any(record[field] is None for field in ("baseline", "df", "ci95_low", "ci95_high", "z", "p_two_sided")):
                    record["status"] = "nonfinite_score"
                    invalid_scores += 1
                else:
                    alarm = state["cusum"].step(record["z"])
                    record.update(cusum_hi=_finite(alarm["hi"]), cusum_lo=_finite(alarm["lo"]),
                                  cusum_alarm=alarm["alarm"])
                    current_z[name] = record["z"]
                    summary["scored"] += 1
                moment = datetime.fromisoformat(row["time"].replace("Z", "+00:00")).timestamp()
                model.robust_update(value, **({"observed_at": moment} if timestamped_guard else {}))
            readings.append(record)
        if score_names:
            sy = {"subject": sid, "time": row["time"], "status": "insufficient_current_data",
                  "z_dir": None, "p_one_sided": None}
            if all(name in current_z for name in score_names):
                scorer = syndrome_states.setdefault(sid, SyndromeScore([signs[name] for name in score_names]))
                vector = [current_z[name] for name in score_names]
                score = scorer.score(vector)
                sy.update(status="scored", z_dir=_finite(score["z_dir"]),
                          p_one_sided=_finite(score["p_one_sided"]))
                if sy["z_dir"] is None or sy["p_one_sided"] is None:
                    sy["status"] = "nonfinite_score"
                    invalid_scores += 1
                else:
                    scorer.observe(vector)
            syndromes.append(sy)
    quality.update(subjects=len({row["subject"] for row in rows}),
                   indicator_summary=list(summaries.values()),
                   insufficient_series=sum(s["observed"] <= TRAINING for s in summaries.values()),
                   nonfinite_scores=invalid_scores)
    try:
        commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO,
                                         stderr=subprocess.DEVNULL, text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        commit = "unverified"
    report = {
        "tool": "tether-baseline", "label": label, "synthetic": label == "synthetic",
        "note": "Research use only. Not a medical device. No clinical validation.",
        "input_sha256": hashlib.sha256(Path(path).read_bytes()).hexdigest(),
        "engine_commit": commit,
        "engine_files_sha256": {name: hashlib.sha256((REPO / "services/engine/tether_engine/bayes" / name).read_bytes()).hexdigest()
                                for name in ("nof1.py", "syndrome.py")},
        "settings": {"subject_column": subject, "time_column": time, "indicators": indicators,
                     "signs": signs, "training_observations": TRAINING,
                     "timestamped_guard": timestamped_guard,
                     "nominal_predictive_coverage": 0.95, "cusum_k": 0.5, "cusum_h": 4.0},
        "quality": quality, "readings": readings, "syndromes": syndromes,
    }
    # Reject rather than serialize NaN/Infinity anywhere in an output artifact.
    json.dumps(report, allow_nan=False)
    return report


def _table(rows: list[dict], fields: list[str], caption: str) -> str:
    escape = lambda value: html.escape("" if value is None else str(value), quote=True)
    return ('<table><caption>' + escape(caption) + '</caption><thead><tr>' +
            ''.join('<th scope="col">' + escape(f) + '</th>' for f in fields) +
            '</tr></thead><tbody>' + ''.join('<tr>' + ''.join('<td>' + escape(row.get(f)) + '</td>'
                                                          for f in fields) + '</tr>' for row in rows) +
            '</tbody></table>')


def write_report(report: dict, out: Path) -> None:
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    (out / "report.json").write_text(payload, encoding="utf-8")
    for name, rows, fields in [("readings.csv", report["readings"], READING_FIELDS),
                               ("syndromes.csv", report["syndromes"], SYNDROME_FIELDS)]:
        with (out / name).open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
    escaped_quality = html.escape(json.dumps(report["quality"], ensure_ascii=False, indent=2))
    page = '''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Personal baseline research report</title><style>
body{font:1rem/1.5 system-ui,sans-serif;color:#182330;background:#fff;margin:2rem}
table{border-collapse:collapse;width:100%;margin:1rem 0}th,td{border:1px solid #8994a0;padding:.4rem;text-align:left}
caption{text-align:left;font-weight:bold}thead{background:#e8edf2}.scroll{overflow:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}
a{color:#174c8a}:focus{outline:3px solid #e58100}</style><main>
<h1>Personal baseline research report</h1><p><strong>''' + html.escape(report["label"].upper()) + '''</strong>
— research use only; not a medical device. No clinical validation.</p>
<p>Intervals are Student-t predictive intervals for the next observation, not
credible intervals for the population or personal mean. Training observations
have no inferential score. Missing observations are not imputed or learned.</p>
<p>CUSUM alarms and directional syndrome scores are research signals, not
diagnoses or validated decision thresholds. Signs are supplied assumptions.
A constant training series uses a numerical variance floor: tiny subsequent
changes may produce large scores. Numeric results may be null when insufficient
or nonfinite. Naive times are interpreted as UTC and flagged below.</p>
<h2>Quality report</h2><pre>''' + escaped_quality + '''</pre>
<h2>Indicator observations</h2><div class="scroll" tabindex="0">''' + _table(report["readings"], READING_FIELDS, "Predict before update; blank scores mean unavailable") + '''</div>
<h2>Optional directional syndrome</h2><div class="scroll" tabindex="0">''' + _table(report["syndromes"], SYNDROME_FIELDS, "Only complete current signed vectors are scored") + '''</div>
<h2>Reproducibility</h2><p>Input SHA-256: ''' + report["input_sha256"] + '''</p>
<p>Engine commit: ''' + html.escape(report["engine_commit"]) + '''.</p>
<p>Exact engine file hashes and settings are in report.json. Outputs contain de-identified subject IDs as supplied; review them before sharing.</p></main></html>'''
    (out / "report.html").write_text(page, encoding="utf-8")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("data", type=Path)
    parser.add_argument("--subject", required=True)
    parser.add_argument("--time", required=True)
    parser.add_argument("--indicators", required=True, help="comma-separated numeric columns")
    parser.add_argument("--signs", help="optional directions, e.g. hr:+,sleep:-")
    parser.add_argument("--label", choices=LABELS, required=True)
    parser.add_argument("--timestamped-guard", action="store_true", help="use experimental elapsed-time guard; review pending change fields")
    parser.add_argument("--out", type=Path, default=Path("report"))
    args = parser.parse_args(argv)
    try:
        indicators = [name.strip() for name in args.indicators.split(",")]
        result = analyze(args.data, subject=args.subject, time=args.time, indicators=indicators,
                         signs=parse_signs(args.signs, indicators), label=args.label, timestamped_guard=args.timestamped_guard)
        write_report(result, args.out)
    except (OSError, ValueError, csv.Error) as exc:
        parser.exit(2, f"error: {exc}\n")
    print(f"Report written to {args.out}: {result['quality']['input_rows']} rows; "
          f"{result['quality']['subjects']} subjects; label={args.label}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
