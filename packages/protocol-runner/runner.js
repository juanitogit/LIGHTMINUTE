/* TETHER Protocol Runner - classic-script build (works from file:// and http).
 * index.js re-exports the same API as an ES module. */
(function (global) {
  "use strict";
/* TETHER Protocol Runner - framework-free, one step per screen.
 *
 *   mountProtocolRunner(el, {protocolId, onStep, onDone})  ->  controller
 *
 * Data comes from kb/protocols/<id>.json (same shape the engine validates) or
 * from an inline `protocol` object so `demo.html` works over file://.
 * No network calls of its own beyond fetching that JSON.
 */

const STATUS = { VIEWED: "viewed", DONE: "done", CANNOT: "cannot", UNDO: "undo" };
const CANNOT_REASONS = [
  { id: "skip", label: "Skip this step" },
  { id: "buddy", label: "Call a crew mate for help" },
  { id: "escalate", label: "Stop and escalate to ground" },
];

let uid = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function mountProtocolRunner(host, options = {}) {
  if (!host) throw new Error("mountProtocolRunner: host element is required");
  const opts = {
    protocolId: null,
    protocol: null,
    protocolUrl: null,
    onStep: () => {},
    onDone: () => {},
    ...options,
  };
  const id = `tr-${++uid}`;
  const state = {
    protocol: null,
    index: 0,
    startedMs: Date.now(),
    stepStartedMs: Date.now(),
    results: [],
    finished: false,
    error: null,
  };
  let ticker = null;

  const root = el("section", "tr");
  root.setAttribute("aria-labelledby", `${id}-title`);
  host.replaceChildren(root);

  // ---- shell ---------------------------------------------------------------
  const head = el("header", "tr__head");
  const title = el("h2", "tr__title", "Protocol");
  title.id = `${id}-title`;
  const counters = el("p", "tr__counters");
  const stepClock = el("span", "tr__clock", "00:00");
  const totalClock = el("span", "tr__clock tr__clock--total", "00:00");
  counters.append(el("span", "tr__count", ""), stepClock, el("span", "tr__sep", "·"), totalClock);
  head.append(title, counters);

  const progress = el("div", "tr__progress");
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-valuemin", "1");
  progress.setAttribute("aria-valuemax", "1");
  progress.setAttribute("aria-valuenow", "1");
  const progressFill = el("div", "tr__progress-fill");
  progress.append(progressFill);

  const card = el("article", "tr__card");
  const stepText = el("p", "tr__step");
  stepText.setAttribute("aria-live", "polite");
  stepText.setAttribute("aria-atomic", "true");
  const meta = el("div", "tr__meta");
  const badge = el("span", "tr__badge");
  const source = el("span", "tr__source");
  meta.append(badge, source);
  card.append(stepText, meta);

  const actions = el("div", "tr__actions");
  const doneBtn = el("button", "tr__btn tr__btn--primary", "Done");
  doneBtn.type = "button";
  doneBtn.setAttribute("aria-keyshortcuts", "ArrowRight Enter");
  const cannotBtn = el("button", "tr__btn", "Can't do this");
  cannotBtn.type = "button";
  cannotBtn.setAttribute("aria-keyshortcuts", "C");
  cannotBtn.setAttribute("aria-expanded", "false");
  const undoBtn = el("button", "tr__btn tr__btn--ghost", "Undo");
  undoBtn.type = "button";
  undoBtn.setAttribute("aria-keyshortcuts", "ArrowLeft");
  actions.append(doneBtn, cannotBtn, undoBtn);

  const cannotPanel = el("div", "tr__panel");
  cannotPanel.hidden = true;
  cannotPanel.setAttribute("role", "group");
  cannotPanel.setAttribute("aria-label", "What is blocking you");
  const cannotTitle = el("p", "tr__panel-title", "This step is not possible right now. Choose what happens next:");
  const cannotChoices = el("div", "tr__choices");
  cannotPanel.append(cannotTitle, cannotChoices);

  const status = el("p", "tr__status");
  status.setAttribute("aria-live", "assertive");

  const summary = el("div", "tr__summary");
  summary.hidden = true;

  const hint = el("p", "tr__hint", "Keys: → done · ← undo · C can't do this");

  root.append(head, progress, card, actions, cannotPanel, status, summary, hint);

  // ---- data ----------------------------------------------------------------
  function normalise(raw) {
    if (!raw || typeof raw !== "object") throw new Error("protocol JSON is not an object");
    if (!raw.id || !Array.isArray(raw.steps) || raw.steps.length === 0) {
      throw new Error("protocol needs an id and at least one step");
    }
    const steps = raw.steps.map((s) => ({
      text: String(s.text ?? ""),
      source_status: s.source_status === "published" ? "published" : "demo-wording",
      source: String(s.source ?? ""),
    }));
    return { id: String(raw.id), title: String(raw.title ?? raw.id), steps };
  }

  async function load() {
    if (opts.protocol) return applyProtocol(opts.protocol);
    const pid = opts.protocolId;
    if (!pid) return renderError(new Error("protocolId or protocol is required"));
    const url = opts.protocolUrl || `../../kb/protocols/${pid}.json`;
    try {
      const res = await fetch(new URL(url, document.baseURI));
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      applyProtocol(await res.json());
    } catch (err) {
      renderError(err);
    }
  }

  function applyProtocol(raw) {
    state.protocol = normalise(raw);
    state.index = 0;
    state.startedMs = Date.now();
    state.stepStartedMs = state.startedMs;
    state.results = state.protocol.steps.map(() => ({ status: "pending", reason: null, ms: 0 }));
    state.finished = false;
    state.error = null;
    root.dataset.protocol = state.protocol.id;
    summary.hidden = true;
    startTicker();
    render();
  }

  function renderError(err) {
    state.error = err;
    stepText.textContent = "This protocol could not be loaded.";
    badge.textContent = "unavailable";
    badge.dataset.kind = "demo-wording";
    source.textContent = `${err.message} — over file:// pass the protocol inline (see demo.html) or serve the repo over http.`;
    doneBtn.disabled = true;
    cannotBtn.disabled = true;
    undoBtn.disabled = true;
  }

  // ---- clock ---------------------------------------------------------------
  function startTicker() {
    stopTicker();
    ticker = setInterval(() => {
      stepClock.textContent = formatClock(Date.now() - state.stepStartedMs);
      totalClock.textContent = formatClock(Date.now() - state.startedMs);
    }, 1000);
    stepClock.textContent = formatClock(0);
    totalClock.textContent = formatClock(Date.now() - state.startedMs);
  }

  function stopTicker() {
    if (ticker) clearInterval(ticker);
    ticker = null;
  }

  // ---- events --------------------------------------------------------------
  function emit(stepIndex, st) {
    const payload = {
      protocolId: state.protocol.id,
      stepIndex,
      status: st,
      tsMs: Date.now(),
    };
    try {
      opts.onStep(payload);
    } catch (err) {
      console.error("onStep threw", err);
    }
  }

  function render() {
    if (!state.protocol || state.error) return;
    const { title: name, steps } = state.protocol;
    const total = steps.length;
    const step = steps[state.index];
    title.textContent = name;
    progress.setAttribute("aria-valuemax", String(total));
    progress.setAttribute("aria-valuenow", String(state.index + 1));
    progress.setAttribute("aria-valuetext", `Step ${state.index + 1} of ${total}`);
    progressFill.style.width = `${((state.index + 1) / total) * 100}%`;
    counters.firstChild.textContent = `Step ${state.index + 1} of ${total}`;

    stepText.textContent = step.text;
    badge.textContent = step.source_status === "demo-wording" ? "demo wording" : "published source";
    badge.dataset.kind = step.source_status;
    source.textContent = step.source || "";
    status.textContent = "";

    const decided = state.results[state.index]?.status !== "pending";
    cannotPanel.hidden = true;
    cannotBtn.setAttribute("aria-expanded", "false");
    doneBtn.disabled = false;
    cannotBtn.disabled = false;
    undoBtn.disabled = state.index === 0 && !decided;
    doneBtn.textContent = state.index === total - 1 ? "Done and finish" : "Done";
    requestAnimationFrame(() => stepText.focus?.());
  }

  function advance() {
    if (state.index < state.protocol.steps.length - 1) {
      state.index += 1;
      state.stepStartedMs = Date.now();
      render();
      emit(state.index, STATUS.VIEWED);
    } else {
      finish(true);
    }
  }

  function done() {
    if (state.error || !state.protocol || state.finished) return;
    if (state.results[state.index].status !== "pending") return advance();
    const ms = Date.now() - state.stepStartedMs;
    state.results[state.index] = { status: "done", reason: null, ms };
    emit(state.index, STATUS.DONE);
    status.textContent = `Step ${state.index + 1} marked done.`;
    advance();
  }

  function openCannot() {
    if (state.error || !state.protocol || state.finished) return;
    cannotPanel.hidden = !cannotPanel.hidden;
    cannotBtn.setAttribute("aria-expanded", String(!cannotPanel.hidden));
    if (!cannotPanel.hidden) cannotChoices.querySelector("button")?.focus();
  }

  function chooseCannot(reason) {
    const ms = Date.now() - state.stepStartedMs;
    state.results[state.index] = { status: "cannot", reason, ms };
    emit(state.index, STATUS.CANNOT);
    cannotPanel.hidden = true;
    cannotBtn.setAttribute("aria-expanded", "false");
    if (reason === "escalate") {
      status.textContent = "Stopped. Escalate to ground with the card's ground_message.";
      finish(false);
    } else {
      status.textContent = reason === "buddy" ? "Crew mate called for help." : "Step skipped.";
      advance();
    }
  }

  function undo() {
    if (state.error || !state.protocol || state.finished) return;
    const current = state.results[state.index];
    if (current.status !== "pending") {
      current.status = "pending";
      current.reason = null;
      emit(state.index, STATUS.UNDO);
      render();
      return;
    }
    if (state.index === 0) return;
    state.index -= 1;
    state.results[state.index] = { status: "pending", reason: null, ms: 0 };
    state.stepStartedMs = Date.now();
    emit(state.index, STATUS.UNDO);
    render();
  }

  function finish(completed) {
    state.finished = true;
    stopTicker();
    const payload = {
      protocolId: state.protocol.id,
      completed,
      startedMs: state.startedMs,
      endedMs: Date.now(),
      totalMs: Date.now() - state.startedMs,
      steps: state.protocol.steps.map((step, i) => ({
        stepIndex: i,
        status: state.results[i].status,
        reason: state.results[i].reason,
        ms: state.results[i].ms,
      })),
    };
    renderSummary(payload);
    try {
      opts.onDone(payload);
    } catch (err) {
      console.error("onDone threw", err);
    }
  }

  function renderSummary(result) {
    summary.replaceChildren();
    summary.hidden = false;
    summary.append(
      el("h3", "tr__summary-title", result.completed ? "Protocol complete" : "Protocol stopped"),
      el(
        "p",
        "tr__summary-line",
        `${result.steps.filter((s) => s.status === "done").length} done · ` +
          `${result.steps.filter((s) => s.status === "cannot").length} not possible · ` +
          `${formatClock(result.totalMs)} total (synthetic demo, not a medical device)`
      )
    );
    const restart = el("button", "tr__btn tr__btn--ghost", "Run again");
    restart.type = "button";
    restart.addEventListener("click", () => applyProtocol(state.protocol));
    summary.append(restart);
  }

  // ---- wiring --------------------------------------------------------------
  doneBtn.addEventListener("click", done);
  cannotBtn.addEventListener("click", openCannot);
  undoBtn.addEventListener("click", undo);
  CANNOT_REASONS.forEach((reason) => {
    const b = el("button", "tr__btn", reason.label);
    b.type = "button";
    b.dataset.reason = reason.id;
    b.addEventListener("click", () => chooseCannot(reason.id));
    cannotChoices.append(b);
  });

  root.addEventListener("keydown", (event) => {
    const tag = (event.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      done();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      undo();
    } else if (event.key === "Enter" && tag !== "button") {
      event.preventDefault();
      done();
    } else if ((event.key === "c" || event.key === "C")) {
      event.preventDefault();
      openCannot();
    }
  });

  load();

  return {
    destroy() {
      stopTicker();
      host.replaceChildren();
    },
    next: done,
    prev: undo,
    cannot: openCannot,
    undo,
    restart: () => state.protocol && applyProtocol(state.protocol),
    setProtocol: (raw) => applyProtocol(raw),
    getState: () => ({
      protocolId: state.protocol?.id ?? null,
      stepIndex: state.index,
      total: state.protocol?.steps.length ?? 0,
      finished: state.finished,
      results: state.results.map((r) => ({ ...r })),
      error: state.error ? String(state.error.message) : null,
    }),
  };
}


  global.TetherProtocolRunner = { mountProtocolRunner };
})(globalThis);
