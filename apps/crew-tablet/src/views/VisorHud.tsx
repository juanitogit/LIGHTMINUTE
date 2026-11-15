import { useEffect, useMemo, useState } from "react";
import type { LoadedScenario } from "../lib/types";
import { SurfaceScene, type SurfaceBody } from "./SurfaceScene";
import { Icon } from "../components/Icon";
import { Chip, LevelBadge } from "../components/primitives";
import { useDictation } from "../hooks/useDictation";
import { useVisorSpeech } from "../hooks/useVisorSpeech";
import { detectSpeechLang } from "../lib/kokoro";
import { askVisorAssistant, localGroundedAnswer, snapshotSummary, type VisorSnapshot } from "../lib/visorAssistant";
import { MARKER_POINTS, formatMetric, metricTone, metricWord, nasaCaseForDoc } from "../lib/nasaCases";
import "../hud-visor.css";

interface VisorHudProps {
  scenario?: LoadedScenario | null;
  dayNumber: number;
  crewId: string;
  crewIds: string[];
  onCrew: (id: string) => void;
  onDay: (day: number) => void;
  maxDay: number;
  onOpenTablet: () => void;
  /** Which surface the helmet is looking at. */
  body?: SurfaceBody;
  /** The lunar page reuses the whole HUD without the mission controls. */
  hideControls?: boolean;
  heading?: { micro: string; title: string; sub: string };
}

const CREW_NAMES: Record<string, string> = {
  A: "A · Oficial Médico (CMO)",
  B: "B · Comandante (CDR)",
  C: "C · Esp. Misión 1 (MS1)",
  D: "D · Esp. Misión 2 (MS2)",
};

