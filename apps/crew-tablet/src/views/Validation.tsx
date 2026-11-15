import { useEffect, useState } from "react";
import { RawDetails, Tiles } from "../components/DataView";
import { Chip, DataNotice, EmptyState, Panel } from "../components/primitives";
import { loadLlmStats, loadValidation } from "../lib/api";
import { formatValue } from "../lib/inspect";
import {
  methodIds,
  parseValidation,
  pct,
  type ValidationReport,
  type ValidationScenario,
} from "../lib/validation";

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

/** A rate, never a percentage: 0.103 false alarms per crew-week. */
const rate = (value: number | undefined) => (value === undefined ? "—" : value.toFixed(3));

function MethodsTable({ scenario }: { scenario: ValidationScenario }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>
          {scenario.title}
          {scenario.multiplier !== undefined
            ? ` · between-person SD ×${scenario.multiplier}`
            : ""}{" "}
          · recall by signal strength, equal false-alarm budget
        </caption>
        <thead>
          <tr>
            <th scope="col">Method</th>
            <th scope="col">False alarms</th>
            <th scope="col">Mild</th>
            <th scope="col">Moderate</th>
            <th scope="col">Strong</th>
            <th scope="col">Delay (moderate)</th>
          </tr>
        </thead>
        <tbody>
          {scenario.methods.map((method) => (
            <tr key={method.id}>
              <th scope="row" className="data-table__rowhead">
                {method.name}
              </th>
              <td>{method.faPerWeek === undefined ? "—" : `${rate(method.faPerWeek)} / crew-week`}</td>
              <td>{pct(method.recall.mild)}</td>
              <td>{pct(method.recall.moderate)}</td>
              <td>{pct(method.recall.strong)}</td>
              <td>{method.delayDays === undefined ? "—" : `${method.delayDays.toFixed(1)} d`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        False alarms are a <b>rate per crew-week</b> (0.103 ≈ one false alarm every ten
        crew-weeks), not a percentage. Recall columns are percentages.
      </p>
    </div>
  );
}

function RecallTable({
  caption,
  rowLabel,
  rows,
  format = "pct",
}: {
  caption: string;
  rowLabel: string;
  rows: { key: string; cells: Record<string, number> }[];
  format?: "pct" | "rate";
}) {
  const show = format === "pct" ? pct : rate;
  const ids = Array.from(new Set(rows.flatMap((row) => Object.keys(row.cells))));
  if (rows.length === 0 || ids.length === 0) return null;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{rowLabel}</th>
            {ids.map((id) => (
              <th key={id} scope="col">
                {id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className="data-table__rowhead">
                {row.key}
              </th>
              {ids.map((id) => (
                <td key={id}>{show(row.cells[id])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Validation() {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([loadValidation(), loadLlmStats()]).then(([doc, llmStats]) => {
      if (!alive) return;
      setReport(parseValidation(doc));
      setStats(llmStats);
      setPhase("ready");
    });
    return () => {
      alive = false;
    };
  }, []);

  const statEntries = stats
    ? STAT_ORDER.filter((key) => key in stats).map(
        (key) => [STAT_LABELS[key] ?? key, formatStat(key, stats[key])] as [string, string],
      )
    : [];

  const design = report?.design;
  const designTiles: [string, string][] = design
    ? [
        ["False-alarm budget", `${design.budgetPerWeek?.toFixed(3) ?? "—"} / crew-week`],
        ["Tuning seeds", formatValue(design.tuningSeeds)],
        ["Report seeds", formatValue(design.reportSeeds)],
        ["Experiment seeds", formatValue(design.experimentSeeds)],
        ["Simulated days", formatValue(design.days)],
        ["Onset day", formatValue(design.onsetDay)],
        ["Warm-up days", formatValue(design.warmupDays)],
        ["Detection horizon", `${formatValue(design.horizonDays)} days`],
        ["Effect unit", design.effectUnit ?? "—"],
      ]
    : [];

  const ids = report ? methodIds(report) : [];

  return (
    <div className="view">
      <header className="viewhead">
        <div>
          <p className="micro">Evidence · validation</p>
          <h1>Validation &amp; live system stats</h1>
          <p className="viewhead__sub">
            Synthetic crews, equal false-alarm budget, tuning and report seeds disjoint.
          </p>
        </div>
        <DataNotice label="SYNTHETIC CREW" />
      </header>
      <p className="small"><a href={`${import.meta.env.BASE_URL}verify-audit.html`}>Verify a signed audit file</a></p>

      {phase === "loading" ? (
        <Panel>
          <p className="muted" role="status">
            Loading validation results…
          </p>
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

          {!report ? (
            <Panel title="Benchmark" labelledBy="bench-title">
              <EmptyState title="Benchmark results not published yet">
                <p>
                  This page reads <code>public/data/validation.json</code>. Until it lands, no
                  result is claimed here.
                </p>
              </EmptyState>
            </Panel>
          ) : (
            <>
              <p className="chips">
                <Chip tone={report.synthetic ? "warn" : "quiet"}>
                  {report.synthetic ? "SYNTHETIC CREWS" : "no synthetic flag"}
                </Chip>
                {report.label ? <Chip tone="quiet">{report.label}</Chip> : null}
                {report.generatedBy ? <Chip tone="quiet">{report.generatedBy}</Chip> : null}
                <Chip tone="quiet">not a clinical trial</Chip>
              </p>

              <Panel title="Design" labelledBy="design-title">
                <Tiles entries={designTiles} />
                <p className="muted small">
                  Every method is compared at the same false-alarm budget: a method is not allowed
                  to look better by alerting more often.
                </p>
              </Panel>

              {report.scenarios.map((scenario) => (
                <Panel
                  key={scenario.id}
                  title={`Methods · ${scenario.title}`}
                  aside={<span className="mono small">{scenario.methods.length} methods</span>}
                  labelledBy={`scenario-${scenario.id}`}
                >
                  <MethodsTable scenario={scenario} />
                </Panel>
              ))}

              {report.calibration ? (
                <Panel title="Interval calibration" labelledBy="calibration-title">
                  <Tiles
                    entries={[
                      ["Nominal coverage", pct(report.calibration.nominal)],
                      ["Overall coverage", pct(report.calibration.overall)],
                      ["Intervals measured", formatValue(report.calibration.n)],
                    ]}
                  />
                  <div className="table-wrap">
                    <table className="data-table">
                      <caption>Coverage of the 95% interval, by indicator</caption>
                      <thead>
                        <tr>
                          <th scope="col">Indicator</th>
                          <th scope="col">Coverage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.calibration.byIndicator.map((row) => (
                          <tr key={row.indicator}>
                            <th scope="row" className="data-table__rowhead">
                              {row.indicator}
                            </th>
                            <td>{pct(row.coverage)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              ) : null}

              {report.missingData.length > 0 ? (
                <Panel title="Missing data" labelledBy="missing-title">
                  <RecallTable
                    caption="Recall for a moderate deviation when readings are missing"
                    rowLabel="Missing"
                    rows={report.missingData.map((row) => ({
                      key: pct(row.missingFraction),
                      cells: row.recall,
                    }))}
                  />
                  <RecallTable
                    caption="False alarms per crew-week under the same missingness (rate, not %)"
                    rowLabel="Missing"
                    format="rate"
                    rows={report.missingData.map((row) => ({
                      key: pct(row.missingFraction),
                      cells: row.faPerWeek,
                    }))}
                  />
                  <p className="muted small">
                    The first table is recall (%); the second is false alarms per crew-week
                    (count, not a percentage).
                  </p>
                </Panel>
              ) : null}

              {report.baselineLength.length > 0 ? (
                <Panel title="Baseline length" labelledBy="baseline-title">
                  <RecallTable
                    caption="Recall for a moderate deviation against personal history length"
                    rowLabel="Baseline"
                    rows={report.baselineLength.map((row) => ({
                      key: `${row.days} d`,
                      cells: row.recall,
                    }))}
                  />
                  <p className="muted small">
                    Short histories are the weak case: the personal lens degrades before the
                    population one.
                  </p>
                </Panel>
              ) : null}

              {report.limitations.length > 0 ? (
                <Panel title="Limitations" labelledBy="limits-title">
                  <ul className="plain-list plain-list--warn">
                    {report.limitations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {report.note ? <p className="muted small">{report.note}</p> : null}
                </Panel>
              ) : null}

              <Panel title="What this does not claim" labelledBy="claims-title">
                <ul className="plain-list">
                  <li>Not a clinical trial and not a medical device.</li>
                  <li>
                    Synthetic crews only — {ids.length} methods compared, no human participants.
                  </li>
                  <li>
                    Comparative numbers are reported with their limitations, not as promised
                    accuracy.
                  </li>
                </ul>
                <RawDetails data={report} />
              </Panel>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
