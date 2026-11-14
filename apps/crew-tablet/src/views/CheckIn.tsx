import { useCallback, useEffect, useRef, useState } from "react";
import { Chip, Panel } from "../components/primitives";

/**
 * Local-only crew tools: a brief PVT (psychomotor vigilance task) and a daily
 * check-in. Both are DEMO features:
 *  - everything stays in this browser's localStorage and is never sent;
 *  - nothing here is a diagnosis or a measurement of fitness for duty;
 *  - no value from this page is fed back into the engine, so it can never move
 *    a crew member's level or urgency.
 */

const PVT_TRIALS = 10;
const PVT_MIN_ISI_MS = 1500;
const PVT_MAX_ISI_MS = 4000;
const PVT_LAPSE_MS = 500;
const PVT_KEY = "tether-pvt-history";
const CHECKIN_KEY = "tether-checkin";
const MAX_ENTRIES = 20;

const SYMPTOMS = ["headache", "nausea", "dizziness", "fatigue", "congestion", "none"] as const;

interface PvtRun {
  ts: string;
  trials: number;
  medianMs: number;
  lapses: number;
  falseStarts: number;
}

interface CheckInEntry {
  ts: string;
  sleepH: number;
  mood: number;
  symptoms: string[];
  note: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const timestamp = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

function isPvtRun(value: unknown): value is PvtRun {
  if (!isRecord(value)) return false;
  return timestamp(value.ts) && value.trials === PVT_TRIALS &&
    finite(value.medianMs) && value.medianMs >= 0 &&
    Number.isInteger(value.lapses) && Number(value.lapses) >= 0 && Number(value.lapses) <= PVT_TRIALS &&
    Number.isInteger(value.falseStarts) && Number(value.falseStarts) >= 0;
}

function isCheckIn(value: unknown): value is CheckInEntry {
  if (!isRecord(value)) return false;
  return timestamp(value.ts) && finite(value.sleepH) && value.sleepH >= 0 && value.sleepH <= 14 &&
    value.sleepH * 2 === Math.round(value.sleepH * 2) &&
    finite(value.mood) && Number.isInteger(value.mood) && value.mood >= 1 && value.mood <= 5 &&
    Array.isArray(value.symptoms) && value.symptoms.every((item) =>
      typeof item === "string" && (SYMPTOMS as readonly string[]).includes(item)) &&
    new Set(value.symptoms).size === value.symptoms.length &&
    !(value.symptoms.includes("none") && value.symptoms.length > 1) &&
    typeof value.note === "string" && value.note.length <= 280;
}

function readList<T>(key: string, valid: (value: unknown) => value is T): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(valid).slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, items: T[]): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_ENTRIES)));
    return true;
  } catch {
    return false;
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

const stamp = (ts: string) => {
  const date = new Date(ts);
  return Number.isNaN(date.getTime()) ? ts : date.toLocaleString();
};

type PvtPhase = "idle" | "armed" | "stimulus" | "done";

function PvtB() {
  const [phase, setPhase] = useState<PvtPhase>("idle");
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState(0);
  const [history, setHistory] = useState<PvtRun[]>(() => readList(PVT_KEY, isPvtRun));
  const [storageError, setStorageError] = useState(false);
  const stimulusAt = useRef(0);
  const timer = useRef<number | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<PvtPhase>("idle");
  const timesRef = useRef<number[]>([]);
  const startsRef = useRef(0);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const arm = useCallback(() => {
    clearTimer();
    phaseRef.current = "armed";
    setPhase("armed");
    const isi = PVT_MIN_ISI_MS + Math.random() * (PVT_MAX_ISI_MS - PVT_MIN_ISI_MS);
    timer.current = window.setTimeout(() => {
      stimulusAt.current = performance.now();
      phaseRef.current = "stimulus";
      setPhase("stimulus");
    }, isi);
  }, []);

  useEffect(() => clearTimer, []);

  const finish = useCallback(
    (rts: number[], starts: number) => {
      const run: PvtRun = {
        ts: new Date().toISOString(),
        trials: rts.length,
        medianMs: Math.round(median(rts)),
        lapses: rts.filter((rt) => rt > PVT_LAPSE_MS).length,
        falseStarts: starts,
      };
      const next = [run, ...readList(PVT_KEY, isPvtRun)].slice(0, MAX_ENTRIES);
      setHistory(next);
      setStorageError(!writeList(PVT_KEY, next));
      phaseRef.current = "done";
      setPhase("done");
    },
    [],
  );

  const hit = useCallback(() => {
    if (phaseRef.current === "armed") {
      // Pressing before the stimulus is a false start, not a reaction time.
      startsRef.current += 1;
      setFalseStarts(startsRef.current);
      return;
    }
    if (phaseRef.current !== "stimulus") return;
    const rt = performance.now() - stimulusAt.current;
    const next = [...timesRef.current, rt];
    timesRef.current = next;
    setReactionTimes(next);
    if (next.length >= PVT_TRIALS) {
      finish(next, startsRef.current);
    } else {
      arm();
    }
  }, [arm, finish]);

  useEffect(() => {
    const respond = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat ||
          !["armed", "stimulus"].includes(phaseRef.current)) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      // Preserve normal Space input in the daily demo log and other controls.
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (target?.closest("button, a") && !surface.current?.contains(target)) return;
      event.preventDefault();
      hit();
    };
    window.addEventListener("keydown", respond);
    return () => window.removeEventListener("keydown", respond);
  }, [hit]);

  const start = () => {
    timesRef.current = [];
    startsRef.current = 0;
    setStorageError(false);
    setReactionTimes([]);
    setFalseStarts(0);
    arm();
    surface.current?.focus();
  };

  const current = reactionTimes.length;
  const medianMs = Math.round(median(reactionTimes));
  const lapses = reactionTimes.filter((rt) => rt > PVT_LAPSE_MS).length;

  return (
    <Panel
      title="PVT-B · reaction check"
      aside={<span className="mono small">{current}/{PVT_TRIALS} trials</span>}
      labelledBy="pvt-title"
    >
      <p className="muted small">
        A brief 10-trial vigilance task. Tap (or press Space) the moment the square appears.
        Demo only: this is not a validated fitness-for-duty test and it does not change any level.
      </p>

      <div
        ref={surface}
        tabIndex={0}
        role="group"
        aria-label="PVT response area — press Space when the square appears"
        className={`pvt pvt--${phase}`}
        onPointerDown={(event) => {
          if (phase === "armed" || phase === "stimulus") {
            event.preventDefault();
            hit();
          }
        }}
      >
        {phase === "stimulus" ? (
          <button
            type="button"
            className="pvt__target"
            aria-label="Stimulus — tap now"
            onClick={(event) => {
              event.stopPropagation();
              hit();
            }}
          >
            TAP
          </button>
        ) : (
          <p className="pvt__hint">
            {phase === "idle" ? "Ready when you are." : null}
            {phase === "armed" ? "Wait for the square…" : null}
            {phase === "done" ? "Run complete." : null}
          </p>
        )}
      </div>

      <div className="pvt__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={start}
          disabled={phase === "armed" || phase === "stimulus"}
        >
          {phase === "done" ? "Run again" : "Start PVT-B"}
        </button>
        {phase === "armed" || phase === "stimulus" ? (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              clearTimer();
              phaseRef.current = "idle";
              timesRef.current = [];
              startsRef.current = 0;
              setPhase("idle");
              setReactionTimes([]);
              setFalseStarts(0);
            }}
          >
            Stop
          </button>
        ) : null}
      </div>

      {phase === "done" ? (
        <dl className="tiles tiles--3">
          <div className="tile">
            <dt>Median RT</dt>
            <dd>{medianMs} ms</dd>
          </div>
          <div className="tile">
            <dt>Lapses (&gt;{PVT_LAPSE_MS} ms)</dt>
            <dd>{lapses}</dd>
          </div>
          <div className="tile">
            <dt>False starts</dt>
            <dd>{falseStarts}</dd>
          </div>
        </dl>
      ) : null}

      {history.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <caption>Previous runs · this browser only</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Trials</th>
                <th scope="col">Median RT</th>
                <th scope="col">Lapses</th>
                <th scope="col">False starts</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 5).map((run) => (
                <tr key={run.ts}>
                  <td>{stamp(run.ts)}</td>
                  <td>{run.trials}</td>
                  <td>{run.medianMs} ms</td>
                  <td>{run.lapses}</td>
                  <td>{run.falseStarts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {storageError ? (
        <p className="muted small" role="status">
          This browser refused local storage, so the run was not saved.
        </p>
      ) : null}
    </Panel>
  );
}

function DailyCheckIn() {
  const [sleepH, setSleepH] = useState(7);
  const [mood, setMood] = useState(3);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<CheckInEntry[]>(() => readList(CHECKIN_KEY, isCheckIn));
  const [saved, setSaved] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const toggle = (symptom: string) => {
    setSaved(false);
    setSymptoms((prev) => {
      if (symptom === "none") return prev.includes("none") ? [] : ["none"];
      const without = prev.filter((item) => item !== "none");
      return without.includes(symptom)
        ? without.filter((item) => item !== symptom)
        : [...without, symptom];
    });
  };

  const save = () => {
    setSaved(false);
    const entry: CheckInEntry = {
      ts: new Date().toISOString(),
      sleepH,
      mood,
      symptoms,
      note: note.trim().slice(0, 280),
    };
    if (!isCheckIn(entry)) {
      setStorageError("Use valid demo values: sleep 0–14 hours in half-hour steps, mood 1–5, and listed symptoms only.");
      return;
    }
    const next = [entry, ...readList(CHECKIN_KEY, isCheckIn)].slice(0, MAX_ENTRIES);
    const ok = writeList(CHECKIN_KEY, next);
    setStorageError(ok ? null : "This browser refused local storage. The demo check-in was not saved.");
    if (ok) {
      setEntries(next);
      setSaved(true);
      setNote("");
    }
  };

  const clearAll = () => {
    if (!window.confirm("Delete every check-in stored in this browser?")) return;
    setSaved(false);
    if (writeList(CHECKIN_KEY, [])) {
      setEntries([]);
      setStorageError(null);
    } else {
      setStorageError("This browser refused local storage. The log was not cleared; entries remain on this device.");
    }
  };

  return (
    <Panel
      title="Daily check-in"
      aside={<span className="mono small">local · demo</span>}
      labelledBy="checkin-title"
    >
      <p className="muted small">
        Use fictional crew values only. Do not enter real personal health information.
        This demo log stays in this browser, is never sent or read by the engine, and is not a diagnosis.
      </p>

      <div className="checkin">
        <label className="field">
          <span>Sleep last night (hours)</span>
          <input
            type="number"
            min={0}
            max={14}
            step={0.5}
            value={Number.isNaN(sleepH) ? "" : sleepH}
            onChange={(event) => {
              setSaved(false);
              setSleepH(event.target.value === "" ? NaN : Number(event.target.value));
            }}
          />
        </label>

        <fieldset className="checkin__fieldset">
          <legend>How you feel (1 = rough, 5 = good)</legend>
          <div className="chips" role="group" aria-label="Mood">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={`btn btn--tiny ${mood === value ? "btn--primary" : ""}`}
                aria-pressed={mood === value}
                onClick={() => {
                  setSaved(false);
                  setMood(value);
                }}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="checkin__fieldset">
          <legend>Anything you noticed</legend>
          <div className="chips">
            {SYMPTOMS.map((symptom) => (
              <label key={symptom} className={`check ${symptoms.includes(symptom) ? "is-on" : ""}`}>
                <input
                  type="checkbox"
                  checked={symptoms.includes(symptom)}
                  onChange={() => toggle(symptom)}
                />
                <span>{symptom}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>Note (optional, 280 characters)</span>
          <textarea
            rows={3}
            maxLength={280}
            value={note}
            onChange={(event) => {
              setSaved(false);
              setNote(event.target.value);
            }}
          />
        </label>

        <div className="pvt__actions">
          <button type="button" className="btn btn--primary" onClick={save}>
            Save check-in
          </button>
          {entries.length > 0 ? (
            <button type="button" className="btn btn--ghost" onClick={clearAll}>
              Clear local log
            </button>
          ) : null}
          {saved ? <span className="muted small">Saved on this device.</span> : null}
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <caption>{entries.length} local check-ins</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Sleep</th>
                <th scope="col">Mood</th>
                <th scope="col">Noticed</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.ts}>
                  <td>{stamp(entry.ts)}</td>
                  <td>{entry.sleepH} h</td>
                  <td>{entry.mood}/5</td>
                  <td>{entry.symptoms.length > 0 ? entry.symptoms.join(", ") : "—"}</td>
                  <td>{entry.note.length > 0 ? entry.note : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted small">No check-ins on this device yet.</p>
      )}

      {storageError ? (
        <p className="muted small" role="status">
          {storageError}
        </p>
      ) : null}
    </Panel>
  );
}

export function CheckIn() {
  return (
    <div className="view">
      <header className="viewhead">
        <div>
          <p className="micro">Local tools · demo</p>
          <h1>Crew check-in</h1>
          <p className="viewhead__sub">
            Two local-only tools for the demo: a brief PVT and a daily log. Neither one feeds the
            engine.
          </p>
        </div>
        <div className="chips">
          <Chip tone="warn">LOCAL ONLY</Chip>
          <Chip tone="quiet">not a medical device</Chip>
        </div>
      </header>

      <div className="stack">
        <p className="banner banner--warn" role="note">
          <span>
            <b>Synthetic demo only: do not enter real personal health data.</b> Both tools write to this browser&apos;s localStorage and
            nothing else. They do not send data, do not diagnose, and do not alter any crew
            member&apos;s urgency level — the deterministic engine remains the only thing that
            decides numbers and levels.
          </span>
        </p>

        <PvtB />
        <DailyCheckIn />
      </div>
    </div>
  );
}
