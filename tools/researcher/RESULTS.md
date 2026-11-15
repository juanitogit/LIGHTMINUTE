# Offline CLI verification

The editable install completed in the repository virtual environment using `python -m pip install --no-index --no-deps --no-build-isolation -e tools/researcher`. The installed `tether-baseline` entry point ran the README example on 32 synthetic rows from two synthetic subjects and generated readings CSV, syndromes CSV, JSON and standalone HTML.

`python tools/researcher/test_researcher.py` passed all seven contract tests. [Named tests and recorded output](test-output.txt) cover agreement with direct engine calls, bad input, missing data, constant series, warmup, subject isolation and escaped self-contained reports. These checks exercise the software contract; clinical thresholds and subject privacy depend on the input and use.
