# Notebook-free walkthrough

1. Run the command in README against `example-synthetic.csv` with label synthetic.
2. Inspect the quality section in `report.html`. Dates have no offsets in this
   fixture, so they are explicitly assumed UTC. Count observed/missing values
   separately for each subject and indicator.
3. Follow one indicator in the long-form table. The first seven observed cells
   say `learning` and contain no inference. A missing cell says `missing`, has
   null value/scores, and does not advance that model's observation count.
4. Inspect a later reading: the baseline/band/z describe the model immediately
   before this reading was learned. The next observation may use a changed band.
   These are predictive intervals, not intervals for the mean.
5. Compare the two subjects. Their model histories are independent. No population
   training or cross-person borrowing is performed by this adapter.
6. Inspect syndrome rows. A partial or learning vector has null combined scores.
   A complete signed vector has a descriptive directional score, not a diagnosis.
7. Open `report.json` to save configuration, SHA-256 and exact engine identity.
   Repeat the same command and compare bytes. Deterministic inputs/settings and
   unchanged engine/environment produce deterministic reports.

The example is deliberately synthetic and unlabelled as to clinical outcomes.
It demonstrates file handling, missing data and outputs; it proves no detection
performance, disease association, calibration or astronaut relevance. Do not
tune clinical claims on this fixture.
