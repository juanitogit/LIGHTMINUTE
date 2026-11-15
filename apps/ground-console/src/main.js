/* Generated from apps/ground-console/src/main.ts; edit the TypeScript source. */
(function () {
(function () {
    "use strict";
    const { appendEntry, verifyChain, renderChainRows } = globalThis.LightminuteAudit;
    const SCENARIO_LABELS = {
        cmo_fever: "CMO fever-like pattern",
        sep_sleep_loss: "Sleep loss over a week",
        co2_creep: "Cabin CO₂ creep",
    };
    // Demo policy constants, mirroring services/engine/tether_engine/ground/delay.py.
    const PROFILES = {
        iss: { label: "ISS", min: 0, max: 0 },
        moon: { label: "Moon", min: 1.3, max: 1.3 },
        mars: { label: "Mars", min: 180, max: 1320 },
    };
    const ACK_S = 600; // ground acknowledgement budget, demo policy
    const ONBOARD_FIRST_RTT_S = 900; // demo policy from delay.py
    const SCALE_S = 1320; // timeline scale: Mars worst case
    const LEVELS = {
        info: { glyph: "○", label: "info" },
        watch: { glyph: "△", label: "watch" },
        act: { glyph: "▲", label: "act" },
        escalate: { glyph: "■", label: "escalate" },
    };
    const INDICATORS = [
        ["rest_hr", "HR"],
        ["temp_c", "Temp"],
        ["sleep_h", "Sleep"],
        ["pvt_ms", "PVT"],
    ];
    function $(id) {
        const element = document.getElementById(id);
        if (!element)
            throw new Error(`Missing ground console element: ${id}`);
        return element;
    }
    const state = { doc: null, source: "", name: "cmo_fever", dayIndex: 0, profile: "mars", audit: [], view: [] };
    function esc(value) {
        const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
        return String(value ?? "").replace(/[&<>"']/g, (c) => entities[c]);
    }
    function num(value, digits = 1) {
        return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "—";
    }
    function fmtSeconds(seconds) {
        if (seconds == null)
            return "—";
        if (seconds < 60)
            return `${Number(seconds).toFixed(seconds < 10 ? 1 : 0)} s`;
        return `${(seconds / 60).toFixed(1)} min`;
    }
    function fmtReply(seconds) {
        if (seconds == null)
            return "—";
        return seconds < 60 ? `${Math.round(seconds)} s` : `${(seconds / 60).toFixed(0)} min`;
    }
    /* ------------------------------------------------------------------ loading */
    async function loadScenario(name) {
        const candidates = [
            `data/scenario-${name}.json`,
            `../../apps/crew-tablet/public/data/scenario-${name}.json`,
            `../../apps/crew-tablet/public/demo-data.json`,
            "data/sample-scenario.json",
        ];
        for (const url of candidates) {
            try {
                const res = await fetch(url, { cache: "no-store" });
                if (!res.ok)
                    continue;
                const doc = await res.json();
                if (doc && Array.isArray(doc.days) && doc.days.length) {
                    return { doc, source: url.startsWith("../../apps") ? `${url} (engine export)` : url };
                }
            }
            catch {
                /* file:// or missing file: try the next candidate */
            }
        }
        const fixture = globalThis.__LIGHTMINUTE_SAMPLE__;
        if (fixture && Array.isArray(fixture.days) && fixture.days.length) {
            return { doc: fixture, source: "data/sample-scenario.js (file:// fixture)" };
        }
        throw new Error("No scenario data. Serve the repo over http, or use “Load JSON”.");
    }
    /* -------------------------------------------------------------- sparklines */
    function sparkline(_entry, crewId, key, uptoIndex) {
        const days = state.doc.days;
        const points = [];
        let lo = Infinity;
        let hi = -Infinity;
        for (let i = 0; i <= uptoIndex; i += 1) {
            const spec = days[i]?.crew?.[crewId]?.indicators?.[key];
            if (!spec || typeof spec.value !== "number")
                continue;
            points.push({ i, value: spec.value });
            lo = Math.min(lo, spec.value, ...(spec.ci95 || []));
            hi = Math.max(hi, spec.value, ...(spec.ci95 || []));
        }
        if (!points.length || !Number.isFinite(lo) || !Number.isFinite(hi)) {
            return `<span class="spark spark--empty" aria-hidden="true">no data</span>`;
        }
        const pad = (hi - lo) * 0.08 || 1;
        lo -= pad;
        hi += pad;
        const width = 132;
        const height = 44;
        const x = (i) => (uptoIndex === 0 ? width / 2 : (i / uptoIndex) * (width - 6) + 3);
        const y = (v) => height - ((v - lo) / (hi - lo)) * (height - 6) - 3;
        const today = days[uptoIndex]?.crew?.[crewId]?.indicators?.[key];
        const band = today?.ci95
            ? `<rect class="spark__band" x="0" y="${y(Math.max(...today.ci95))}" width="${width}" height="${Math.max(2, y(Math.min(...today.ci95)) - y(Math.max(...today.ci95)))}" />`
            : "";
        const path = points.map((p) => `${x(p.i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
        const dot = today && typeof today.value === "number"
            ? `<circle class="spark__dot" cx="${x(uptoIndex).toFixed(1)}" cy="${y(today.value).toFixed(1)}" r="3" />`
            : "";
        const label = `${key} trend, ${points.length} days, today ${num(today?.value)}`;
        return `<svg class="spark" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">${band}<polyline class="spark__line" points="${path}" />${dot}</svg>`;
    }
    function crewCard(crewId, entry, _dayEntry, uptoIndex) {
        const level = LEVELS[entry.level] || LEVELS.info;
        const indicators = entry.indicators || {};
        const rows = INDICATORS.filter(([key]) => indicators[key])
            .map(([key, label]) => {
            const spec = indicators[key];
            return `<div class="metric">
        <span class="metric__label">${label}</span>
        ${sparkline(entry, crewId, key, uptoIndex)}
        <span class="metric__value">${num(spec.value)}<small>${esc(spec.unit || "")}</small></span>
      </div>`;
        })
            .join("");
        const learning = entry.learning ? `<span class="tag tag--muted">learning baseline</span>` : "";
        const pattern = indicators.rest_hr?.lens?.pattern
            ? `<span class="tag tag--muted">${esc(indicators.rest_hr.lens.pattern.replaceAll("_", " "))}</span>`
            : "";
        return `<article class="crew-card crew-card--${esc(entry.level)}">
    <header class="crew-card__head">
      <span class="crew-card__id">Crew ${esc(crewId)}</span>
      <span class="level level--${esc(entry.level)}"><span aria-hidden="true">${level.glyph}</span> ${level.label}</span>
    </header>
    <p class="crew-card__card">${esc(entry.card?.headline || "—")}</p>
    <div class="crew-card__metrics">${rows}</div>
    <footer class="crew-card__tags">
      <span class="tag tag--muted">syndrome z ${num(entry.syndrome_z, 2)}</span>
      ${learning}${pattern}
      <span class="tag tag--muted">card: ${esc(entry.card_source || "template")}</span>
    </footer>
  </article>`;
    }
    /* ------------------------------------------------------------------- queue */
    function queueItems(dayEntry) {
        return Object.entries(dayEntry.crew || {})
            .filter(([, entry]) => entry.routing && entry.routing.send_now)
            .map(([crewId, entry]) => ({ crewId, entry }))
            .sort((a, b) => (a.entry.routing.priority - b.entry.routing.priority) || a.crewId.localeCompare(b.crewId));
    }
    function consent() {
        return {
            vitals: $("consent-vitals").checked,
            symptoms: $("consent-symptoms").checked,
            behavioral: $("consent-behavioral").checked,
        };
    }
    function transmitPreview(crewId, entry, tiers) {
        const hr = entry.indicators?.rest_hr;
        const vitals = tiers.vitals && hr
            ? `HR ${num(hr.value)} (band ${num(hr.ci95?.[0])}–${num(hr.ci95?.[1])})`
            : null;
        const symptoms = tiers.symptoms ? entry.card?.what_changed : null;
        const parts = [];
        parts.push(`<li><strong>Vitals</strong> ${vitals ? esc(vitals) : '<span class="withheld">withheld</span>'}</li>`);
        parts.push(`<li><strong>Symptoms</strong> ${symptoms ? esc(symptoms) : '<span class="withheld">withheld</span>'}</li>`);
        parts.push(`<li><strong>Behavioural text</strong> <span class="withheld">${tiers.behavioral ? "allowed — none in this scenario" : "not sent (off by default)"}</span></li>`);
        return `<ul class="transmit" aria-label="What ground receives for crew ${esc(crewId)}">${parts.join("")}</ul>`;
    }
    function queueCard(crewId, entry, tiers) {
        const routing = entry.routing || {};
        const message = entry.card?.ground_message || "";
        const budget = routing.message_budget_chars || 0;
        const over = budget && message.length > budget;
        return `<article class="queue-item priority-${esc(routing.priority)}">
    <header class="queue-item__head">
      <span class="crew-card__id">Crew ${esc(crewId)}</span>
      <span class="level level--${esc(entry.level)}">${(LEVELS[entry.level] || LEVELS.info).glyph} ${esc(entry.level)}</span>
      <span class="tag tag--muted">priority ${esc(routing.priority)}</span>
      ${routing.act_onboard_first ? '<span class="tag tag--warn">act on board first</span>' : ""}
    </header>
    <p class="queue-item__msg">“${esc(message)}”</p>
    <p class="queue-item__meta">
      ${message.length}/${budget} chars ${over ? '<span class="tag tag--warn">over budget</span>' : ""}
      · reply expected in ${fmtReply(routing.expected_reply_s)}
      · ${esc(routing.note || "")}
    </p>
    ${transmitPreview(crewId, entry, tiers)}
  </article>`;
    }
    /* ------------------------------------------------------------------- delay */
    function renderDelay() {
        const profile = PROFILES[state.profile] ?? PROFILES.mars;
        const spanLeft = (profile.min / SCALE_S) * 100;
        const spanRight = (profile.max / SCALE_S) * 100;
        $("delay-span").style.left = `${spanLeft}%`;
        $("delay-span").style.width = `${Math.max(0.6, spanRight - spanLeft)}%`;
        const msg = $("delay-msg");
        msg.style.transition = "left 900ms ease";
        msg.style.left = `${Math.max(0, spanLeft)}%`;
        const rtt = 2 * profile.min + ACK_S;
        $("delay-note").textContent = `${profile.label}: one-way ${fmtSeconds(profile.min)}–${fmtSeconds(profile.max)} · round trip with ${fmtSeconds(ACK_S)} ground ack ≈ ${fmtSeconds(2 * profile.min)}–${fmtSeconds(2 * profile.max)}`;
        $("delay-caption").textContent =
            rtt > ONBOARD_FIRST_RTT_S
                ? `Reply cannot arrive in time (demo policy: onboard first above ${fmtSeconds(ONBOARD_FIRST_RTT_S)}). Start the protocol, then send.`
                : "Ground can answer in time: send and follow guidance.";
    }
    /* ------------------------------------------------------------------- audit */
    function auditTimestamp(day, index) {
        return 1_700_000_000 + day * 86_400 + index * 60; // synthetic, deterministic
    }
    async function rebuildAudit(dayEntry) {
        state.audit = [];
        state.view = [];
        const items = queueItems(dayEntry);
        for (let i = 0; i < items.length; i += 1) {
            const { crewId, entry } = items[i];
            const record = await appendEntry(state.audit, {
                event: "card_routed",
                ts: auditTimestamp(dayEntry.day, i),
                payload: { crew: crewId, level: entry.level, priority: entry.routing.priority, day: dayEntry.day },
            });
            state.audit.push(record);
        }
        state.view = state.audit.map((e) => ({ ...e }));
        await refreshAudit();
    }
    async function refreshAudit() {
        const result = await verifyChain(state.view);
        renderChainRows($("audit-body"), state.view, result.firstBadIndex);
        $("audit-status").textContent = result.ok
            ? `chain intact · ${state.view.length} entries`
            : `first broken entry: #${result.firstBadIndex} (${result.reason})`;
        $("audit-status").classList.toggle("is-bad", !result.ok);
    }
    /* ------------------------------------------------------------------ render */
    function currentDay() {
        return state.doc.days[state.dayIndex];
    }
    function render() {
        const dayEntry = currentDay();
        const upto = state.dayIndex;
        $("source-line").textContent = `${SCENARIO_LABELS[state.name] || state.name} · ${state.doc.days.length} days · source: ${state.source} · synthetic data, not a medical device`;
        $("source-line").classList.toggle("is-degraded", state.source.includes("fixture") || state.source.includes("demo-data"));
        $("day-out").textContent = String(dayEntry.day);
        $("day").value = String(state.dayIndex + 1);
        const crewIds = Object.keys(dayEntry.crew || {}).sort();
        $("crew-list").innerHTML = crewIds.map((id) => crewCard(id, dayEntry.crew[id], dayEntry, upto)).join("");
        const attribution = dayEntry.attribution;
        $("attribution-line").textContent = attribution
            ? `Attribution: ${attribution.mode}${attribution.affected?.length ? ` · affected ${attribution.affected.join(", ")}` : ""} · ${attribution.advice || ""}`
            : "";
        renderDelay();
        const items = queueItems(dayEntry);
        const tiers = consent();
        $("queue-note").textContent = items.length
            ? `${items.length} message(s) ready to send for day ${dayEntry.day}. Values below come from the scenario export.`
            : `Nothing to send on day ${dayEntry.day}: every crew member is at info level.`;
        $("queue").innerHTML = items.map(({ crewId, entry }) => queueCard(crewId, entry, tiers)).join("");
        rebuildAudit(dayEntry);
    }
    /* -------------------------------------------------------------------- boot */
    async function boot() {
        $("day").addEventListener("input", (event) => {
            state.dayIndex = Number(event.target.value) - 1;
            render();
        });
        $("profile").addEventListener("change", (event) => {
            state.profile = event.target.value;
            renderDelay();
        });
        ["consent-vitals", "consent-symptoms", "consent-behavioral"].forEach((id) => $(id).addEventListener("change", () => {
            const dayEntry = currentDay();
            $("queue").innerHTML = queueItems(dayEntry)
                .map(({ crewId, entry }) => queueCard(crewId, entry, consent()))
                .join("");
        }));
        $("scenario").addEventListener("change", async (event) => {
            await setScenario(event.target.value);
        });
        $("file").addEventListener("change", async (event) => {
            const file = event.target.files?.[0];
            if (!file)
                return;
            try {
                const doc = JSON.parse(await file.text());
                if (!doc.days?.length)
                    throw new Error("JSON has no days[]");
                applyScenario(doc, `file: ${file.name}`, doc.name || state.name);
            }
            catch (err) {
                $("source-line").textContent = `Could not read that file: ${err instanceof Error ? err.message : String(err)}`;
            }
        });
        $("audit-tamper").addEventListener("click", () => {
            if (state.view.length < 2)
                return;
            const entry = state.view[1];
            const payload = entry.payload && typeof entry.payload === "object" ? entry.payload : {};
            state.view[1] = { ...entry, payload: { ...payload, level: "info" } };
            refreshAudit();
        });
        $("audit-recheck").addEventListener("click", refreshAudit);
        await setScenario(state.name);
    }
    async function setScenario(name) {
        state.name = name;
        try {
            const { doc, source } = await loadScenario(name);
            applyScenario(doc, source, name);
        }
        catch (err) {
            $("source-line").textContent = err instanceof Error ? err.message : String(err);
            $("source-line").classList.add("is-degraded");
            $("crew-list").innerHTML = "";
            $("queue").innerHTML = "";
        }
    }
    function applyScenario(doc, source, name) {
        state.doc = doc;
        state.source = source;
        state.name = name;
        state.dayIndex = Math.min(state.dayIndex, doc.days.length - 1);
        $("scenario").value = name in SCENARIO_LABELS ? name : $("scenario").value;
        $("day").max = String(doc.days.length);
        render();
    }
    boot();
})();
})();
