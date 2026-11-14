import { useEffect, useState } from "react";
import { Bullets, DataTable, RawDetails, Tiles } from "../components/DataView";
import { Chip, EmptyState, Panel } from "../components/primitives";
import { FluxChart } from "../components/FluxChart";
import { loadRadiation, loadSpaceWeather } from "../lib/api";
import {
  eventDetails,
  eventLabel,
  parseSpaceWeather,
  type SpaceWeather,
} from "../lib/spaceWeather";
import {
  isRecord,
  pickRecord,
  primitiveEntries,
  recordArrays,
  stringItems,
} from "../lib/inspect";

type State = { phase: "loading" | "ready" | "missing"; data: unknown };
type SpaceState = { phase: "loading" | "ready" | "missing"; data: SpaceWeather | null };

function DonkiPanel({ phase, data }: { phase: SpaceState["phase"]; data: SpaceWeather | null }) {
  if (phase === "loading") {
    return (
      <Panel className="donki-panel" title="Solar events / NASA DONKI" labelledBy="donki-title">
        <p className="muted" role="status">Loading the NASA DONKI snapshot…</p>
      </Panel>
    );
  }

  if (!data) {
    return (
      <Panel className="donki-panel" title="Solar events / NASA DONKI" labelledBy="donki-title">
        <EmptyState title="NASA DONKI snapshot unavailable">
          <p>
            No solar-event timeline is published. No flare, particle or CME event is estimated.
          </p>
        </EmptyState>
      </Panel>
    );
  }

  const successful = data.sources.filter((source) => source.mode === "real");
  const retrieved = successful
    .map((source) => source.retrieved_at)
    .filter((value): value is string => Boolean(value))
    .sort();
  const latestRetrieved = retrieved.length > 0 ? retrieved[retrieved.length - 1] : data.generated_at;
  const latest = data.events.slice(0, 12);
  const noaa = data.noaa;

  return (
    <Panel
      className="donki-panel"
      title="Solar events / NASA DONKI"
      labelledBy="donki-title"
      aside={
        <>
          <Chip tone="accent">NASA DONKI</Chip>
          <Chip tone="quiet">real-public</Chip>
        </>
      }
    >
      <p className="small muted">
        {data.window_start ?? "Unknown start"} to {data.window_end ?? "unknown end"} · retrieved{" "}
        {latestRetrieved ?? "unknown"} · archived snapshot, not live.
      </p>

      {Object.keys(data.counts).length > 0 ? (
        <p className="chips">
          {Object.entries(data.counts).map(([type, value]) => (
            <Chip key={type} tone="quiet">{type} {value}</Chip>
          ))}
        </p>
      ) : null}

      {latest.length > 0 ? (
        <ul className="plain-list">
          {latest.map((event) => {
            const details = eventDetails(event);
            return (
              <li key={event.id}>
                <strong>{eventLabel(event.type)}</strong> ·{" "}
                <time dateTime={event.time}>{event.time}</time>
                {details.length > 0 ? <> · {details.join(" · ")}</> : null}
                {event.link ? (
                  <> · <a href={event.link} target="_blank" rel="noreferrer">DONKI record</a></>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted small">
          No DONKI events were published in this window. This is an empty result, not estimated data.
        </p>
      )}

      {data.events.length > latest.length ? (
        <p className="small muted">
          Showing {latest.length} of {data.events.length} events; the full timeline is in{" "}
          <code>space-weather.json</code>.
        </p>
      ) : null}

      {data.failures.length > 0 ? (
        <p className="small">
          Source failure: {data.failures.map((failure) => `${failure.type} — ${failure.error}`).join("; ")}.
          No values were substituted.
        </p>
      ) : null}

      {noaa?.status === "ok" && noaa.s_scale_max !== null ? (
        <p className="small">
          <Chip tone="accent">NOAA GOES</Chip> S{noaa.s_scale_max} max in the separate NOAA proton
          window {noaa.window_start ?? "unknown start"} to {noaa.window_end ?? "unknown end"}. Not
          individual dose.
        </p>
      ) : noaa?.status !== "ok" ? (
        <p className="small muted">
          NOAA GOES context: no data ({noaa?.reason ?? "snapshot unavailable"}).
        </p>
      ) : null}

      <p className="small">
        <a
          href={data.doc_url ?? data.reference_url ?? "https://ccmc.gsfc.nasa.gov/DONKI/api/"}
          target="_blank"
          rel="noreferrer"
        >
          NASA DONKI documentation
        </a>{" "}
        · {data.license ?? "NASA open data"}
      </p>

      <details className="raw">
        <summary>Snapshot provenance</summary>
        <ul className="plain-list">
          {data.sources.map((source) => (
            <li key={source.id ?? source.type ?? "source"}>
              {source.type ?? "unknown"}: {source.rows_raw ?? "—"} rows · retrieved{" "}
              {source.retrieved_at ?? "unknown"} · source {source.mode ?? "unknown"}
              {source.sha256 ? ` · sha256 ${source.sha256.slice(0, 12)}…` : ""}
            </li>
          ))}
        </ul>
      </details>

      {data.limitations.length > 0 ? (
        <details className="raw">
          <summary>Limitations</summary>
          <Bullets items={data.limitations} tone="warn" />
        </details>
      ) : null}

      <p className="small muted">
        Solar particle and flare events are space-weather context, not individual dose.
      </p>
    </Panel>
  );
}

export function Radiation() {
  const [state, setState] = useState<State>({ phase: "loading", data: null });
  const [space, setSpace] = useState<SpaceState>({ phase: "loading", data: null });

  useEffect(() => {
    let alive = true;
    loadRadiation().then((data) => {
      if (alive) setState({ phase: data ? "ready" : "missing", data });
    });
    loadSpaceWeather().then((data) => {
      if (alive) setSpace({ phase: data ? "ready" : "missing", data: parseSpaceWeather(data) });
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
          <p className="micro">MISSION ENVIRONMENT / NASA DONKI + NOAA GOES</p>
          <h1>{title ?? "A wider view of the mission."}</h1>
          <p className="viewhead__sub">
            Space weather adds context. Your personal baseline stays at the center.
          </p>
        </div>
        <div className="chips"><Chip tone="accent">{record?.label === "real-public" ? "REAL-PUBLIC DATA" : "See source labels"}</Chip><Chip tone="quiet">Archived snapshot · not live</Chip></div>
      </header>

      <div className="stack">
        <DonkiPanel phase={space.phase} data={space.data} />

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
          <>
            {Array.isArray(record.points) ? <>
              <dl className="mission-metrics">
                <div><dt>NOAA S-scale / last reading</dt><dd>S{String(record.s_scale_now ?? "—")}<span>published classification</span></dd></div>
                <div><dt>Last proton flux</dt><dd>{String(pickRecord(record.current)?.flux ?? "—")}<span>pfu</span></dd></div>
                <div><dt>Peak proton flux</dt><dd>{String(pickRecord(record.peak)?.flux ?? "—")}<span>pfu in this snapshot</span></dd></div>
                <div><dt>Observation satellite</dt><dd>GOES {String(record.satellite ?? "—")}<span>≥10 MeV channel</span></dd></div>
              </dl>
              <Panel title="Proton flux / archived observation window" labelledBy="flux-title" aside={<><Chip tone="accent">NOAA GOES</Chip><Chip tone="quiet">Context only</Chip></>}>
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
          </>
        ) : null}
      </div>
    </div>
  );
}
