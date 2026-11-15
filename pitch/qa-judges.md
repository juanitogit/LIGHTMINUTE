# Q&A for judges (hard questions, honest answers)

Rule for every answer: no diagnosis, no invented number, no comparison by team name.
Compare *approaches* (fixed ranges, NEWS2-style scoring), never other teams.

**1. Is this a medical device?**
No. It is decision support for trained crew following mission protocols. It never diagnoses,
never outputs a dose, and says so on screen. Flight use would need clinical review and
regulatory classification.

**2. Is any of this real data?**
Crew data is synthetic — our own simulator. Two public sources are real: a NOAA GOES proton
snapshot (public domain, checksummed) used for space-weather context, and MMASH wearable data
(22 healthy adults) used as a proxy to test interval honesty. No astronaut health data.

**3. Why N-of-1 instead of population thresholds?**
With four crew members the population average is not meaningful. NASA HRP's own Artemis II
Data Methodology Challenge rewarded small-sample, individual-level Bayesian methods for exactly
this reason. We also show where it matters: in a heterogeneous crew, a population rule recalls
27% of strong changes while personal methods hold at 89–100%.

**4. But doesn't N-of-1 need weeks of data?**
It needs some. With 3/7/14 days of personal history our syndrome score recalls 79/84/93% of a
moderate change. Below 7 observations the UI shows `learning` and refuses to claim a personal
verdict — that is a designed state, not an edge case.

**5. Why not deep learning?**
n=4 per mission, no labelled outcomes, and an unexplainable alert is not usable in a capsule.
A conjugate model is O(1) per update, inspectable, and gives a real predictive interval.
Adding a bigger model would make the validation worse, not better.

**6. Isn't this just NEWS2-style scoring with extra steps?**
NEWS2 aggregates population bands. We keep those bands as one lens, and add a personal
baseline with its own uncertainty plus a directional multi-indicator score. The dissent between
the lenses is the product: on day 16 the Earth lens says normal and the personal lens says
unusual for him.

**7. Isn't your syndrome score cheating by assuming a direction?**
Partly, and we say so. The direction vector is a clinical prior (`demo-parameter` in the KB).
It buys power in that direction and is blind in others; CUSUM and the z-score remain
direction-agnostic. Every table states this.

**8. How do you know your 95% intervals mean anything?**
The evidence table in `project-description.md` separates synthetic coverage from the public
wearable-data proxy. The timestamp-aware repetition reused known data and is exploratory.

**9. What was the 21.6% about?**
That was a historical forgetting-factor defect. A later guard caused a separate calibration
regression; the timestamp-aware follow-up used the same examined data and is not independent.
See `ml/proxy/RESULTS.md` and `ml/proxy/CADENCE-CHECK.md`.

**10. So is your validation invalid?**
Its scope is limited: simulator results and exploratory wearable-data analyses cannot establish
clinical performance. Independent evaluation of the current approach remains necessary.

**11. What happens if the LLM is down, or the vehicle has no link?**
Nothing breaks. The engine sets every number and level, cards fall back to deterministic
templates, and `LLM_PROVIDER=none` makes zero network calls. The demo is designed to show the
product with the LLM unplugged.

**12. Why DeepSeek, and what if the vendor disappears?**
One million tokens of context plus disk caching let us put the whole cited knowledge base in a
byte-stable prefix instead of running a vector database. The client sits behind one interface;
provider swap is a config change, and the product does not depend on it.

**13. How do you stop the LLM from inventing things?**
A deterministic verifier: unknown citations rejected, every number must exist in the engine
facts, urgency may not be lowered, diagnostic phrasing rejected. On rejection we retry once
with the error list, then use the template. Each failure becomes a test.

**14. What fails today?**
Minute-level streaming used to be the weak spot (defect above, fixed and re-measured).
Whole-sensor failures still silently remove an indicator's evidence. Behavioural indicators, which we label low-confidence. And the verifier
can false-reject a legitimate card, which is the safe direction but hides the LLM's work.

**15. How do you handle the crew medical officer being the patient?**
The card's `do_now` steps are written to be executed by any crew member, not by a physician;
protocol steps avoid doses and point to the onboard medical protocol. That scenario is the
reason the product exists.

**16. What about privacy?**
Crew data is treated as crew-owned: consent tiers decide what leaves the device, and
behavioural free text is off by default. The audit log is a hash chain, so edits are detectable.
Nothing personal is in this repository.

**17. How does the delay change the decision?**
Routing is delay-aware: ISS ~0 s, Moon ~1.3 s, Mars 3–22 min one-way. If the expected reply is
too slow for the level, the policy is "act on board first" and the ground message is capped at
140 characters so it stands alone.

**18. Would this run on ISS hardware today?**
The engine is plain Python with numpy/scipy, the heavy parts are optional, and the whole demo
runs offline from a static JSON file. Real deployment would need packaging, an on-vehicle model
with open weights, and a security review — we are not claiming that is done.

**19. What is real in your demo?**
The data file is actual output of the engine, not hand-written numbers; the prototype renders
that file. The only illustrative elements are the timestamps and the mission profile.

**20. How many false alarms should a flight surgeon tolerate?**
We fix the budget first: about 0.1 false alarms per crew-week, then compare recall at that
budget. Reporting recall without the false-alarm rate would be meaningless.

**21. Where does radiation fit?**
As context and budget, not as an alarm trigger: the NOAA S-scale and a dose budget modulate
wording and priors. No dose limit is hard-coded, because we never verified NASA-STD-3001
ourselves.

**22. What about CO₂ and the closed environment?**
It is in the risk map and in the planned `co2_creep` scenario, where several crew members
drift together — the case that exercises crew-level attribution ("check the cabin first").

**23. Did you use AI to build this?**
Yes, and it is disclosed in the README: DeepSeek V4.1 Flash plus coding agents. The team
reviewed and owns the modelling, thresholds and every claim.

**24. What did you cut, and why?**
The 3D body, the app shell, the ground console and the protocol runner. We kept the things the
judging criteria actually depend on: engine, validation, honest model and data cards, a demo
that survives the network dying.

**25. How would you validate this properly?**
Prospective data from a real mission analogue with labelled events, pre-registered thresholds,
and a flight surgeon reviewing every card. Public n=4 proxies (OSDR) are the next best step —
we cite that dataset but did not download it during the event.

**26. What is the single thing you would fix next?**
The forgetting-factor defect — done, measured before and after. Next is a circadian term with a
context-aware baseline: our real-data run says it matters far less than the defect did, which is
exactly why we measured instead of assuming.

**27. Why should this win?**
Because the claim is checkable. Every number on screen comes from a script in the repository,
including the one that says our own model was wrong on real data.
