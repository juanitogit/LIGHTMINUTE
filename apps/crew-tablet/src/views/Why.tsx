import { useState } from "react";
import { BandChart, type BandPoint } from "../components/BandChart";
import { CrewSelector } from "../components/CrewSelector";
import { Icon } from "../components/Icon";
import { LevelBadge, Panel } from "../components/primitives";
import { SyndromeStrip, SYNDROME_ALERT_Z } from "../components/SyndromeStrip";
import { generatePersonalBaselinePdf } from "../lib/baselinePdfGenerator";
import { earthIsDemoParameter, earthRangeText, earthRule } from "../lib/earth";
import { fmt, fmtRange, humanise, unitLabel } from "../lib/format";
import {
  crewRoles,
  DISAGREEMENT_PATTERNS,
  EARTH_LABEL,
  indicatorMeta,
  INDICATORS,
  PATTERN_COPY,
  PERSONAL_LABEL,
  SPACE_LABEL,
} from "../lib/meta";
import type { LoadedScenario } from "../lib/types";

const WINDOW = 14;

export function Why({
  scenario,
  dayNumber,
  crewId,
  crewIds,
  indicator,
  onIndicator,
  onCrew,
  onOpenAct,
}: {
  scenario: LoadedScenario;
  dayNumber: number;
  crewId: string;
  crewIds: string[];
  indicator: string;
  onIndicator: (key: string) => void;
  onCrew: (id: string) => void;
  onOpenAct: () => void;
}) {
  const day = scenario.doc.days.find((d) => d.day === dayNumber) ?? scenario.doc.days[0];
  const member = day?.crew?.[crewId];
  const reading = member?.indicators?.[indicator];
  const baseMeta = indicatorMeta(indicator);
  // Unit comes from the payload; the static meta only supplies labels/decimals.
  const meta = { ...baseMeta, unit: reading?.unit ?? baseMeta.unit };
  const card = member?.card;
  const role = crewRoles(scenario.doc)[crewId];

  const windowDays = scenario.doc.days.filter((d) => d.day <= dayNumber).slice(-WINDOW);
  const points: BandPoint[] = windowDays.map((d) => ({
    day: d.day,
    reading: d.crew?.[crewId]?.indicators?.[indicator],
  }));
  const syndrome = windowDays
    .map((d) => ({ day: d.day, z: d.crew?.[crewId]?.syndrome_z ?? NaN }))
    .filter((p) => Number.isFinite(p.z));

  const pattern = reading?.lens?.pattern ?? "";
  const disagrees = DISAGREEMENT_PATTERNS.has(pattern);
  const earth = earthRule(indicator, reading);
  const earthDemo = earthIsDemoParameter(earth);

  const indicators =
    scenario.doc.indicators && scenario.doc.indicators.length > 0
      ? scenario.doc.indicators
      : INDICATORS.map((m) => m.key);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<{ filename: string; url: string; sizeKb: number } | null>(null);

  const handleExportPdf = async () => {
    if (!reading) return;
    setIsExportingPdf(true);
    try {
      const result = await generatePersonalBaselinePdf({
        scenario,
        dayNumber,
        crewId,
        indicator,
        meta,
        reading,
        earth,
        member,
        points,
        syndrome,
      });
      result.download();
      setPdfNotice({
        filename: result.filename,
        url: result.url,
        sizeKb: Math.round(result.sizeBytes / 1024),
      });
    } catch (err) {
      console.error("Failed to generate PDF report:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="view why">
      <header className="viewhead">
        <div>
          <p className="micro">Why · 10 seconds</p>
          <h1>
            Crew {crewId} · {meta.label}
          </h1>
          <p className="viewhead__sub">{meta.blurb} Personal band, Earth line and the lens verdicts.</p>
        </div>
        <div className="viewhead__tools">
          <CrewSelector crewIds={crewIds} crew={crewId} onCrew={onCrew} />
          {role ? <span className="chip chip--quiet">{role}</span> : null}
          {member ? <LevelBadge level={member.level} /> : null}
          {reading ? (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              title="Generate and download the personal baseline PDF report"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                minHeight: "36px",
                padding: "0 12px",
                fontSize: "13px",
              }}
            >
              <Icon name="chart" size={15} />
              <span>{isExportingPdf ? "Generating..." : "Export Baseline PDF"}</span>
            </button>
          ) : null}
        </div>
      </header>

      {pdfNotice ? (
        <div
          className="pattern pattern--loud"
          style={{
            background: "rgba(16, 185, 129, 0.12)",
            borderColor: "rgba(16, 185, 129, 0.4)",
            color: "#34d399",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Icon name="check" size={18} />
            <div>
              <p className="pattern__title" style={{ color: "#34d399", margin: 0 }}>
                Baseline Report PDF Generated ({pdfNotice.sizeKb} KB)
              </p>
              <p className="pattern__body" style={{ margin: "2px 0 0 0", color: "#a7f3d0" }}>
                File downloaded: <span className="mono">{pdfNotice.filename}</span>
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <a
              href={pdfNotice.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost"
              style={{
                minHeight: "28px",
                padding: "2px 10px",
                fontSize: "12px",
                color: "#34d399",
                border: "1px solid rgba(16, 185, 129, 0.4)",
              }}
            >
              Open in New Tab <Icon name="arrow" size={12} />
            </a>
            <button
              type="button"
              onClick={() => setPdfNotice(null)}
              style={{
                background: "none",
                border: "none",
                color: "#34d399",
                cursor: "pointer",
                padding: "4px",
                display: "inline-flex",
                alignItems: "center",
              }}
              title="Dismiss"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="ind-grid" role="group" aria-label="Choose an indicator">
        {indicators.map((key) => {
          const m = indicatorMeta(key);
          const r = member?.indicators?.[key];
          const active = key === indicator;
          return (
            <button
              key={key}
              type="button"
              className={`ind-tab ${active ? "is-active" : ""}`}
              aria-pressed={active}
              onClick={() => onIndicator(key)}
            >
              <span className="ind-tab__label">{m.short}</span>
              <span className="ind-tab__value">
                {r ? fmt(r.value, m.decimals) : "—"}{" "}
                <span className="ind-tab__unit">{unitLabel(r?.unit ?? m.unit)}</span>
              </span>
              <span className={`ind-tab__verdict ind-tab__verdict--${r?.lens?.personal ?? "no_rule"}`}>
                {PERSONAL_LABEL[r?.lens?.personal ?? "no_rule"] ?? "No verdict"}
              </span>
            </button>
          );
        })}
      </div>

      {!reading ? (
        <Panel>
          <p className="chart-empty">No {meta.label.toLowerCase()} reading on day {dayNumber}.</p>
        </Panel>
      ) : (
        <div className="why__grid">
          <div className="why__main">
            {disagrees ? (
              <div className="pattern pattern--loud" role="note">
                <Icon name="info" size={18} />
                <div>
                  <p className="pattern__title">{humanise(pattern)}</p>
                  <p className="pattern__body">{PATTERN_COPY[pattern]}</p>
                </div>
              </div>
            ) : null}

            <Panel
              title={`Your normal vs today · ${meta.unit}`}
              aside={<span className="mono small">last {windowDays.length} days</span>}
              labelledBy="band-title"
            >
              <BandChart points={points} selectedDay={dayNumber} meta={meta} earth={earth} />
            </Panel>

            <Panel
              title="Combined syndrome score"
              aside={<span className="mono small">alert line {SYNDROME_ALERT_Z}</span>}
              labelledBy="syndrome-title"
            >
              <SyndromeStrip series={syndrome} selectedDay={dayNumber} />
            </Panel>

            <div className="lenses">
              <div className="lens">
                <p className="micro">Lens 1 · Earth rule</p>
                <p className="lens__value">{EARTH_LABEL[reading.lens?.earth ?? ""] ?? "No rule"}</p>
                <p className="lens__note" title={earth?.source}>
                  {earth ? (
                    <>
                      {earthRangeText(earth, unitLabel(meta.unit), meta.decimals).replace(
                        /^./,
                        (c) => c.toUpperCase(),
                      )}
                      {" · "}
                      <span className={earthDemo ? "earth-status earth-status--demo" : "earth-status"}>
                        {earthDemo ? "demo parameter" : earth.status}
                      </span>
                    </>
                  ) : (
                    "No cited Earth range for this indicator — judge it on your own baseline."
                  )}
                </p>
              </div>
              <div className="lens">
                <p className="micro">Lens 2 · Space-adapted</p>
                <p className="lens__value">
                  {SPACE_LABEL[reading.lens?.space ?? ""] ?? "No verified rule yet"}
                </p>
                <p className="lens__note">
                  {reading.lens?.space === "no_rule" || !reading.lens?.space
                    ? "We show nothing rather than invent a threshold."
                    : "Rule applied by the engine."}
                </p>
              </div>
              <div className="lens">
                <p className="micro">Lens 3 · Your baseline</p>
                <p className="lens__value">
                  {PERSONAL_LABEL[reading.lens?.personal ?? ""] ?? "No estimate"}
                </p>
                <p className="lens__note">
                  {reading.ci95
                    ? `95% band ${fmtRange(reading.ci95, meta.decimals)} ${meta.unit}`
                    : "Band not available"}
                  {typeof reading.n_seen === "number" ? ` · ${reading.n_seen} days seen` : ""}
                </p>
              </div>
            </div>
          </div>

          <aside className="why__side">
            <Panel title="Today's reading" labelledBy="today-title">
              <p className="big-number">
                {fmt(reading.value, meta.decimals)}{" "}
                <span className="big-number__unit">{unitLabel(reading.unit ?? meta.unit)}</span>
              </p>
              <dl className="stats">
                <div>
                  <dt>Your 95% band</dt>
                  <dd>
                    {reading.ci95
                      ? `${fmtRange(reading.ci95, meta.decimals)} ${unitLabel(meta.unit)}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>z vs your baseline</dt>
                  <dd>{fmt(reading.z, 2)}</dd>
                </div>
                <div>
                  <dt>Days of data</dt>
                  <dd>{reading.n_seen ?? "—"}</dd>
                </div>
                <div>
                  <dt>Engine confidence</dt>
                  <dd>{card?.confidence ?? "—"}</dd>
                </div>
                <div>
                  <dt>HRP risk family</dt>
                  <dd>{humanise(reading.hrp_risk)}</dd>
                </div>
                <div>
                  <dt>Hazard</dt>
                  <dd>{humanise(reading.hazard)}</dd>
                </div>
              </dl>
              <div className="pattern-chiprow">
                <span className={`chip ${disagrees ? "chip--warn" : "chip--neutral"}`}>
                  pattern · {humanise(pattern)}
                </span>
                {typeof reading.p === "number" ? (
                  <span className="chip chip--quiet">p {reading.p.toFixed(3)}</span>
                ) : null}
              </div>
              {!disagrees && pattern ? (
                <p className="muted small">{PATTERN_COPY[pattern] ?? ""}</p>
              ) : null}
              <div style={{ marginTop: "14px", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
                <button
                  type="button"
                  className="btn btn--secondary btn--block"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  style={{ minHeight: "36px", fontSize: "13px" }}
                >
                  <Icon name="chart" size={15} />
                  <span>{isExportingPdf ? "Generating PDF..." : "Download Full PDF Report"}</span>
                </button>
              </div>
            </Panel>

            <Panel title="What to do" labelledBy="next-title">
              {card ? (
                <>
                  <p className="why__card-headline">{card.headline}</p>
                  <p className="muted small">
                    The engine already set urgency ({member?.level}); the card cannot lower it.
                  </p>
                  <button type="button" className="btn btn--primary btn--block" onClick={onOpenAct}>
                    Open decision card <Icon name="arrow" size={16} />
                  </button>
                </>
              ) : (
                <p className="muted">No decision card for this day.</p>
              )}
            </Panel>
          </aside>
        </div>
      )}
    </div>
  );
}
