import { useEffect, useState } from "react";
import { Bullets, RawDetails } from "../components/DataView";
import { Chip, DataNotice, EmptyState, Panel } from "../components/primitives";
import { loadRadiation, loadSpaceWeather } from "../lib/api";
import {
  formatFlux,
  formatTs,
  parseRadiation,
  sScaleLabel,
  type RadiationPanel,
} from "../lib/radiation";
import {
  eventDetails,
  eventLabel,
  parseSpaceWeather,
  type SpaceWeather,
} from "../lib/spaceWeather";

type State = { phase: "loading" | "ready" | "missing"; panel: RadiationPanel | null };
type SpaceState = { phase: "loading" | "ready" | "missing"; data: SpaceWeather | null };

/** Log-scaled NOAA S-scale strip: thresholds are decades, a linear axis would hide them. */
const S_BANDS = [
  { name: "S0", from: 0.01, to: 10, note: "below S1" },
  { name: "S1", from: 10, to: 100, note: "10 pfu" },
  { name: "S2", from: 100, to: 1000, note: "100 pfu" },
  { name: "S3", from: 1000, to: 10000, note: "1e3 pfu" },
  { name: "S4", from: 10000, to: 100000, note: "1e4 pfu" },
  { name: "S5", from: 100000, to: 1000000, note: "1e5 pfu" },
];

