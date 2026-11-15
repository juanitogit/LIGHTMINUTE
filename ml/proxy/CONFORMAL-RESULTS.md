# Adaptive conformal interval: synthetic experiment

This experiment is synthetic, preregistered in `PREREG-conformal.md` at commit
`684767c`, and separate from the mission engine. Reproduce with
`python ml/proxy/run_conformal.py`; machine-readable counts are in
`conformal-results.json`. Test: `python ml/proxy/test_adaptive_conformal.py`.

Across 100 synthetic streams, after the warmup there were 90,000 scored points.
The fixed-alpha interval covered 84,806/90,000 (94.23%), with mean width 6.04;
the adaptive interval covered 85,526/90,000 (95.03%), with mean width 6.40.
After the simulated increase in variance, fixed coverage was 93.52% and adaptive
coverage 94.93%; adaptive intervals were wider on average (8.26 versus 7.66).
These widths are in the arbitrary units of the synthetic series.

The finite-window implementation clips alpha and caps the order statistic. These
are deviations from the original theorem, so no formal coverage guarantee is
claimed. Values use a known zero prediction in a simulation, not the medical
engine, real crew data or an independent MMASH validation. This is not a medical
device and has not been integrated into operational urgency or alert decisions.

Source opened 2026-11-14: Gibbs and Candès, [Adaptive Conformal Inference Under
Distribution Shift](https://proceedings.neurips.cc/paper_files/paper/2021/hash/0d441de75945e5acbc865406fc9a2559-Abstract.html).
