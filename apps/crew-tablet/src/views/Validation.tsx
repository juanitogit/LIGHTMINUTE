import { useEffect, useState } from "react";
import { Bullets, DataTable, RawDetails, Tiles } from "../components/DataView";
import { DataNotice, EmptyState, Panel } from "../components/primitives";
import { loadLlmStats, loadValidation } from "../lib/api";
import { formatValue } from "../lib/inspect";
import { isRecord, pickRecord, primitiveEntries, recordArrays, stringItems } from "../lib/inspect";

const STAT_LABELS: Record<string, string> = {
  calls: "LLM calls",
  llm_cards: "LLM cards",
  template_cards: "Template cards",
  verifier_rejections: "Verifier rejections",
  fallbacks: "Fallbacks",
  errors: "Errors",
  cache_hit_ratio: "Cache hit ratio",
  uptime_s: "Uptime (s)",
  prompt_tokens: "Prompt tokens",
  completion_tokens: "Completion tokens",
  cache_hit_tokens: "Cache-hit tokens",
  llm_provider: "Provider",
  llm_key_present: "Key present",
};

const STAT_ORDER = [
  "calls",
  "llm_cards",
  "template_cards",
  "verifier_rejections",
  "fallbacks",
  "cache_hit_ratio",
  "uptime_s",
  "prompt_tokens",
  "completion_tokens",
  "cache_hit_tokens",
  "llm_provider",
  "llm_key_present",
];

function formatStat(key: string, value: unknown): string {
  if (key === "cache_hit_ratio" && typeof value === "number") {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (key === "uptime_s" && typeof value === "number") {
    return value >= 120 ? `${(value / 60).toFixed(1)} min` : `${value.toFixed(0)} s`;
  }
  return formatValue(value);
}

type Phase = "loading" | "ready";

export function Validation() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [validation, setValidation] = useState<unknown>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([loadValidation(), loadLlmStats()]).then(([validationDoc, llmStats]) => {
      if (!alive) return;
      setValidation(validationDoc);
      setStats(llmStats);
      setPhase("ready");
    });
    return () => {
      alive = false;
    };
  }, []);

  const doc = isRecord(validation) ? validation : null;
  const summary = doc ? (pickRecord(doc.summary) ?? pickRecord(doc.metrics) ?? pickRecord(doc.headline)) : null;
  const tables = doc ? recordArrays(doc) : [];
  const notes = doc ? stringItems(doc.notes ?? doc.limitations ?? doc.caveats) : [];
  const statEntries = stats
    ? STAT_ORDER.filter((key) => key in stats).map((key) => [
        STAT_LABELS[key] ?? key,
        formatStat(key, stats[key]),
      ] as [string, string])
    : [];

  return (
    <div className="view">
      <header className="viewhead">
        <div>
          <p className="micro">Evidence · validation</p>
          <h1>Validation &amp; live system stats</h1>
          <p className="viewhead__sub">
            What we measured, what we did not, and how the explanation layer is behaving.
          </p>
        </div>
        <DataNotice />
      </header>

      {phase === "loading" ? (
        <Panel>
          <p className="muted" role="status">Loading validation results…</p>
        </Panel>
      ) : null}

      {phase === "ready" ? (
        <div className="stack">
          <Panel
            title="Live LLM layer"
            aside={
              <span className="mono small">
                {stats ? "live · resets on API restart" : "API offline"}
              </span>
            }
            labelledBy="stats-title"
          >
            {stats ? (
              <>
                <Tiles entries={statEntries} />
                <p className="muted small">
                  Counters come from this running API instance. With the API off, the tablet still
                  renders verified template cards from static JSON.
                </p>
              </>
            ) : (
              <EmptyState title="No live counters">
                <p>
                  The engine API is not reachable from this tablet, so live counters are
                  unavailable. Every card you can open is the deterministic template.
                </p>
              </EmptyState>
            )}
          </Panel>

          {!doc ? (
            <Panel title="Benchmark" labelledBy="bench-title">
              <EmptyState title="Benchmark results not published yet">
                <p>
                  This page reads <code>public/data/validation.json</code> (validation workstream).
                  Until it lands, no result is claimed here.
                </p>
              </EmptyState>
            </Panel>
          ) : (
            <>
              {summary ? (
                <Panel title="Headline results" labelledBy="summary-title">
                  <Tiles entries={primitiveEntries(summary, 9)} />
                </Panel>
              ) : null}

              {tables.map((table) => (
                <Panel key={table.key} title={table.key.replace(/_/g, " ")} labelledBy={`val-${table.key}`}>
                  <DataTable rows={table.rows} caption={table.key} />
                </Panel>
              ))}

              {notes.length > 0 ? (
                <Panel title="Limitations" labelledBy="limits-title">
                  <Bullets items={notes} tone="warn" />
                </Panel>
              ) : null}

              <Panel title="What this does not claim" labelledBy="claims-title">
                <ul className="plain-list">
                  <li>Not a clinical trial and not a medical device.</li>
                  <li>Synthetic crew data; public proxies are labelled where used.</li>
                  <li>
                    Comparative numbers are reported with their limitations, not as promised
                    accuracy.
                  </li>
                </ul>
                <RawDetails data={validation} />
              </Panel>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
