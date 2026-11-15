# Exploratory adaptive conformal interval: preregistration

Question: can an online adaptive quantile interval recover approximate long-run
coverage on previously unseen synthetic streams after a change in variability?
This is research, not a clinical algorithm or a change to the decision engine.

Before running: evaluate 100 independent synthetic streams of 1,000 observations
using Python random seeds 30000–30099, zero-mean Gaussian noise with standard
deviation changing from 1 to 2 after observation 500. The first 100 observations
are a calibration warmup and excluded from reported coverage. At each remaining
step, predict with the past residuals only, record coverage/width, then update.
Compare a fixed-alpha rolling conformal interval to an adaptive-alpha interval,
both using the same 100-score rolling window, target error 0.05 and fixed
learning rate 0.01. Clip adaptive alpha to [0.001, 0.5] to keep finite
intervals; this modification means the original paper's long-run theorem is not
claimed here. Use finite-sample quantile rank and label insufficient warmup.

Report overall and pre/post-shift coverage, interval width, seeds, failures and
limitations; the descriptive target is 90–98% overall, not a safety guarantee.
No parameter selection using MMASH or the report streams. Opened 2026-11-14:
Gibbs and Candès, Adaptive Conformal Inference Under Distribution Shift,
https://proceedings.neurips.cc/paper_files/paper/2021/hash/0d441de75945e5acbc865406fc9a2559-Abstract.html.
