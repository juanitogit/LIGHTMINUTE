"""Adapter contract tests, preregistered in PREREG.md; no network or LLM."""
from __future__ import annotations

import csv
import importlib.util
import json
import math
from pathlib import Path
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "services" / "engine"))
from tether_engine.bayes import BaselineModel, CUSUM, SyndromeScore
from tether_baseline import analyze, load_csv, write_report, parse_signs


class AdapterContract(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def fixture(self, rows, headers=("person", "time", "hr", "sleep")):
        path = self.root / "input.csv"
        with path.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream)
            writer.writerow(headers)
            writer.writerows(rows)
        return path

    def series(self, subject="A", count=16, offset=0):
        return [[subject, f"2026-01-{day:02d}", 60 + offset + day % 3,
                 8 + (day % 2) * .2] for day in range(1, count + 1)]

    def run_adapter(self, rows, signs=None):
        path = self.fixture(rows)
        return analyze(path, subject="person", time="time", indicators=["hr", "sleep"],
                       signs=signs, label="synthetic")

    def test_golden_predictions_match_direct_engine_calls(self):
        rows = self.series()
        result = self.run_adapter(rows, {"hr": 1, "sleep": -1})
        models = {}
        cusums = {}
        import statistics
        for index, indicator in [(2, "hr"), (3, "sleep")]:
            training = [float(row[index]) for row in rows[:7]]
            model = BaselineModel(statistics.mean(training), max(statistics.stdev(training), 1e-6))
            for value in training:
                model.robust_update(value)
            models[indicator] = model
            cusums[indicator] = CUSUM()
        syndrome = SyndromeScore([1, -1])
        for row_index in range(7, len(rows)):
            current = []
            for index, indicator in [(2, "hr"), (3, "sleep")]:
                value = float(rows[row_index][index])
                expected = models[indicator].surprise(value)
                actual = next(r for r in result["readings"]
                              if r["time"] == f"2026-01-{row_index + 1:02d}T00:00:00+00:00"
                              and r["indicator"] == indicator)
                self.assertAlmostEqual(actual["z"], float(expected["z"]), places=12)
                self.assertAlmostEqual(actual["p_two_sided"], float(expected["p_two_sided"]), places=12)
                self.assertAlmostEqual(actual["ci95_low"], float(expected["ci95"][0]), places=12)
                self.assertEqual(actual["n_seen"], expected["n_seen"])
                self.assertEqual(actual["cusum_alarm"], cusums[indicator].step(expected["z"])["alarm"])
                current.append(expected["z"])
                models[indicator].robust_update(value)
            expected_sy = syndrome.score(current)
            self.assertAlmostEqual(result["syndromes"][row_index]["z_dir"], float(expected_sy["z_dir"]), places=12)
            syndrome.observe(current)

    def test_bad_columns_timestamps_duplicates_and_numbers(self):
        cases = [
            ([['A','not-time',60,8]], None),
            ([['A','2026-01-01',60,8],['A','2026-01-01T00:00:00Z',61,7]], None),
            ([['A','2026-01-01','NaN',8]], None),
            ([['A','2026-01-01','inf',8]], None),
            ([['A','2026-01-01','bad',8]], None),
            ([['','2026-01-01',60,8]], None),
            ([['A','2026-01-01',60]], None),
            ([['A','2026-01-01',60,8]], ('person','time','hr','hr')),
        ]
        for rows, headers in cases:
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                path = self.fixture(rows, headers or ('person','time','hr','sleep'))
                analyze(path, subject='person', time='time', indicators=['hr','sleep'], label='synthetic')
        with self.assertRaises(ValueError):
            analyze(self.fixture(self.series()), subject='missing', time='time', indicators=['hr'], label='proxy')

    def test_forty_percent_missing_does_not_update_models(self):
        rows = self.series(count=20)
        for i, row in enumerate(rows):
            if i % 5 in (0, 1):
                row[2] = ''
        result = self.run_adapter(rows, {'hr': 1, 'sleep': -1})
        hr = [r for r in result['readings'] if r['indicator'] == 'hr']
        self.assertEqual(sum(r['status'] == 'missing' for r in hr), 8)
        self.assertEqual(result['quality']['missing_values'], 8)
        seen = 0
        for record in hr:
            if record['status'] == 'missing':
                self.assertIsNone(record['z'])
            elif seen < 7:
                self.assertEqual(record['status'], 'learning')
                self.assertIsNone(record['z'])
                seen += 1
            else:
                self.assertEqual(record['n_seen'], seen)
                seen += 1
        self.assertTrue(all(r['z_dir'] is None for r in result['syndromes']
                            if r['time'] in {r['time'] for r in hr if r['status'] != 'scored'}))

    def test_constant_single_subject_and_finite_json(self):
        rows = self.series()
        for row in rows:
            row[2:] = [60, 8]
        result = self.run_adapter(rows, {'hr': 1})
        json.dumps(result, allow_nan=False)
        self.assertTrue(any(r['status'] == 'constant_training' for r in result['quality']['indicator_summary']))
        # Floating-point weighted updates can leave round-off at the variance floor.
        self.assertTrue(all(abs(r['z']) < 1e-6 for r in result['readings'] if r['status'] == 'scored'))

    def test_sort_subject_isolation_and_no_future_training(self):
        first = self.run_adapter(self.series())
        shuffled = self.run_adapter(list(reversed(self.series('B', offset=100))) + list(reversed(self.series())))
        self.assertEqual(first['readings'], [r for r in shuffled['readings'] if r['subject'] == 'A'])
        changed = self.series()
        changed[-1][2] = 500
        later = self.run_adapter(changed)
        self.assertEqual(first['readings'][:-2], later['readings'][:-2])
        self.assertTrue(all(r['z'] is None for r in first['readings'][:14]))

    def test_insufficient_observations_and_labels(self):
        result = self.run_adapter(self.series(count=3))
        self.assertEqual(result['quality']['insufficient_series'], 2)
        self.assertTrue(all(r['status'] == 'learning' for r in result['readings']))
        with self.assertRaises(ValueError):
            analyze(self.fixture(self.series()), subject='person', time='time', indicators=['hr'], label='unknown')
        self.assertEqual(parse_signs('hr:+,sleep:-', ['hr','sleep']), {'hr':1,'sleep':-1})
        for bad in ['hr:0','hr:+,hr:-','unknown:+']:
            with self.assertRaises(ValueError):
                parse_signs(bad, ['hr','sleep'])

    def test_reports_escape_html_and_are_deterministic(self):
        result = self.run_adapter(self.series('<script>alert(1)</script>'))
        out = self.root/'report'
        write_report(result, out)
        before = {p.name: p.read_bytes() for p in out.iterdir()}
        html = (out/'report.html').read_text(encoding='utf-8')
        self.assertNotIn('<script>alert(1)</script>', html)
        self.assertIn('&lt;script&gt;', html)
        self.assertNotIn('<script src=', html)
        self.assertNotIn('<link', html)
        self.assertIn('SYNTHETIC', html)
        write_report(result, out)
        self.assertEqual(before, {p.name:p.read_bytes() for p in out.iterdir()})
        json.loads((out/'report.json').read_text(encoding='utf-8'))
        with (out/'readings.csv').open(newline='',encoding='utf-8') as fh:
            self.assertEqual(len(list(csv.DictReader(fh))), len(result['readings']))


if __name__ == '__main__':
    unittest.main(verbosity=2)