const LOG_MIN = Math.log10(0.01);
const LOG_MAX = Math.log10(1000000);
const logPos = (value: number) => {
  const clamped = Math.min(Math.max(value, 0.01), 1000000);
  return ((Math.log10(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
};

function FluxChart({ panel }: { panel: RadiationPanel }) {
  const points = panel.points;
  const unit = panel.unitsContracted ? "pfu" : (panel.units ?? "units?");
  const max = Math.max(...points.map((p) => p.flux), 1e-6);
  const W = 720;
  const H = 210;
  const PAD_X = 34;
  const PAD_Y = 18;
  const times = points.map((p) => Date.parse(p.ts));
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const span = t1 - t0;
  // X is timestamp-proportional, not sample-index: a downlink gap stays a gap
  // instead of being compressed by the next sample.
  const x = (ts: string) =>
    span > 0 ? PAD_X + ((Date.parse(ts) - t0) / span) * (W - 2 * PAD_X) : W / 2;
  const y = (flux: number) => H - PAD_Y - (flux / (max * 1.15)) * (H - 2 * PAD_Y);
  const line = points.map((p) => `${x(p.ts).toFixed(1)},${y(p.flux).toFixed(1)}`).join(" ");
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const area = `${x(first.ts).toFixed(1)},${H - PAD_Y} ${line} ${x(last.ts).toFixed(1)},${H - PAD_Y}`;
  const middle = new Date(t0 + span / 2).toISOString();

  return (
    <figure className="rad-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Integral proton flux, ${points.length} samples, peak ${formatFlux(max, unit)}`}
      >
        <line className="grid-line" x1={PAD_X} x2={W - PAD_X} y1={y(max)} y2={y(max)} />
        <line className="grid-line" x1={PAD_X} x2={W - PAD_X} y1={y(max / 2)} y2={y(max / 2)} />
        <line
          className="rad-chart__axis"
          x1={PAD_X}
          x2={W - PAD_X}
          y1={H - PAD_Y}
          y2={H - PAD_Y}
        />
        <polygon className="rad-chart__area" points={area} />
        <polyline className="rad-chart__line" points={line} />
        {panel.peak ? (
          <circle
            className="rad-chart__peak"
            cx={x(panel.peak.ts)}
            cy={y(panel.peak.flux)}
            r={4}
          />
        ) : null}
        <text className="rad-chart__label" x={PAD_X} y={PAD_Y - 4}>
          {formatFlux(max, unit)} peak
        </text>
        <text className="rad-chart__label" x={PAD_X} y={H - 4}>
          {formatTs(first.ts)}
        </text>
        <text className="rad-chart__label" x={W / 2} y={H - 4} textAnchor="middle">
          {formatTs(middle)}
        </text>
        <text className="rad-chart__label" x={W - PAD_X} y={H - 4} textAnchor="end">
          {formatTs(last.ts)}
        </text>
      </svg>
      <figcaption className="muted small">
        {points.length} published samples · {panel.channel ?? "channel not recorded"} ·{" "}
        {panel.units ?? "units not recorded"} — plotted by timestamp, never smoothed or rescaled.
      </figcaption>
    </figure>
  );
}

function ScaleStrip({ panel }: { panel: RadiationPanel }) {
  const now = panel.current?.flux;
  return (
    <div className="sstrip">
      <div
        className="sstrip__bar"
        role="img"
        aria-label={
          now === undefined
            ? "No current sample on the NOAA S scale"
            : `Current flux ${formatFlux(now, panel.unitsContracted ? "pfu" : (panel.units ?? "units?"))} on the NOAA S scale`
        }
      >
        {S_BANDS.map((band) => {
          const left = logPos(band.from);
          const width = logPos(band.to) - left;
          // Only a level the snapshot actually records can be highlighted.
          const active =
            panel.sScaleNow !== undefined && panel.sScaleNow === Number(band.name.slice(1));
          return (
            <span
              key={band.name}
              className={`sstrip__band ${band.name === "S0" ? "sstrip__band--zero" : ""} ${
                active ? "is-active" : ""
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${band.name} · ${band.note}`}
            >
              {band.name}
            </span>
          );
        })}
        {now === undefined ? null : (
          <span
            className="sstrip__now"
            style={{ left: `${logPos(now)}%` }}
            title={`Now: ${formatFlux(now)}`}
          />
        )}
      </div>
      <p className="muted small">
        {now === undefined
          ? "No current sample is recorded. "
          : `Marker = current flux ${formatFlux(
              now,
              panel.unitsContracted ? "pfu" : (panel.units ?? "units?"),
            )}. `}
        S-scale at the latest sample: <b>{sScaleLabel(panel.sScaleNow)}</b>; maximum in this
        window: <b>{sScaleLabel(panel.sScaleMax)}</b>.{" "}
        {panel.sScaleNow === undefined
          ? "The snapshot does not record an S level for this sample, so none is inferred from flux."
          : null}{" "}
        NOAA thresholds:{" "}
        {panel.thresholds.map((t) => `${t.name} ≥ ${t.pfu.toLocaleString("en-US")} pfu`).join(" · ")}.
      </p>
    </div>
  );
}

function DonkiPanel({ phase, data }: { phase: SpaceState["phase"]; data: SpaceWeather | null }) {
  if (phase === "loading") {
    return (
      <Panel className="donki-panel" title="Solar events / NASA DONKI" labelledBy="donki-title">
        <p className="muted" role="status">
          Loading the NASA DONKI snapshot…
        </p>
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
            <Chip key={type} tone="quiet">
              {type} {value}
            </Chip>
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
                  <>
                    {" "}
                    ·{" "}
                    <a href={event.link} target="_blank" rel="noreferrer">
                      DONKI record
                    </a>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted small">
          No DONKI events were published in this window. This is an empty result, not estimated
          data.
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
          Source failure:{" "}
          {data.failures.map((failure) => `${failure.type} — ${failure.error}`).join("; ")}. No
          values were substituted.
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
  const [state, setState] = useState<State>({ phase: "loading", panel: null });
  const [space, setSpace] = useState<SpaceState>({ phase: "loading", data: null });

  useEffect(() => {
    let alive = true;
    loadRadiation().then((raw) => {
      if (!alive) return;
      const panel = parseRadiation(raw);
      setState({ phase: panel ? "ready" : "missing", panel });
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    loadSpaceWeather()
      .then((raw) => {
        if (!alive) return;
        const data = raw ? parseSpaceWeather(raw) : null;
        setSpace({ phase: data ? "ready" : "missing", data });
      })
      .catch(() => {
        if (alive) setSpace({ phase: "missing", data: null });
      });
    return () => {
      alive = false;
    };
  }, []);

  const panel = state.panel;
  const unit = panel && !panel.unitsContracted ? (panel.units ?? "units?") : "pfu";
  const labelTone = panel?.synthetic ? "warn" : panel?.label === "proxy" ? "quiet" : "accent";

  return (
    <div className="view">
      <header className="viewhead">
        <div>
          <p className="micro">Context · radiation</p>
          <h1>Radiation &amp; space weather</h1>
          <p className="viewhead__sub">
            Published GOES proton flux, exactly as the snapshot records it. Hazard context only.
          </p>
        </div>
        <DataNotice label="SYNTHETIC CREW" />
      </header>

      <div className="stack">
        <DonkiPanel phase={space.phase} data={space.data} />

        {state.phase === "loading" ? (
          <Panel>
            <p className="muted" role="status">
              Loading the radiation snapshot…
            </p>
          </Panel>
        ) : null}

        {state.phase === "missing" || !panel ? (
          state.phase === "loading" ? null : (
            <Panel title="Snapshot not published yet" labelledBy="rad-missing">
              <EmptyState title="No radiation data available">
                <p>
                  This panel reads <code>public/data/radiation.json</code>. It has not been
                  published in this build, so TETHER shows nothing rather than estimating a dose.
                </p>
              </EmptyState>
            </Panel>
          )
        ) : (
          <>
            <p className="chips">
              <Chip tone={labelTone}>{panel.label}</Chip>
              <Chip tone="quiet">{panel.channel ?? "channel not recorded"}</Chip>
              <Chip tone="quiet">GOES-{panel.satellite ?? "?"}</Chip>
              <Chip tone="quiet">
                {panel.synthetic ? "synthetic replay" : "Archived snapshot · not live"}
              </Chip>
              {panel.unitsContracted ? null : <Chip tone="warn">units are not pfu</Chip>}
              {panel.labelConflict ? (
                <Chip tone="warn" title={panel.labelConflict}>
                  label conflict → unverified
                </Chip>
              ) : null}
            </p>

            <Panel title="Latest sample in snapshot" labelledBy="rad-now">
              <dl className="tiles tiles--3">
                <div className="tile">
                  <dt>Latest archived flux</dt>
                  <dd>{panel.current ? formatFlux(panel.current.flux, unit) : "—"}</dd>
                </div>
                <div className="tile">
                  <dt>Peak in window</dt>
                  <dd>{panel.peak ? formatFlux(panel.peak.flux, unit) : "—"}</dd>
                </div>
                <div className="tile">
                  <dt>S-scale latest / max</dt>
                  <dd>
                    {sScaleLabel(panel.sScaleNow)} / {sScaleLabel(panel.sScaleMax)}
                  </dd>
                </div>
                <div className="tile">
                  <dt>Latest sample</dt>
                  <dd>{panel.current ? formatTs(panel.current.ts) : "—"}</dd>
                </div>
                <div className="tile">
                  <dt>Peak sample</dt>
                  <dd>{panel.peak ? formatTs(panel.peak.ts) : "—"}</dd>
                </div>
                <div className="tile">
                  <dt>Units</dt>
                  <dd>{panel.units ?? "—"}</dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Integral proton flux" labelledBy="rad-chart">
              <FluxChart panel={panel} />
              <ScaleStrip panel={panel} />
            </Panel>

            <Panel title="Provenance" labelledBy="rad-provenance">
              <dl className="provenance">
                <div>
                  <dt>Source</dt>
                  <dd>{panel.source}</dd>
                </div>
                <div>
                  <dt>Source URL</dt>
                  <dd>
                    {panel.sourceUrl ? (
                      <a href={panel.sourceUrl} target="_blank" rel="noreferrer noopener">
                        {panel.sourceUrl}
                      </a>
                    ) : (
                      "not recorded"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Retrieved</dt>
                  <dd>{panel.retrievedAt ? formatTs(panel.retrievedAt) : "not recorded"}</dd>
                </div>
                <div>
                  <dt>License</dt>
                  <dd>{panel.license ?? "not recorded"}</dd>
                </div>
                <div>
                  <dt>Label</dt>
                  <dd>
                    {panel.label}
                    {panel.labelConflict ? (
                      <>
                        {" · "}
                        <span className="small">unverified: {panel.labelConflict}</span>
                      </>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt>Checksum trail</dt>
                  <dd>
                    <code>data/snapshots/manifest.json</code>
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Why this panel exists" labelledBy="rad-why">
              {panel.why ? <p>{panel.why}</p> : null}
              <ul className="plain-list plain-list--warn">
                <li>
                  {panel.note ??
                    "Context only: space weather modulates wording and priors, it never raises an alert by itself."}
                </li>
                <li>
                  No dose limit is hard-coded here, and the panel never changes a crew member&apos;s
                  urgency level.
                </li>
                <li>
                  One satellite channel at one instant; a real radiation assessment needs dosimetry
                  and shielding models this tablet does not carry.
                </li>
              </ul>
              <RawDetails data={{ ...panel, points: `${panel.points.length} samples` }} />
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