export function VisorHud({
  scenario,
  dayNumber,
  crewId,
  crewIds,
  onCrew,
  onDay,
  maxDay,
  onOpenTablet,
  body = "mars",
  hideControls = false,
  heading,
}: VisorHudProps) {
  const [solarShield, setSolarShield] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerSource, setAnswerSource] = useState("");
  const [asking, setAsking] = useState(false);
  const speech = useVisorSpeech();

  // Auto-play through mission days
  useEffect(() => {
    if (!autoPlay) return;
    const interval = window.setInterval(() => {
      onDay(dayNumber >= maxDay ? 1 : dayNumber + 1);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [autoPlay, dayNumber, maxDay, onDay]);

  // Extract day and member telemetry
  const dayEntry = scenario?.doc?.days?.find((d) => d.day === dayNumber);
  const member = dayEntry?.crew?.[crewId];
  const ind = member?.indicators;

  // Real readings from scenario or realistic nominal baselines
  const hr = ind?.rest_hr?.value ?? 64.0;
  const temp = ind?.temp_c?.value ?? 36.65;
  const sleep = ind?.sleep_h?.value ?? 7.4;
  const pvt = ind?.pvt_ms?.value ?? 270;
  const co2 = ind?.co2_ppm?.value ?? 820;
  const headache = ind?.headache_score?.value ?? 0;

  // The active NASA case decides which metric earns a fixed HUD row.
  const caseMeta = nasaCaseForDoc(scenario?.doc);
  const metric = caseMeta?.critical;
  const metricValue = metric ? ind?.[metric.key]?.value : undefined;
  const metricLevel = metric ? metricTone(metric, metricValue) : "normal";
  const metricColor = metricLevel === "alert" ? "#ff4a36" : metricLevel === "watch" ? "#ffe27a" : "#e8a321";
  const metricRatio = metric && typeof metricValue === "number" && Number.isFinite(metricValue)
    ? Math.min(100, Math.max(0, (metricValue / metric.barMax) * 100))
    : 0;
  const markerPoint = caseMeta?.marker ? MARKER_POINTS[caseMeta.marker.site] : undefined;

  // Severity level determination (l0: routine, l1: watch, l2: act/escalate)
  const levelClass = useMemo(() => {
    const lvl = member?.level ?? "info";
    if (lvl === "act" || lvl === "escalate") return "l2";
    if (lvl === "watch") return "l1";
    return "l0";
  }, [member?.level]);

  const isAlarm = levelClass === "l2";

  // Global integrity score calculation (0 - 100)
  const integrityScore = useMemo(() => {
    let score = 98;
    if (member?.syndrome_z) {
      score -= Math.min(65, Math.abs(member.syndrome_z) * 14);
    }
    if (hr > 95 || hr < 48) score -= 12;
    if (temp > 37.8) score -= 15;
    if (sleep < 5.0) score -= 10;
    if (pvt > 340) score -= 8;
    if (co2 > 4000) score -= 12;
    return Math.max(20, Math.min(100, Math.round(score)));
  }, [member?.syndrome_z, hr, temp, sleep, pvt, co2]);

  // Radiation from scenario SEP event
  const isSep = Boolean(scenario?.doc?.scenario?.toLowerCase().includes("sep") ?? scenario?.doc?.name?.toLowerCase().includes("sep"));
  const sScale = !isSep || dayNumber < 12 ? 0 : dayNumber <= 14 ? 3 : dayNumber <= 16 ? 2 : 1;
  const radPfu = isSep && dayNumber >= 12 ? 240.0 : 4.5;

  // Rulers positioning percentages
  const hrMin = 40, hrMax = 140;
  const hrPct = Math.max(0, Math.min(100, ((hr - hrMin) / (hrMax - hrMin)) * 100));

  const tMin = 35.5, tMax = 39.0;
  const tPct = Math.max(0, Math.min(100, ((temp - tMin) / (tMax - tMin)) * 100));

  // Organ glow states
  const brainStrain = pvt > 330 || headache >= 2;
  const heartStrain = hr > 90 || hr < 50;
  const lungStrain = co2 > 3500;
  const liverStrain = temp > 37.5;
  const jugularStrain = ind?.jugular_flow_vel ? ind.jugular_flow_vel.value < 2.0 : false;

  const organColor = (strained: boolean) =>
    strained ? (isAlarm ? "#ff4a36" : "#ffe27a") : "#e8a321";

  // Days list for tape
  const days = useMemo(() => {
    return Array.from({ length: Math.min(30, maxDay) }, (_, i) => i + 1);
  }, [maxDay]);

  // Exactly the values drawn on this page: the assistant may repeat them, never add any.
  const snapshot = useMemo<VisorSnapshot>(() => ({
    page: heading?.title ?? (body === "moon" ? "Entorno Lunar (Visor)" : "Visor EVA (HUD)"),
    body,
    scenario: String(scenario?.doc?.name ?? scenario?.doc?.scenario ?? "escenario sin nombre"),
    crew: crewId,
    day: dayNumber,
    max_day: maxDay,
    level: member?.level ?? "info",
    integrity_score: integrityScore,
    heart_rate_bpm: hr,
    core_temp_c: temp,
    sleep_h: sleep,
    pvt_ms: pvt,
    co2_ppm: co2,
    headache_0_10: headache,
    radiation_scale: sScale,
    radiation_pfu: radPfu,
    headline: member?.card?.headline ?? null,
  }), [body, heading?.title, scenario?.doc?.name, scenario?.doc?.scenario, crewId, dayNumber, maxDay, member?.level, member?.card?.headline, integrityScore, hr, temp, sleep, pvt, co2, headache, sScale, radPfu]);

  async function ask(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setQuestion(clean);
    setAsking(true);
    setAnswer("");
    setAnswerSource("");
    try {
      const reply = await askVisorAssistant(clean, snapshot, detectSpeechLang(clean));
      setAnswer(reply.answer);
      setAnswerSource(`Groq · ${reply.model}`);
      void speech.speak(reply.answer);
    } catch (error) {
      // No key, no network or a rejected request: answer from the page's own fields.
      const fallback = localGroundedAnswer(clean, snapshot);
      setAnswer(fallback);
      setAnswerSource(`${error instanceof Error ? error.message : "LLM no disponible"} Respuesta determinista con los valores de esta página.`);
      void speech.speak(fallback);
    } finally {
      setAsking(false);
    }
  }

  const dictation = useDictation((text) => void ask(text));

  return (
    <div className="view visor-view">
      <header className="viewhead">
        <div>
          <p className="micro">{heading?.micro ?? "LIGHTMINUTE / VISOR EXTRAVEHICULAR (EVA)"}</p>
          <h1>{heading?.title ?? "Visor EVA (HUD de Casco)"}</h1>
          <p className="viewhead__sub">
            {heading?.sub ??
              "Simulación de visualización integrada en el casco de un traje de superficie marciana. Constantes vitales sobre el terreno real de Marte, escaneo orgánico fisiológico y supervisión sin retardo."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {onOpenTablet ? (
            <button type="button" className="btn" onClick={onOpenTablet}>
              <Icon name="overview" size={16} /> Volver a resumen
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          </button>
        </div>
      </header>

      {/* Simulator Interactive Controls */}
      {hideControls ? null : (
      <section className="panel">
        <div className="visor-controls-grid">
          {/* Crew Selector */}
          <div className="field">
            <span className="micro">Tripulante monitoreado</span>
            <div className="crew-selector">
              {crewIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`crew-choice ${id === crewId ? "is-active" : ""}`}
                  onClick={() => onCrew(id)}
                >
                  {id} · {CREW_NAMES[id]?.split(" · ")[1] ?? id}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Scrubber */}
          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="micro">Línea temporal de misión</span>
              <span className="mono small">
                Día <strong>{String(dayNumber).padStart(2, "0")}</strong> de {maxDay}
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn--tiny"
                onClick={() => setAutoPlay(!autoPlay)}
                title="Auto-reproducción"
              >
                <Icon name={autoPlay ? "pause" : "play"} size={14} />
                {autoPlay ? "Pausa" : "Simular"}
              </button>
              <input
                type="range"
                min={1}
                max={maxDay}
                value={dayNumber}
                onChange={(e) => onDay(Number(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Visor Optical Shield Toggle */}
          <div className="field">
            <span className="micro">Óptica de visor EVA</span>
            <button
              type="button"
              className="btn btn--tiny"
              onClick={() => setSolarShield(!solarShield)}
            >
              <Icon name="sun" size={14} />
              {solarShield ? "Escudo solar: Oro / Ámbar (EVA)" : "Filtro: Neutro claro"}
            </button>
          </div>
        </div>
      </section>
      )}

      {/* Main Helmet HUD Stage */}
      <section className="panel">
        <div className="panel__head">
          <h2>Proyección de telemetría en casco</h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <LevelBadge level={member?.level ?? "info"} />
            <Chip tone={integrityScore >= 80 ? "accent" : "warn"}>
              Integridad {integrityScore}%
            </Chip>
          </div>
        </div>

        <div className={`visor-viewport ${isFullscreen ? "is-fullscreen" : ""} ${levelClass} ${isAlarm ? "alarm" : ""}`}>
          {/* 1. Real Mars surface (NASA panorama + 3D ground, rocks and dust) */}
          <div className="hud-scene-bg">
            <SurfaceScene body={body} />
          </div>

          {/* 2. Amber/Gold Solar Shield Visor Optical Coating */}
          <div className={`hud-visor-filter ${solarShield && body === "mars" ? "" : "is-disabled"}`} />

          {/* 3. Vignette and Emergency Alarm Glow */}
          <div className="hud-vignette" />
          <div className="hud-alarm" />

          {/* 4. Fullscreen Exit Action (when in fullscreen) */}
          {isFullscreen && (
            <button
              type="button"
              className="hud-fs-exit-btn"
              onClick={() => setIsFullscreen(false)}
            >
              ✕ Salir de pantalla completa
            </button>
          )}

      {/* 5. Helmet Outer Curvature Framing */}
      <svg className="hud-corner cl" viewBox="0 0 300 150" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 10C90 10 200 40 262 150H0Z" fill="#000" fillOpacity=".65" />
        <path className="hud-ln" d="M0 10C90 10 200 40 262 150" />
        <path className="hud-ln hud-dim" d="M0 24C84 24 184 52 238 150" />
      </svg>
      <svg className="hud-corner cr" viewBox="0 0 300 150" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 10C90 10 200 40 262 150H0Z" fill="#000" fillOpacity=".65" />
        <path className="hud-ln" d="M0 10C90 10 200 40 262 150" />
        <path className="hud-ln hud-dim" d="M0 24C84 24 184 52 238 150" />
      </svg>
      <svg className="hud-tc" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0H130C50 0 0 30 0 100Z" fill="#000" fillOpacity=".58" />
        <path className="hud-ln" d="M0 100C0 30 50 0 130 0" />
        <path className="hud-ln hud-dim" d="M0 78C4 34 52 8 120 0" />
      </svg>
      <svg className="hud-tc r" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0H130C50 0 0 30 0 100Z" fill="#000" fillOpacity=".58" />
        <path className="hud-ln" d="M0 100C0 30 50 0 130 0" />
        <path className="hud-ln hud-dim" d="M0 78C4 34 52 8 120 0" />
      </svg>

      {/* 6. Top Bezel with CO2 Gauge and Mission Day Scroller */}
      <div id="hud-top">
        <svg viewBox="0 0 760 96" aria-hidden="true">
          <path
            d="M170 0H590C575 12 572 22 560 30H200C188 22 185 12 170 0Z"
            fill="#000"
            fillOpacity=".85"
            stroke="#e8a321"
            strokeWidth="1"
          />
          <path className="hud-ln" d="M20 30Q380 92 740 30" />
          <path className="hud-ln hud-dim" d="M60 28Q380 80 700 28" />
        </svg>

        {/* Suit CO2 Bar */}
        <div id="hud-co2">
          <span>CO₂ TRAJE</span>
          <div className="bk">
            <i style={{ width: `${Math.min(100, (co2 / 6000) * 100)}%` }} />
          </div>
          <span>{co2} PPM</span>
        </div>

        {/* Mission Day Tape */}
        <div id="hud-tape" aria-label="Línea de tiempo de días de misión">
          {days.map((d) => (
            <div
              key={d}
              className={d === dayNumber ? "cur" : ""}
              style={{
                left: `calc(50% + ${(d - dayNumber) * 44}px - 20px)`,
                cursor: "pointer",
              }}
              onClick={() => onDay(d)}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Alert Banner from Engine Decision Card */}
        {member?.card ? (
          <div id="hud-banner" className={`on ${levelClass}`} role="alert">
            {member.card.headline}
          </div>
        ) : null}
      </div>

      {/* 7. Dial: Global Physiological Integrity (Top-Left) */}
      <svg className="hud-abs" id="hud-dial" viewBox="-52 -52 104 104" aria-label="Integridad Global">
        <circle r="48" className="hud-ln hud-dim" />
        <circle r="44" className="hud-ln" />
        <path className="hud-ln hud-dim" d="M-44 0H44M0-44V44" />
        <circle r="30" className="hud-ln hud-dim" />
        <circle
          id="hud-arc"
          r="38"
          fill="none"
          stroke="var(--c)"
          strokeWidth="3"
          strokeDasharray="238.8"
          strokeDashoffset={238.8 - (238.8 * integrityScore) / 100}
          transform="rotate(-90)"
        />
        <line x1="0" y1="0" x2="0" y2="-30" stroke="var(--hud-a)" strokeWidth="1.4">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="9s"
            repeatCount="indefinite"
          />
        </line>
        <text y="7" textAnchor="middle" fontSize="20" fill="var(--c)">
          {integrityScore}
        </text>
        <text y="22" textAnchor="middle" fontSize="6" opacity=".5" fill="var(--c)">
          INTEGR.
        </text>
      </svg>
      <div className="hud-abs" id="hud-dial-label">
        INTEGRIDAD GLOBAL
      </div>

      {/* 8. Space Weather Panel (Top-Right) */}
      <div className="hud-abs" id="hud-rad">
        <span className="rad-title">CLIMA ESPACIAL</span>
        <b>S{sScale}</b>
        <span className="rad-sub">{radPfu.toFixed(1)} PFU (&gt;10 MeV)</span>
      </div>

      {/* 9. Lateral Vitals Rulers */}
      {/* Left Ruler: Heart Rate */}
      <div className="hud-ruler L">
        <div className="hud-rt">
          <span className="hud-rt-dot" />
          <span>FC CARDIACA</span>
        </div>
        <div className="hud-rb">
          <div className="hud-rg" style={{ bottom: "20%", height: "40%" }} title="Rango nominal 60-100" />
          <div className="hud-mk" style={{ bottom: `${hrPct}%` }}>
            <s />
            <span>
              {hr.toFixed(0)} <small>BPM</small>
            </span>
          </div>
        </div>
      </div>

      {/* Right Ruler: Core Temperature */}
      <div className="hud-ruler R">
        <div className="hud-rt">
          <span className="hud-rt-dot" />
          <span>TEMP CENTRAL</span>
        </div>
        <div className="hud-rb">
          <div className="hud-rg" style={{ bottom: "17%", height: "40%" }} title="Rango nominal 36.1-37.5" />
          <div className="hud-mk" style={{ bottom: `${tPct}%` }}>
            <s />
            <span>
              {temp.toFixed(1)} <small>°C</small>
            </span>
          </div>
        </div>
      </div>

      {/* 10. Center Reticle & Status */}
      <svg className="hud-abs" id="hud-ret" viewBox="-20 -20 40 40" aria-hidden="true">
        <path d="M0-9L8 0 0 9-8 0Z" stroke="var(--c)" fill="none" strokeWidth="1.2" />
        <circle r="14" stroke="var(--c)" fill="none" strokeWidth="1.2" strokeDasharray="2 5" />
        <path d="M-20 0H-16M16 0H20M0-20V-16M0 16V20" stroke="var(--c)" strokeWidth="1.2" />
      </svg>
      <div className="hud-abs" id="hud-det">
        {member?.level ? `ESTADO OPERATIVO: ${member.level.toUpperCase()}` : "TELEMETRÍA NOMINAL"}
      </div>

      {/* 11. Bottom-Left: Vital Signs & Rest Card */}
      <div className="hud-abs" id="hud-bl">
        <div id="hud-bl-title">
          {caseMeta ? `PERSONALIZADO · CASO ${caseMeta.number}` : "SIGNOS VITALES · REPOSO & COGNICIÓN"}
        </div>

        {/* Sleep */}
        <div className="hud-row">
          <div className="hud-row-info">
            <span className="hud-row-lbl">Sueño descanso</span>
            <b>{sleep.toFixed(1)} <small>H</small></b>
            <div className="hud-row-bar">
              <i style={{ width: `${Math.min(100, (sleep / 9.0) * 100)}%` }} />
            </div>
          </div>
          <span className="hud-row-status" />
        </div>

        {/* PVT Vigilance */}
        <div className="hud-row">
          <div className="hud-row-info">
            <span className="hud-row-lbl">Tiempo Reacción PVT</span>
            <b>{pvt.toFixed(0)} <small>MS</small></b>
            <div className="hud-row-bar">
              <i style={{ width: `${Math.min(100, (pvt / 500) * 100)}%` }} />
            </div>
          </div>
          <span className="hud-row-status" />
        </div>

        {/* The critical metric of the active NASA case replaces the fixed headache row. */}
        {metric && caseMeta ? (
          <div className={`hud-row hud-row--case ${metricLevel}`}>
            <div className="hud-row-info">
              <span className="hud-row-lbl">{metric.label}</span>
              <b style={{ color: metricColor, textShadow: `0 0 6px ${metricColor}` }}>
                {formatMetric(metric, metricValue)}
              </b>
              <div className="hud-row-bar">
                <i style={{ width: `${metricRatio}%`, background: metricColor, boxShadow: `0 0 4px ${metricColor}` }} />
              </div>
            </div>
            <span className="hud-row-tag" style={{ color: metricColor }}>{metricWord(metric, metricLevel)}</span>
          </div>
        ) : (
          <div className="hud-row">
            <div className="hud-row-info">
              <span className="hud-row-lbl">Cefalea autoreportada</span>
              <b>{headache.toFixed(0)} <small>/10</small></b>
              <div className="hud-row-bar">
                <i style={{ width: `${Math.min(100, (headache / 10) * 100)}%` }} />
              </div>
            </div>
            <span className="hud-row-status" />
          </div>
        )}
      </div>

      {/* 12. Bottom-Right: Humanoid Body Scanner & Organs */}
      <div className="hud-abs" id="hud-br">
        <span id="hud-br-title">ESCÁNER CORPORAL</span>

        <div className="hud-body-wrap">
        <svg className="hud-body" viewBox="0 0 100 220" aria-label="Modelo corporal con órganos monitoreados y punto de fijación del sensor">
          {/* Anatomical Outline */}
          <ellipse className="hud-outline" cx="50" cy="18" rx="13" ry="16" />
          <path className="hud-outline" d="M44 32 L44 40 Q50 42 56 40 L56 32" />
          <path
            className="hud-outline"
            d="M44 40 Q38 41 28 46 L22 48 Q18 50 19 56 L21 100 Q22 104 28 105 L35 106 Q38 108 38 112 L38 116 Q38 118 40 118 L42 118 Q44 116 44 112 L44 110 Q46 108 50 108 Q54 108 56 110 L56 112 Q56 116 58 118 L60 118 Q62 118 62 116 L62 112 Q62 108 65 106 L72 105 Q78 104 79 100 L81 56 Q82 50 78 48 L72 46 Q62 41 56 40 Q53 39 50 39 Q47 39 44 40 Z"
          />

          {/* Ribs & Spine */}
          <path className="hud-bone" d="M32 55 Q50 52 68 55 M31 61 Q50 58 69 61 M30 67 Q50 64 70 67" />
          <path className="hud-bone" d="M50 42 L50 108" strokeDasharray="2 3" />

          {/* Arms & Legs */}
          <rect className="hud-outline" x="13" y="44" width="12" height="32" rx="5" />
          <rect className="hud-outline" x="75" y="44" width="12" height="32" rx="5" />
          <rect className="hud-outline" x="34" y="118" width="14" height="34" rx="6" />
          <rect className="hud-outline" x="52" y="118" width="14" height="34" rx="6" />
          <rect className="hud-outline" x="35" y="156" width="12" height="32" rx="5" />
          <rect className="hud-outline" x="53" y="156" width="12" height="32" rx="5" />

          {/* Brain */}
          <path
            className={`hud-org ${brainStrain ? "f" : ""}`}
            style={{ stroke: organColor(brainStrain), fill: brainStrain ? organColor(brainStrain) : "none" }}
            d="M43 12 Q44 7 50 6 Q56 7 57 12 Q58 17 55 20 Q52 22 50 21 Q48 22 45 20 Q42 17 43 12Z"
          />

          {/* Jugular Veins */}
          <path
            style={{
              fill: "none",
              stroke: organColor(jugularStrain),
              strokeWidth: 1.8,
            }}
            d="M46 33 L46 40 M54 33 L54 40"
          />

          {/* Lungs */}
          <path
            className={`hud-org ${lungStrain ? "f" : ""}`}
            style={{ stroke: organColor(lungStrain), fill: lungStrain ? organColor(lungStrain) : "none" }}
            d="M36 52 Q28 54 26 65 Q24 76 27 85 Q30 90 36 88 Q42 86 44 78 Q46 68 44 58 Q42 52 36 52Z"
          />
          <path
            className={`hud-org ${lungStrain ? "f" : ""}`}
            style={{ stroke: organColor(lungStrain), fill: lungStrain ? organColor(lungStrain) : "none" }}
            d="M64 52 Q72 54 74 65 Q76 76 73 85 Q70 90 64 88 Q58 86 56 78 Q54 68 56 58 Q58 52 64 52Z"
          />

          {/* Heart */}
          <path
            className={`hud-org ${heartStrain ? "f" : ""}`}
            style={{ stroke: organColor(heartStrain), fill: heartStrain ? organColor(heartStrain) : "none" }}
            d="M50 72 Q44 64 38 68 Q34 72 38 79 Q42 85 50 92 Q58 85 62 79 Q66 72 62 68 Q56 64 50 72Z"
          />

          {/* Liver */}
          <path
            className={`hud-org ${liverStrain ? "f" : ""}`}
            style={{ stroke: organColor(liverStrain), fill: liverStrain ? organColor(liverStrain) : "none" }}
            d="M55 90 Q65 88 72 92 Q76 96 74 102 Q72 106 64 106 Q56 106 54 100 Q52 94 55 90Z"
          />

          {/* Kidneys */}
          <ellipse cx="37" cy="97" rx="5" ry="7" stroke="var(--hud-a)" fill="none" strokeWidth="1" />
          <ellipse cx="63" cy="97" rx="5" ry="7" stroke="var(--hud-a)" fill="none" strokeWidth="1" />

          {/* Scanning Beam Animation */}
          <rect
            className="hud-scan-beam"
            x="19"
            y="4"
            width="62"
            height="2"
            rx="1"
            fill="var(--c)"
            opacity="0.6"
          />

          {/* Case sensor fixation point: eyes for SANS, neck for jugular stasis, etc. */}
          {markerPoint ? (
            <g
              className={`hud-crosshair ${metricLevel}`}
              transform={`translate(${markerPoint.x} ${markerPoint.y})`}
              style={{ color: metricColor }}
            >
              <circle className="hud-xh-pulse" r="10" />
              <circle className="hud-xh-ring" r="4.6" />
              <path className="hud-xh-lines" d="M-13 0h6M7 0h6M0-13v6M0 7v6" />
              <line className="hud-xh-lead" x1="0" y1="0" x2="26" y2="-14" />
            </g>
          ) : null}
        </svg>
        {caseMeta?.marker && markerPoint ? (
          <span
            className={`hud-xh-label ${metricLevel}`}
            style={{ top: `${(markerPoint.y / 220) * 100}%`, color: metricColor }}
          >
            {caseMeta.marker.label}
          </span>
        ) : null}
        </div>

        <div>
          <div className="t">ESTADO ORGÁNICO</div>
          <div className="n">{integrityScore}%</div>
          <div className="hud-seg">
            <b style={{ opacity: integrityScore > 20 ? 1 : 0.2 }} />
            <b style={{ opacity: integrityScore > 40 ? 1 : 0.2 }} />
            <b style={{ opacity: integrityScore > 60 ? 1 : 0.2 }} />
            <b style={{ opacity: integrityScore > 80 ? 1 : 0.2 }} />
            <b style={{ opacity: integrityScore > 90 ? 1 : 0.2 }} />
          </div>
        </div>
      </div>

        </div>

        <div className="visor-stage-footer">
          <div className="overview-context" style={{ margin: 0 }}>
            <span>FC: <strong className="mono">{hr.toFixed(0)} bpm</strong></span>
            <span>Temp: <strong className="mono">{temp.toFixed(1)} °C</strong></span>
            <span>CO₂ traje: <strong className="mono">{co2} ppm</strong></span>
            <span>Sueño: <strong className="mono">{sleep.toFixed(1)} h</strong></span>
            <span>PVT: <strong className="mono">{pvt.toFixed(0)} ms</strong></span>
            <span>Radiación: <strong className="mono">S{sScale} ({radPfu.toFixed(1)} pfu)</strong></span>
          </div>
          <span className="micro muted">
            LIGHTMINUTE · SIMULACIÓN DE CASCO EVA · DATOS SINTÉTICOS · NO ES UN DISPOSITIVO MÉDICO
          </span>
        </div>
      </section>

      <section className="panel" aria-labelledby="visor-voice">
        <div className="panel__head">
          <h2 id="visor-voice">Asistente de voz del visor</h2>
          <span className="small muted">
            {speech.engine === "kokoro" ? "Kokoro TTS" : speech.engine === "browser" ? "Voz del sistema" : "Español/inglés automático"}
          </span>
        </div>
        <p className="small muted">
          Responde solo con los valores que muestra esta página (día, tripulante, telemetría y clima espacial).
          El motor determinista decide los números; el asistente solo los explica, sin diagnóstico ni cifras nuevas.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <button type="button" className="btn" onClick={() => void speech.speak(snapshotSummary(snapshot))} disabled={speech.status !== "idle"}>
            Escuchar resumen
          </button>
          {dictation.supported ? (
            <button type="button" className="btn" onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}>
              {dictation.listening ? "Detener dictado" : "Preguntar por voz"}
            </button>
          ) : null}
          {speech.status !== "idle" ? (
            <button type="button" className="btn" onClick={speech.stop}>Detener voz</button>
          ) : null}
          {speech.status === "preparing" ? <span className="small muted">Preparando Kokoro…</span> : null}
        </div>
        <p className="small muted">
          Kokoro sintetiza inglés y la voz del sistema el español; el motor se elige solo según el texto.
          La primera reproducción descarga el modelo en este equipo.
        </p>
        <form className="stack" onSubmit={(event) => { event.preventDefault(); void ask(question); }} style={{ marginTop: "14px" }}>
          <label className="field">Pregunta al asistente
            <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={300} placeholder="¿Cómo está el CO₂ del traje hoy?" />
          </label>
          <button type="submit" className="btn btn--primary" disabled={asking || !question.trim()}>
            {asking ? "Consultando…" : "Preguntar"}
          </button>
        </form>
        {dictation.status ? <p className="small muted" role="status">{dictation.status}</p> : null}
        {speech.message ? <p className="small muted" role="status">{speech.message}</p> : null}
        {answer ? (
          <article style={{ marginTop: "14px" }}>
            <p className="micro">{answerSource}</p>
            <p role="status">{answer}</p>
          </article>
        ) : null}
      </section>

      {/* 5-Organ Physiological Systems Evaluation */}
      <section className="panel">
        <div className="panel__head">
          <h2>Evaluación fisiológica por subsistemas (EVA)</h2>
          <span className="small muted">Algoritmos deterministas N-de-1 de referencia personal</span>
        </div>

        <div className="hud-organs-grid">
          {/* 1. Brain / Neurological */}
          <div className="hud-organ-card">
            <div className="hud-organ-card__head">
              <h3>Cerebro y Cognición</h3>
              <span className={`status-label status-label--${brainStrain ? "act" : "info"}`}>
                {brainStrain ? "Sobrecarga" : "Nominal"}
              </span>
            </div>
            <div className="val">{pvt.toFixed(0)} <small className="mono">ms</small></div>
            <p className="desc">
              Tiempo de reacción psicomotora (PVT) y cefalea reportada ({headache.toFixed(0)}/10). Sensible a congestión cefálica (SANS) e hipoxia.
            </p>
          </div>

          {/* 2. Cardiovascular */}
          <div className="hud-organ-card">
            <div className="hud-organ-card__head">
              <h3>Sistema Cardiovascular</h3>
              <span className={`status-label status-label--${heartStrain ? "act" : "info"}`}>
                {heartStrain ? "Desviación" : "Nominal"}
              </span>
            </div>
            <div className="val">{hr.toFixed(0)} <small className="mono">bpm</small></div>
            <p className="desc">
              Frecuencia cardíaca en reposo y evaluación de flujo venoso yugular interno (IJV) para detección temprana de estasis o trombosis.
            </p>
          </div>

          {/* 3. Respiratory */}
          <div className="hud-organ-card">
            <div className="hud-organ-card__head">
              <h3>Respiratorio y Traje</h3>
              <span className={`status-label status-label--${lungStrain ? "act" : "info"}`}>
                {lungStrain ? "Atención CO₂" : "Nominal"}
              </span>
            </div>
            <div className="val">{co2} <small className="mono">ppm</small></div>
            <p className="desc">
              Presión parcial de CO₂ en bucle de respiración de traje lunar. Prevención de hipercapnia e incremento de presión intracraneal.
            </p>
          </div>

          {/* 4. Thermal */}
          <div className="hud-organ-card">
            <div className="hud-organ-card__head">
              <h3>Termorregulación Central</h3>
              <span className={`status-label status-label--${liverStrain ? "act" : "info"}`}>
                {liverStrain ? "Hipertermia" : "Nominal"}
              </span>
            </div>
            <div className="val">{temp.toFixed(1)} <small className="mono">°C</small></div>
            <p className="desc">
              Temperatura central de reposo circadiana. Indicador precoz de respuesta inmunitaria activa o sobrecalentamiento metabólico en EVA.
            </p>
          </div>

          {/* 5. Rest / Sleep */}
          <div className="hud-organ-card">
            <div className="hud-organ-card__head">
              <h3>Recuperación y Sueño</h3>
              <span className={`status-label status-label--${sleep < 6 ? "watch" : "info"}`}>
                {sleep < 6 ? "Deuda de sueño" : "Adecuado"}
              </span>
            </div>
            <div className="val">{sleep.toFixed(1)} <small className="mono">h</small></div>
            <p className="desc">
              Horas acumuladas de sueño vigilia. Monitoreo del ritmo circadiano frente a alteraciones de luz solar rasante en superficie lunar.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
