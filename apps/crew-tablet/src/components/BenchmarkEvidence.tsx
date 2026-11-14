import { Panel } from "./primitives";
import { isRecord, pickRecord } from "../lib/inspect";

const percent = (n: unknown) => typeof n === "number" ? `${(n * 100).toFixed(1)}%` : "—";

/** Comparison values are read directly from the published benchmark. */
export function BenchmarkEvidence({ doc }: { doc: Record<string, unknown> }) {
  const calibration = pickRecord(doc.calibration);
  const design = pickRecord(doc.design);
  const scenarios = Array.isArray(doc.scenarios) ? doc.scenarios.filter(isRecord) : [];
  return <>
    <dl className="mission-metrics">
      <div><dt>Predictive interval coverage</dt><dd>{percent(calibration?.overall_coverage)}<span>{percent(calibration?.nominal)} nominal interval</span></dd></div>
      <div><dt>Calibration sample</dt><dd>{String(calibration?.n ?? "—")}<span>synthetic indicator-days</span></dd></div>
      <div><dt>Independent report seeds</dt><dd>{String(design?.report_seeds ?? "—")}<span>separate from tuning</span></dd></div>
      <div><dt>False-alarm budget</dt><dd>{String(design?.false_alarm_budget_per_crew_week ?? "—")}<span>per crew-week</span></dd></div>
    </dl>
    <div className="benchmark-grid">
      {scenarios.map((scenario) => <Panel key={String(scenario.id)} title={String(scenario.title ?? scenario.id)} labelledBy={`benchmark-${String(scenario.id)}`}>
        <p className="benchmark-heading">Which patterns get noticed?</p>
        <p className="small muted">Recall for moderate synthetic shifts at a matched false-alarm budget.</p>
        <div className="benchmark-bars">{(Array.isArray(scenario.methods) ? scenario.methods.filter(isRecord) : []).map((method) => {
          const recall = pickRecord(method.recall)?.moderate;
          return <div className={`benchmark-row ${method.id === "C" ? "benchmark-row--personal" : ""}`} key={String(method.id)}>
            <div><span>{String(method.name)}</span><strong>{percent(recall)}</strong></div>
            <div className="benchmark-track" aria-hidden="true"><span style={{width: `${typeof recall === "number" ? Math.max(0, Math.min(100, recall * 100)) : 0}%`}} /></div>
            <p className="mono">False alarms: {String(method.fa_per_week ?? "—")} / crew-week</p>
          </div>;
        })}</div>
      </Panel>)}
    </div>
  </>;
}
