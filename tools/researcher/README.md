# Offline personal-baseline researcher tool

An offline CSV adapter for the existing LIGHTMINUTE/TETHER engine. It imports
`BaselineModel`, `CUSUM` and `SyndromeScore` from `tether_engine.bayes`; it does
not copy the statistical implementation, call an LLM or use the network.
Research use only. **Not a medical device; not clinically validated.**

## Install and five-minute tutorial

Use a checkout of this repository and its Python environment with numpy/scipy.
Editable installation is intentional: the tool reads the unchanged engine in
the same checkout rather than shipping an independent fork. Do not copy this
folder alone or build an isolated wheel and assume that the engine is included.

From `project/`, with the Python environment activated:

```text
python -m pip install --no-deps --no-build-isolation -e tools/researcher
tether-baseline tools/researcher/example-synthetic.csv --subject subject --time date --indicators rest_hr,sleep_h --signs rest_hr:+,sleep_h:- --label synthetic --out tools/researcher/example-report
```

Installation uses local setuptools and the already installed engine dependencies;
there is no install-time network requirement if those are present. To avoid
installation entirely, replace `tether-baseline` with
`python tools/researcher/tether_baseline.py`. All analysis and report generation
is offline. On PowerShell without activation use `.\.venv\Scripts\python.exe`.

Open `example-report/report.html` directly. It contains its CSS and tables: no
server, JavaScript, external fonts or remote assets. JSON holds settings, input
SHA-256, engine commit/file hashes and quality flags. `readings.csv` is long-form
(subject × time × indicator); `syndromes.csv` contains optional combined scores.
See [WALKTHROUGH.md](WALKTHROUGH.md) for interpretation without a notebook.

## Input contract

- UTF-8 CSV, one row per subject/time, with distinct subject/time/indicator columns.
- Use de-identified public or synthetic IDs. This tool is not a de-identification
  service. Review input IDs and reports before sharing. Do not supply private
  patient or astronaut data, keys or other secrets.
- Times must parse as ISO 8601 dates or datetimes. Offsets normalize to UTC;
  dates/naive datetimes are assumed UTC and counted in the quality report.
- Rows are sorted chronologically within each subject. Duplicate subject/time
  pairs, including equivalent UTC instants, are rejected.
- Indicators are numeric; an empty/whitespace cell means missing. NaN, infinity,
  malformed numbers, duplicate headers, wrong-width rows or required missing
  columns are rejected. No implicit zero-fill, forward-fill or other imputation.
- Units and sampling context must be consistent within each indicator. The tool
  cannot infer units, physiological impossibility or a suitable measurement cadence.
- `--label` is mandatory: `synthetic`, `real-public` or `proxy`. This is the
  researcher's provenance declaration, not automatic validation of provenance.
- Optional `--signs rest_hr:+,sleep_h:-` defines the expected change direction.
  Only selected indicators are permitted; duplicate signs are rejected.

## Statistical interpretation and assumptions

The first **seven nonmissing observations per subject/indicator** are training
only. Their sample mean and standard deviation initialize a weak-prior model;
those same seven observations are then replayed through robust updates. No
interval, z, p or CUSUM inference is emitted for those training rows. The first
held-out reading is compared to the model before it updates that model. Earlier
training outputs are never backfilled using future observations.

The 95% band is the engine's **Student-t predictive interval for a future
observation**, not a posterior credible interval for the mean. z and two-sided
p are descriptive surprise under this model. They are not diagnosis probabilities,
calibrated event likelihoods, multiple-testing-adjusted discoveries or evidence
of clinical sensitivity. CUSUM uses the engine defaults (k=0.5, h=4); those are
research parameters, not validated operational alert criteria.

Optional directional syndrome scores use the unchanged engine's shrunk covariance
and signed vector. A row scores only when all selected signed indicators have
current held-out scores. Missing/learning indicators do not become zero evidence
and the incomplete row does not update the syndrome covariance. Directions encode
an assumed pattern and are blind to other directions. There is no outcome-based
validation or diagnostic mapping in this adapter.

Models are isolated by subject and indicator. Missing values do not update a
model. Insufficient series and constant training series are flagged. A constant
training series uses a standard-deviation floor of 1e-6; subsequent tiny changes
can therefore look extreme. Numeric failures are explicit nulls rather than NaN
JSON. A few observations, serial dependence, circadian/activity mixing, irregular
cadence, biased training periods and missing-not-at-random data can undermine
interpretation. Seven observations is a software warmup rule, not evidence of
adequate baseline length. Memory/report size grows with the input; this is not
a streaming or production clinical system.

The HTML escapes user strings. CSV is raw research data; opening arbitrary IDs
in spreadsheet software can invoke spreadsheet formula interpretation. Prefer
JSON/HTML for untrusted text or import CSV columns explicitly as text.

## Verification and evidence

Preregistration was written before implementation in [PREREG.md](PREREG.md).
Run the adapter contracts without a network or provider key:

```text
python tools/researcher/test_researcher.py
```

Results, commands, failures and environment are recorded in [RESULTS.md](RESULTS.md).
The contract suite is adapter verification, not scientific validation. Related
work is [public proxy analysis](../../ml/proxy/RESULTS.md) and
[simulated autonomy analysis](../../docs/autonomy/RESULTS.md); consult their own
status and caveats rather than assuming completion or transfer to astronauts.

Suggested citation: “LIGHTMINUTE/TETHER contributors, offline researcher CSV
adapter, repository commit and engine file SHA-256 recorded in report.json,
research prototype.” Attach the input's source, license, retrieval date and hash
when using public data. The synthetic example has no external dataset provenance.
