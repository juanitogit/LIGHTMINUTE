import { useEffect, useState } from "react";
import { Bullets, DataTable, RawDetails, Tiles } from "../components/DataView";
import { Chip, EmptyState, Panel } from "../components/primitives";
import { FluxChart } from "../components/FluxChart";
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
          <p className="micro">MISSION ENVIRONMENT / NOAA SWPC</p>
          <h1>{title ?? "A wider view of the mission."}</h1>
          <p className="viewhead__sub">
            Space weather adds context. Your personal baseline stays at the center.
          </p>
        </div>
        <div className="chips"><Chip tone="accent">{record?.label === "real-public" ? "REAL-PUBLIC DATA" : "See source labels"}</Chip><Chip tone="quiet">Archived snapshot · not live</Chip></div>
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
              The space-weather snapshot is unavailable. Check your connection and try again.
              No dose or space-weather conditions are estimated.
            </p>
          </EmptyState>
        </Panel>
      ) : null}

      {state.phase === "ready" && record ? (
        <div className="stack">
          {Array.isArray(record.points) ? <>
            <dl className="mission-metrics">
              <div><dt>NOAA S-scale / last reading</dt><dd>S{String(record.s_scale_now ?? "—")}<span>published classification</span></dd></div>
              <div><dt>Last proton flux</dt><dd>{String(pickRecord(record.current)?.flux ?? "—")}<span>pfu</span></dd></div>
              <div><dt>Peak proton flux</dt><dd>{String(pickRecord(record.peak)?.flux ?? "—")}<span>pfu in this snapshot</span></dd></div>
              <div><dt>Observation satellite</dt><dd>GOES {String(record.satellite ?? "—")}<span>≥10 MeV channel</span></dd></div>
            </dl>
            <Panel title="Proton flux / archived observation window" labelledBy="flux-title" aside={<Chip tone="quiet">Context only</Chip>}>
              <FluxChart points={record.points} />
              <p className="small muted">Retrieved: {String(record.retrieved_at ?? "Unknown")} · Last observation: {String(pickRecord(record.current)?.ts ?? "Unknown")}</p>
              {typeof record.source_url === "string" && record.source_url.startsWith("https://") ? <p className="small"><a href={record.source_url} target="_blank" rel="noreferrer">NOAA SWPC source</a> · {String(record.license ?? "See source license")}</p> : null}
            </Panel>
          </> : null}
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

          {!Array.isArray(record.points) && (summary ? (
            <Panel title="Summary" labelledBy="rad-summary">
              <Tiles entries={primitiveEntries(summary, 9)} />
            </Panel>
          ) : (
            <Panel title="Snapshot" labelledBy="rad-snapshot">
              <Tiles entries={primitiveEntries(record, 9)} />
            </Panel>
          ))}

          {tables.filter((table) => table.key !== "points").map((table) => (
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
