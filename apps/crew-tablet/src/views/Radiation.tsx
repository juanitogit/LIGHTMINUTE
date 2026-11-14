import { useEffect, useState } from "react";
import { Bullets, DataTable, RawDetails, Tiles } from "../components/DataView";
import { DataNotice, EmptyState, Panel } from "../components/primitives";
import { loadRadiation } from "../lib/api";
import {
  isRecord,
  pickRecord,
  primitiveEntries,
  recordArrays,
  stringItems,
} from "../lib/inspect";

type State = { phase: "loading" | "ready" | "missing"; data: unknown };

export function Radiation() {
  const [state, setState] = useState<State>({ phase: "loading", data: null });

  useEffect(() => {
    let alive = true;
    loadRadiation().then((data) => {
      if (alive) setState({ phase: data ? "ready" : "missing", data });
    });
    return () => {
      alive = false;
    };
  }, []);

  const record = isRecord(state.data) ? state.data : null;
  const summary =
    pickRecord(record?.summary) ?? pickRecord(record?.metrics) ?? pickRecord(record?.current);
  const tables = record ? recordArrays(record) : [];
  const sources = record
    ? stringItems(record.sources ?? record.attribution ?? record.references)
    : [];
  const notes = record ? stringItems(record.notes ?? record.limitations ?? record.caveats) : [];
  const title = typeof record?.title === "string" ? record.title : null;
  const kind =
    typeof record?.kind === "string"
      ? record.kind
      : typeof record?.data_kind === "string"
        ? record.data_kind
        : null;

  return (
    <div className="view">
      <header className="viewhead">
        <div>
          <p className="micro">Context · radiation</p>
          <h1>{title ?? "Radiation & space weather"}</h1>
          <p className="viewhead__sub">
            Hazard context for the crew. Values are rendered exactly as published.
          </p>
        </div>
        <DataNotice />
      </header>

      {state.phase === "loading" ? (
        <Panel>
          <p className="muted" role="status">Loading the radiation snapshot…</p>
        </Panel>
      ) : null}

      {state.phase === "missing" ? (
        <Panel title="Snapshot not published yet" labelledBy="rad-missing">
          <EmptyState title="No radiation data available">
            <p>
              This panel reads <code>public/data/radiation.json</code>. It has not been published
              in this build yet, so TETHER shows nothing rather than estimating a dose.
            </p>
          </EmptyState>
        </Panel>
      ) : null}

      {state.phase === "ready" && record ? (
        <div className="stack">
          {kind ? (
            <p className="chips">
              <span className="chip chip--warn">{kind}</span>
              {typeof record.synthetic === "boolean" ? (
                <span className="chip chip--quiet">
                  {record.synthetic ? "synthetic" : "public data — see sources"}
                </span>
              ) : null}
            </p>
          ) : null}

          {summary ? (
            <Panel title="Summary" labelledBy="rad-summary">
              <Tiles entries={primitiveEntries(summary, 9)} />
            </Panel>
          ) : (
            <Panel title="Snapshot" labelledBy="rad-snapshot">
              <Tiles entries={primitiveEntries(record, 9)} />
            </Panel>
          )}

          {tables.map((table) => (
            <Panel key={table.key} title={table.key.replace(/_/g, " ")} labelledBy={`rad-${table.key}`}>
              <DataTable rows={table.rows} caption={table.key} />
            </Panel>
          ))}

          {sources.length > 0 ? (
            <Panel title="Sources & attribution" labelledBy="rad-sources">
              <Bullets items={sources} />
            </Panel>
          ) : null}

          {notes.length > 0 ? (
            <Panel title="Limitations" labelledBy="rad-limits">
              <Bullets items={notes} tone="warn" />
            </Panel>
          ) : null}

          <Panel title="Honest scope" labelledBy="rad-scope">
            <p className="muted small">
              This is hazard context, not operational dosimetry, and it never changes a crew
              member&apos;s urgency by itself. The engine uses only the cited hazards it already
              carries.
            </p>
            <RawDetails data={state.data} />
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
