/**
 * Investigation Case Scenarios – browser-engine synthetic generators.
 *
 * Six real NASA astronaut clinical cases from docs/investigacion_salud_astronautas.md
 * are reproduced here as labelled SYNTHETIC datasets.
 *
 * Rules:
 *  - Every value is generated deterministically; the engine decides numbers, not the UI.
 *  - Labels: synthetic · proxy · real-public (evidence citations only).
 *  - No diagnosis language. Citations reference KB IDs from kb/evidence.yaml.
 *  - LLM_PROVIDER=none compatible: runs entirely offline.
 *
 * Invariant: these names NEVER appear in scenario-index.json or the Python API.
 * The backend test `test_scenarios_lists_the_three_contract_names` is never broken.
 */

import type { ScenarioDoc, ScenarioDay, CrewDay, Reading, DecisionCard } from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Simple seeded LCG pseudo-random, deterministic. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    return (s >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Build a minimal Reading that satisfies the UI contract. */
function reading(
  value: number,
  baseline: number,
  unit: string,
  hrp_risk: string,
  hazard: string,
  z: number,
  options?: {
    earth?: string;
    space?: string;
    personal?: string;
    pattern?: string;
    n_seen?: number;
    unresolved_change?: boolean;
    earth_range?: [number, number];
  },
): Reading {
  const o = options ?? {};
  const p = 2 * (1 - Math.min(1, Math.abs(z)));
  return {
    value: parseFloat(value.toFixed(4)),
    baseline: parseFloat(baseline.toFixed(4)),
    ci95: [parseFloat((baseline - 1.5 * Math.abs(baseline * 0.08 + 1)).toFixed(2)),
           parseFloat((baseline + 1.5 * Math.abs(baseline * 0.08 + 1)).toFixed(2))],
    z: parseFloat(z.toFixed(3)),
    p: parseFloat(p.toFixed(4)),
    n_seen: o.n_seen ?? 0,
    change_pending: false,
    unresolved_change: o.unresolved_change ?? (Math.abs(z) > 2),
    pending_z: null,
    pending_p: null,
    unit,
    hrp_risk,
    hazard,
    lens: {
      earth: o.earth ?? "normal",
      space: o.space ?? "no_rule",
      personal: o.personal ?? (Math.abs(z) < 1.5 ? "normal" : "watch"),
      pattern: o.pattern ?? (Math.abs(z) > 2 ? "expected_for_you" : "concordant_alert"),
    },
    ...(o.earth_range ? { earth_range: o.earth_range } : {}),
  };
}

/** Build a minimal DecisionCard at a given urgency level. */
function card(
  level: "info" | "watch" | "act" | "escalate",
  headline: string,
  what_changed: string,
  why_it_matters: string,
  do_now: string[],
  monitor: string[],
  escalate_if: string[],
  ground_message: string,
  citations: string[],
): DecisionCard {
  return {
    level,
    headline,
    what_changed,
    why_it_matters,
    confidence: level === "info" ? "low" : level === "watch" ? "moderate" : "high",
    do_now,
    monitor,
    escalate_if,
    ground_message,
    citations,
  };
}

/** Routing: ISS Moon-proximity delay ~1.3 s round-trip. */
const ISS_ROUTING = {
  expected_reply_s: 2.6,
  act_onboard_first: false,
  send_now: false,
  priority: 3,
  message_budget_chars: 140,
};

/** Routing for Apollo/early missions: simulated. */
const MOON_ROUTING = {
  expected_reply_s: 2.6,
  act_onboard_first: true,
  send_now: false,
  priority: 2,
  message_budget_chars: 140,
};

/** Routing for deep confinement (Mir/Salyut): ISS-equivalent. */
const MIR_ROUTING = {
  expected_reply_s: 2.6,
  act_onboard_first: false,
  send_now: false,
  priority: 3,
  message_budget_chars: 140,
};

// ─── Case 1: SANS (ISS Exp 20 – Barratt / Thirsk) ───────────────────────────

function buildSansCrewDay(day: number, rand: () => number, member: "A" | "B" | "C" | "D"): CrewDay {
  const isAffected = member === "A";
  const onset = 4; // fluid shift builds from day 4
  const t = clamp((day - onset) / 10, 0, 1); // 0 → 1 progression

  const vision_near_delta = isAffected
    ? parseFloat(lerp(0.0, 1.8, t).toFixed(2)) + (rand() - 0.5) * 0.15
    : parseFloat(((rand() - 0.5) * 0.2).toFixed(2));

  const onsd_mm = isAffected
    ? parseFloat(lerp(4.8, 6.3, t).toFixed(2)) + (rand() - 0.5) * 0.1
    : parseFloat((4.9 + (rand() - 0.5) * 0.2).toFixed(2));

  const headache = isAffected ? parseFloat(lerp(0.5, 5.5, t * 0.8).toFixed(1)) + rand() * 0.5 : parseFloat((rand() * 1.2).toFixed(1));
  const rest_hr = isAffected ? parseFloat((72 + t * 8 + (rand() - 0.5) * 4).toFixed(1)) : parseFloat((65 + (rand() - 0.5) * 5).toFixed(1));
  const temp_c = parseFloat((36.6 + (rand() - 0.5) * 0.2).toFixed(2));
  const pvt_ms = isAffected ? parseFloat((270 + t * 60 + (rand() - 0.5) * 20).toFixed(0)) : parseFloat((255 + (rand() - 0.5) * 20).toFixed(0));

  const vision_z = isAffected ? parseFloat(lerp(0, 3.2, t).toFixed(2)) : (rand() - 0.5) * 0.6;
  const onsd_z = isAffected ? parseFloat(lerp(0, 2.5, t).toFixed(2)) : (rand() - 0.5) * 0.4;

  const urgencyLevel =
    isAffected && day > 10 ? "act" :
    isAffected && day > 6 ? "watch" : "info";

  return {
    level: urgencyLevel,
    syndrome_z: isAffected ? parseFloat(lerp(0, 2.8, t).toFixed(2)) : parseFloat(((rand() - 0.5) * 0.5).toFixed(2)),
    learning: day <= 3,
    indicators: {
      vision_near_delta: reading(vision_near_delta, 0.0, "diopters", "vision", "altered_gravity", vision_z,
        { earth: "normal", space: isAffected && day > 8 ? "high" : "normal", personal: day > 6 && isAffected ? "watch" : "normal",
          pattern: isAffected && day > 10 ? "expected_for_you" : "concordant_alert" }),
      onsd_mm: reading(onsd_mm, 4.9, "mm", "vision", "altered_gravity", onsd_z,
        { earth: onsd_mm > 5.8 ? "high" : "normal", earth_range: [4.0, 5.8] }),
      headache_score: reading(headache, 0.5, "0-10", "behavioral", "closed_environment", isAffected ? headache / 2 : 0,
        { earth: headache > 3 ? "high" : "normal" }),
      rest_hr: reading(rest_hr, 65, "bpm", "cardiovascular", "altered_gravity", (rest_hr - 65) / 6,
        { earth_range: [60, 100] }),
      temp_c: reading(temp_c, 36.6, "C", "immune", "altered_gravity", (temp_c - 36.6) / 0.3,
        { earth_range: [36.1, 37.5] }),
      pvt_ms: reading(pvt_ms, 255, "ms", "behavioral", "closed_environment", (pvt_ms - 255) / 25),
    },
    card: card(
      urgencyLevel,
      urgencyLevel === "act"
        ? "Visual shift above personal baseline — activate ocular monitoring protocol"
        : urgencyLevel === "watch"
        ? "Refractive shift building — increased monitoring warranted"
        : "Visual indicators within personal range",
      `Near-vision delta ${vision_near_delta.toFixed(2)} D; ONSD ${onsd_mm.toFixed(2)} mm vs pre-flight 4.9 mm.`,
      "Cephalad fluid shift in microgravity can progressively alter optic nerve sheath diameter and near-vision acuity. This is a known spaceflight risk (SANS); urgency is determined by personal trajectory, not a fixed threshold.",
      urgencyLevel === "act"
        ? ["Conduct full ocular ultrasound per sans_fluid_shift protocol", "Log headache score every 6 h", "Notify ground with today's ONSD reading"]
        : urgencyLevel === "watch"
        ? ["Repeat near-vision chart test at next scheduled check", "Document any new headache or pressure symptoms"]
        : ["Continue daily vision check per schedule"],
      ["ONSD trend", "Near-vision acuity", "Headache score", "Resting HR"],
      ["ONSD > 5.9 mm", "Sudden vision loss or blurring", "New papilledema signs"],
      `A SANS tracking: vision D ${vision_near_delta.toFixed(1)}, ONSD ${onsd_mm.toFixed(1)} mm. ${urgencyLevel === "act" ? "Protocol activated." : "Monitoring."}`,
      ["HRP-SANS-EVIDENCE", "HRP-RED-RISKS"],
    ),
    card_source: "template",
    routing: { ...ISS_ROUTING, send_now: urgencyLevel === "act", priority: urgencyLevel === "act" ? 1 : 3 },
    protocol_id: urgencyLevel === "act" ? "sans_fluid_shift" : undefined,
  };
}

function buildSansScenario(): ScenarioDoc {
  const days: ScenarioDay[] = [];
  for (let d = 1; d <= 14; d++) {
    days.push({
      day: d,
      attribution: { mode: "individual", affected: ["A"] },
      crew: {
        A: buildSansCrewDay(d, lcg(1001 + d), "A"),
        B: buildSansCrewDay(d, lcg(2001 + d), "B"),
        C: buildSansCrewDay(d, lcg(3001 + d), "C"),
        D: buildSansCrewDay(d, lcg(4001 + d), "D"),
      },
    });
  }
  return {
    synthetic: true,
    note: "Synthetic proxy data. Not a medical device. Modelled after Exp 20 SANS findings (Barratt/Thirsk). All values are generated, not personal health data.",
    name: "case_sans",
    scenario: "case_sans",
    title: "Caso 1: SANS — Alteraciones neuro-oculares (ISS Exp. 20, Barratt/Thirsk)",
    description: "Simulación sintética del Spaceflight-Associated Neuro-ocular Syndrome documentado en Expedición 20 de la ISS (2009). El redistribuido de fluidos cefálico en microgravedad produce un incremento progresivo del ONSD y un delta refractivo de visión cercana en el tripulante A (CMO).",
    variant: "investigation",
    delay_profile: "moon",
    crew: { A: { role: "CMO", label: "A – Crew Medical Officer" }, B: { role: "CDR", label: "B – Commander" }, C: { role: "MS1", label: "C – Mission Specialist 1" }, D: { role: "MS2", label: "D – Mission Specialist 2" } },
    crew_roles: { A: "CMO", B: "CDR", C: "MS1", D: "MS2" },
    indicators: ["vision_near_delta", "onsd_mm", "headache_score", "rest_hr", "temp_c", "pvt_ms"],
    meta: {
      title: "SANS – Síndrome Neuro-Ocular por Vuelo Espacial",
      summary: "Redistribución de fluidos cefálica en microgravedad. ONSD y visión próxima como indicadores tempranos. Protocolo: sans_fluid_shift.",
      protocol_id: "sans_fluid_shift",
      evidence_ids: ["HRP-SANS-EVIDENCE", "HRP-RED-RISKS"],
      mission: "ISS Expedición 20 (2009)",
      astronauts: "Michael Barratt, Robert Thirsk",
    },
    days,
  };
}

// ─── Case 2: Trombosis Yugular (ISS Exp 56/57 – Auñón-Chancellor) ───────────

function buildJugularCrewDay(day: number, rand: () => number, member: "A" | "B" | "C" | "D"): CrewDay {
  const isAffected = member === "A";
  const onset = 3;
  const t = clamp((day - onset) / 11, 0, 1);

  const jugular_flow = isAffected
    ? parseFloat(lerp(12.5, -2.5, t).toFixed(1)) + (rand() - 0.5) * 1.0
    : parseFloat((14.0 + (rand() - 0.5) * 2.0).toFixed(1));

  const d_dimer = isAffected
    ? Math.round(lerp(280, 950, t)) + Math.round((rand() - 0.5) * 60)
    : Math.round(250 + rand() * 60);

  const rest_hr = isAffected ? parseFloat((74 + t * 10 + (rand() - 0.5) * 4).toFixed(1)) : parseFloat((66 + (rand() - 0.5) * 5).toFixed(1));
  const temp_c = isAffected ? parseFloat((36.7 + t * 0.3 + (rand() - 0.5) * 0.15).toFixed(2)) : parseFloat((36.6 + (rand() - 0.5) * 0.2).toFixed(2));
  const pvt_ms = isAffected ? parseFloat((265 + t * 55 + (rand() - 0.5) * 20).toFixed(0)) : parseFloat((255 + (rand() - 0.5) * 20).toFixed(0));

  const flow_z = isAffected ? parseFloat(lerp(0, -3.1, t).toFixed(2)) : parseFloat(((rand() - 0.5) * 0.4).toFixed(2));
  const dimer_z = isAffected ? parseFloat(lerp(0, 2.8, t).toFixed(2)) : parseFloat(((rand() - 0.5) * 0.3).toFixed(2));

  const urgencyLevel =
    isAffected && day > 10 ? "escalate" :
    isAffected && day > 6 ? "act" :
    isAffected && day > 3 ? "watch" : "info";

  return {
    level: urgencyLevel,
    syndrome_z: isAffected ? parseFloat(lerp(0, 3.1, t).toFixed(2)) : parseFloat(((rand() - 0.5) * 0.5).toFixed(2)),
    learning: day <= 3,
    indicators: {
      jugular_flow_vel: reading(jugular_flow, 13.0, "cm/s", "cardiovascular", "altered_gravity", flow_z,
        { earth: jugular_flow < 5 ? "low" : "normal", personal: day > 6 && isAffected ? "watch" : "normal",
          pattern: isAffected && day > 8 ? "expected_for_you" : "concordant_alert", earth_range: [5, 20] }),
      d_dimer_ng_ml: reading(d_dimer, 290, "ng/mL", "cardiovascular", "altered_gravity", dimer_z,
        { earth: d_dimer > 500 ? "high" : "normal", earth_range: [0, 500] }),
      rest_hr: reading(rest_hr, 66, "bpm", "cardiovascular", "altered_gravity", (rest_hr - 66) / 6,
        { earth_range: [60, 100] }),
      temp_c: reading(temp_c, 36.6, "C", "immune", "altered_gravity", (temp_c - 36.6) / 0.3,
        { earth_range: [36.1, 37.5] }),
      pvt_ms: reading(pvt_ms, 255, "ms", "behavioral", "closed_environment", (pvt_ms - 255) / 25),
    },
    card: card(
      urgencyLevel,
      urgencyLevel === "escalate"
        ? "Internal jugular stasis — escalate immediately and activate neck vein protocol"
        : urgencyLevel === "act"
        ? "Jugular flow velocity below threshold — activate neck vein review protocol"
        : urgencyLevel === "watch"
        ? "Venous flow pattern shifting — increase surveillance"
        : "Jugular flow within personal range",
      `IJV velocity ${jugular_flow.toFixed(1)} cm/s (baseline 13.0); D-Dimer ${d_dimer} ng/mL.`,
      "Microgravity-driven cephalad fluid shift can produce venous stasis in the internal jugular vein. Elevated D-Dimer concurrent with low or retrograde IJV flow warrants protocol activation and ground consultation (cite: NEJM-JUGULAR-THROMBOSIS).",
      urgencyLevel === "escalate"
        ? ["Activate neck_vein_review protocol immediately", "Contact ground urgently with IJV Doppler reading", "Do not perform EVA or high-load activities until cleared"]
        : urgencyLevel === "act"
        ? ["Conduct Doppler ultrasound of IJV per neck_vein_review protocol", "Log D-Dimer trend", "Alert CMO and ground"]
        : ["Repeat IJV flow check at next monitoring window", "Document any neck discomfort or headache"],
      ["IJV velocity trend", "D-Dimer", "Resting HR"],
      ["IJV velocity < 5 cm/s or retrograde", "D-Dimer > 800 ng/mL", "Sudden headache or neck swelling"],
      `A IJV: ${jugular_flow.toFixed(1)} cm/s, D-Dimer ${d_dimer} ng/mL. ${urgencyLevel === "escalate" ? "ESCALATE — protocol active." : urgencyLevel === "act" ? "Act — protocol active." : "Monitoring."}`,
      ["NEJM-JUGULAR-THROMBOSIS", "HRP-RISKS-OVERVIEW"],
    ),
    card_source: "template",
    routing: { ...ISS_ROUTING, send_now: urgencyLevel === "escalate" || urgencyLevel === "act", priority: urgencyLevel === "escalate" ? 0 : urgencyLevel === "act" ? 1 : 3 },
    protocol_id: urgencyLevel === "act" || urgencyLevel === "escalate" ? "neck_vein_review" : undefined,
  };
}

function buildJugularScenario(): ScenarioDoc {
  const days: ScenarioDay[] = [];
  for (let d = 1; d <= 14; d++) {
    days.push({
      day: d,
      attribution: { mode: "individual", affected: ["A"] },
      crew: {
        A: buildJugularCrewDay(d, lcg(2100 + d), "A"),
        B: buildJugularCrewDay(d, lcg(2200 + d), "B"),
        C: buildJugularCrewDay(d, lcg(2300 + d), "C"),
        D: buildJugularCrewDay(d, lcg(2400 + d), "D"),
      },
    });
  }
  return {
    synthetic: true,
    note: "Synthetic proxy data. Not a medical device. Modelled after the ISS Exp 56/57 internal jugular thrombosis case (Auñón-Chancellor, NEJM 2019). All values generated.",
    name: "case_jugular",
    scenario: "case_jugular",
    title: "Caso 2: Trombosis Yugular (ISS Exp. 56/57, Auñón-Chancellor)",
    description: "Simulación sintética de la trombosis de vena yugular interna documentada durante la misión ISS Expedición 56/57 (2018). El flujo venoso yugular decrece progresivamente y el D-Dimer sube, reflejando estasis venosa asociada a microgravedad.",
    variant: "investigation",
    delay_profile: "moon",
    crew: { A: { role: "CMO", label: "A – Crew Medical Officer" }, B: { role: "CDR", label: "B – Commander" }, C: { role: "MS1", label: "C – Mission Specialist 1" }, D: { role: "MS2", label: "D – Mission Specialist 2" } },
    crew_roles: { A: "CMO", B: "CDR", C: "MS1", D: "MS2" },
    indicators: ["jugular_flow_vel", "d_dimer_ng_ml", "rest_hr", "temp_c", "pvt_ms"],
    meta: {
      title: "Trombosis Vena Yugular Interna – ISS",
      summary: "Estasis venosa y coagulación en microgravedad. Doppler IJV + D-Dimer como indicadores clave. Protocolo: neck_vein_review.",
      protocol_id: "neck_vein_review",
      evidence_ids: ["NEJM-JUGULAR-THROMBOSIS", "HRP-RISKS-OVERVIEW"],
      mission: "ISS Expedición 56/57 (2018)",
      astronauts: "Serena Auñón-Chancellor",
    },
    days,
  };
}

// ─── Case 3: Apollo 7 – Resfriado / Barotrauma auditivo (Schirra/Eisele) ────

function buildApollo7CrewDay(day: number, rand: () => number, member: "A" | "B" | "C" | "D"): CrewDay {
  const isA = member === "A"; // Schirra
  const isB = member === "B"; // Eisele
  const isAffected = isA || isB;
  const tA = isA ? clamp((day - 2) / 10, 0, 1) : clamp((day - 3) / 10, 0, 1);
  const t = tA;

  const nasal_ear = isAffected
    ? parseFloat(lerp(0.5, 7.0, t).toFixed(1)) + (rand() - 0.5) * 0.8
    : parseFloat((rand() * 0.5).toFixed(1));

  const temp_c = isAffected
    ? parseFloat((36.7 + t * 0.6 + (rand() - 0.5) * 0.2).toFixed(2))
    : parseFloat((36.6 + (rand() - 0.5) * 0.2).toFixed(2));

  const headache = isAffected ? parseFloat(lerp(0.5, 4.5, t).toFixed(1)) + rand() * 0.5 : parseFloat((rand() * 0.6).toFixed(1));
  const rest_hr = isAffected ? parseFloat((72 + t * 10 + (rand() - 0.5) * 5).toFixed(1)) : parseFloat((65 + (rand() - 0.5) * 5).toFixed(1));
  const pvt_ms = isAffected ? parseFloat((265 + t * 50 + (rand() - 0.5) * 20).toFixed(0)) : parseFloat((255 + (rand() - 0.5) * 20).toFixed(0));

  const nasal_z = isAffected ? parseFloat(lerp(0, 2.8, t).toFixed(2)) : parseFloat(((rand() - 0.5) * 0.4).toFixed(2));

  const urgencyLevel =
    isAffected && day > 8 ? "act" :
    isAffected && day > 4 ? "watch" : "info";

  return {
    level: urgencyLevel,
    syndrome_z: isAffected ? parseFloat(lerp(0, 2.5, t).toFixed(2)) : parseFloat(((rand() - 0.5) * 0.5).toFixed(2)),
    learning: day <= 2,
    indicators: {
      nasal_ear_score: reading(nasal_ear, 0.5, "0-10", "immune", "closed_environment", nasal_z,
        { earth: nasal_ear > 5 ? "high" : "normal", personal: day > 4 && isAffected ? "watch" : "normal",
          pattern: isAffected && day > 8 ? "expected_for_you" : "concordant_alert" }),
      temp_c: reading(temp_c, 36.6, "C", "immune", "altered_gravity", (temp_c - 36.6) / 0.3,
        { earth: temp_c > 37.5 ? "high" : "normal", earth_range: [36.1, 37.5] }),
      headache_score: reading(headache, 0.5, "0-10", "behavioral", "closed_environment", headache / 2,
        { earth: headache > 3 ? "high" : "normal" }),
      rest_hr: reading(rest_hr, 65, "bpm", "cardiovascular", "altered_gravity", (rest_hr - 65) / 6,
        { earth_range: [60, 100] }),
      pvt_ms: reading(pvt_ms, 255, "ms", "behavioral", "closed_environment", (pvt_ms - 255) / 25),
    },
    card: card(
      urgencyLevel,
      urgencyLevel === "act"
        ? "Upper respiratory symptoms elevating — activate Eustachian barotrauma protocol"
        : urgencyLevel === "watch"
        ? "Nasal congestion progressing — increased monitoring"
        : "Respiratory indicators within personal range",
      `Nasal/ear score ${nasal_ear.toFixed(1)}/10; temp ${temp_c.toFixed(2)} C; headache ${headache.toFixed(1)}/10.`,
      "In microgravity, nasal secretions cannot drain by gravity, intensifying congestion and raising Eustachian tube pressure. This can produce barotrauma risk during pressure transitions (EVA, re-entry). Reference: Apollo 7 (Schirra/Eisele, 1968).",
      urgencyLevel === "act"
        ? ["Activate eustachian_barotrauma protocol", "Administer approved decongestant per onboard formulary", "No EVA without CMO clearance", "Log ear/sinus score every 4 h"]
        : urgencyLevel === "watch"
        ? ["Take decongestant if approved", "Avoid sudden pressure changes", "Monitor temperature trend"]
        : ["Continue daily self-report"],
      ["Nasal/ear score", "Temperature trend", "Headache score", "Reaction time"],
      ["Temperature > 38.0 C", "Ear pain scoring > 7", "Hearing loss reported"],
      `${member} nasal/ear ${nasal_ear.toFixed(1)}, temp ${temp_c.toFixed(2)} C. ${urgencyLevel === "act" ? "Act — barotrauma protocol active." : "Monitoring."}`,
      ["HRP-IMMUNE-SPACEFLIGHT-STRESSORS", "HRP-VIRAL-REACTIVATION-SUBCLINICAL"],
    ),
    card_source: "template",
    routing: { ...MOON_ROUTING, send_now: urgencyLevel === "act", priority: urgencyLevel === "act" ? 1 : 3 },
    protocol_id: urgencyLevel === "act" ? "eustachian_barotrauma" : undefined,
  };
}

function buildApollo7Scenario(): ScenarioDoc {
  const days: ScenarioDay[] = [];
  for (let d = 1; d <= 14; d++) {
    days.push({
      day: d,
      attribution: { mode: "shared", affected: ["A", "B"] },
      crew: {
        A: buildApollo7CrewDay(d, lcg(3100 + d), "A"),
        B: buildApollo7CrewDay(d, lcg(3200 + d), "B"),
        C: buildApollo7CrewDay(d, lcg(3300 + d), "C"),
        D: buildApollo7CrewDay(d, lcg(3400 + d), "D"),
      },
    });
  }
  return {
    synthetic: true,
    note: "Synthetic proxy data. Not a medical device. Modelled after Apollo 7 upper-respiratory illness and Eustachian barotrauma (Schirra/Eisele, 1968). All values generated.",
    name: "case_apollo7",
    scenario: "case_apollo7",
    title: "Caso 3: Infección respiratoria y barotrauma (Apollo 7, Schirra/Eisele)",
    description: "Simulación sintética del episodio de resfriado y congestión nasal/ótica vivido por la tripulación de Apollo 7 (1968). En microgravedad las secreciones no drenan por gravedad, agravando la congestión y el riesgo de barotrauma al intentar maniobras de Valsalva.",
    variant: "investigation",
    delay_profile: "moon",
    crew: { A: { role: "CDR", label: "A – Commander (Schirra)" }, B: { role: "CMP", label: "B – Command Module Pilot (Eisele)" }, C: { role: "LMP", label: "C – Lunar Module Pilot (Cunningham)" }, D: { role: "MS2", label: "D – Mission Specialist 2" } },
    crew_roles: { A: "CDR", B: "CMP", C: "LMP", D: "MS2" },
    indicators: ["nasal_ear_score", "temp_c", "headache_score", "rest_hr", "pvt_ms"],
    meta: {
      title: "Infección Respiratoria y Barotrauma – Apollo 7",
      summary: "Congestión nasal sin drenaje gravitacional en microgravedad. Riesgo de barotrauma auditivo. Protocolo: eustachian_barotrauma.",
      protocol_id: "eustachian_barotrauma",
      evidence_ids: ["HRP-IMMUNE-SPACEFLIGHT-STRESSORS"],
      mission: "Apollo 7 (octubre 1968)",
      astronauts: "Walter Schirra, Donn Eisele, Walter Cunningham",
    },
    days,
  };
}

// ─── Case 4: Apollo 8 – SAS / Mareo Vestibular (Borman) ─────────────────────

function buildApollo8CrewDay(day: number, rand: () => number, member: "A" | "B" | "C" | "D"): CrewDay {
  const isAffected = member === "A"; // Borman
  const tPeak = 3; // SAS peaks early then adapts
  const t = isAffected ? Math.max(0, 1 - Math.abs(day - tPeak) / 4) : 0;

  const motion_sickness = isAffected
    ? parseFloat(lerp(0.5, 7.5, t).toFixed(1)) + (rand() - 0.5) * 0.8
    : parseFloat((rand() * 1.5).toFixed(1));

  const sleep_h = isAffected ? parseFloat(lerp(6.0, 4.5, t).toFixed(1)) + (rand() - 0.5) * 0.5 : parseFloat((6.8 + (rand() - 0.5) * 0.6).toFixed(1));
  const rest_hr = isAffected ? parseFloat((74 + t * 14 + (rand() - 0.5) * 5).toFixed(1)) : parseFloat((65 + (rand() - 0.5) * 5).toFixed(1));
  const pvt_ms = isAffected ? parseFloat((270 + t * 70 + (rand() - 0.5) * 20).toFixed(0)) : parseFloat((255 + (rand() - 0.5) * 20).toFixed(0));
  const temp_c = isAffected ? parseFloat((36.6 + t * 0.4 + (rand() - 0.5) * 0.2).toFixed(2)) : parseFloat((36.6 + (rand() - 0.5) * 0.2).toFixed(2));

  const sas_z = isAffected ? parseFloat(lerp(0, 2.8, t).toFixed(2)) : parseFloat(((rand() - 0.5) * 0.4).toFixed(2));

  const urgencyLevel =
    isAffected && motion_sickness > 6 ? "act" :
    isAffected && motion_sickness > 3 ? "watch" : "info";

  return {
    level: urgencyLevel,
    syndrome_z: isAffected ? parseFloat(lerp(0, 2.6, t).toFixed(2)) : parseFloat(((rand() - 0.5) * 0.4).toFixed(2)),
    learning: day <= 2,
    indicators: {
      motion_sickness_score: reading(motion_sickness, 0.5, "0-10", "behavioral", "altered_gravity", sas_z,
        { earth: "normal", space: motion_sickness > 5 ? "high" : "normal",
          personal: day <= 4 && isAffected ? "watch" : "normal",
          pattern: "concordant_alert" }),
      sleep_h: reading(sleep_h, 7.0, "h", "behavioral", "isolation", (sleep_h - 7.0) / 0.8,
        { earth: sleep_h < 6 ? "low" : "normal", earth_range: [7, 9] }),
      rest_hr: reading(rest_hr, 65, "bpm", "cardiovascular", "altered_gravity", (rest_hr - 65) / 7,
        { earth_range: [60, 100] }),
      pvt_ms: reading(pvt_ms, 255, "ms", "behavioral", "closed_environment", (pvt_ms - 255) / 25),
      temp_c: reading(temp_c, 36.6, "C", "immune", "altered_gravity", (temp_c - 36.6) / 0.3,
        { earth_range: [36.1, 37.5] }),
    },
    card: card(
      urgencyLevel,
      urgencyLevel === "act"
        ? "Space adaptation syndrome — activate SAS countermeasure protocol"
        : urgencyLevel === "watch"
        ? "Vestibular mismatch symptoms building — activate watch"
        : "Sensorimotor adaptation within expected early-flight pattern",
      `SAS score ${motion_sickness.toFixed(1)}/10; sleep ${sleep_h.toFixed(1)} h; PVT ${pvt_ms} ms.`,
      "Sensory conflict between otolith organs and visual system is expected during the first days of microgravity. Graybiel scale scores > 5 warrant protocol intervention. Symptoms typically resolve within 2 to 4 days as adaptation proceeds (cite: HRP-SENSORIMOTOR-SAS).",
      urgencyLevel === "act"
        ? ["Activate space_adaptation_syndrome protocol", "Restrict rapid head movements", "Ensure hydration per onboard guidelines", "Log vomiting episodes if any"]
        : urgencyLevel === "watch"
        ? ["Move slowly and deliberately", "Avoid visual conflict tasks", "Rest if possible"]
        : ["No action required; monitor score for 2 more days"],
      ["SAS score trend", "Sleep duration", "Resting HR", "Reaction time"],
      ["SAS score > 7 sustained > 24 h", "Vomiting impairing fluid intake", "Syncope or severe disorientation"],
      `${member} SAS: ${motion_sickness.toFixed(1)}/10, sleep ${sleep_h.toFixed(1)} h. ${urgencyLevel === "act" ? "Act — SAS protocol active." : "Monitoring."}`,
      ["HRP-SENSORIMOTOR-SAS"],
    ),
    card_source: "template",
    routing: { ...MOON_ROUTING, send_now: urgencyLevel === "act", priority: urgencyLevel === "act" ? 1 : 3 },
    protocol_id: urgencyLevel === "act" ? "space_adaptation_syndrome" : undefined,
  };
}

function buildApollo8Scenario(): ScenarioDoc {
  const days: ScenarioDay[] = [];
  for (let d = 1; d <= 14; d++) {
    days.push({
      day: d,
      attribution: { mode: "individual", affected: ["A"] },
      crew: {
        A: buildApollo8CrewDay(d, lcg(4100 + d), "A"),
        B: buildApollo8CrewDay(d, lcg(4200 + d), "B"),
        C: buildApollo8CrewDay(d, lcg(4300 + d), "C"),
        D: buildApollo8CrewDay(d, lcg(4400 + d), "D"),
      },
    });
  }
  return {
    synthetic: true,
    note: "Synthetic proxy data. Not a medical device. Modelled after Apollo 8 space adaptation syndrome episode (Borman, 1968). All values generated.",
    name: "case_apollo8",
    scenario: "case_apollo8",
    title: "Caso 4: Sindrome de Adaptacion Espacial / SAS (Apollo 8, Borman)",
    description: "Simulacion sintetica del sindrome de adaptacion espacial (SAS / mareo vestibular) vivido por Frank Borman durante Apollo 8 (1968). El conflicto sensorial otolito-visual produce pico de puntuacion SAS en dias 2-4, seguido de adaptacion gradual.",
    variant: "investigation",
    delay_profile: "moon",
    crew: { A: { role: "CDR", label: "A – Commander (Borman)" }, B: { role: "CMP", label: "B – Command Module Pilot (Lovell)" }, C: { role: "LMP", label: "C – Lunar Module Pilot (Anders)" }, D: { role: "MS2", label: "D – Mission Specialist 2" } },
    crew_roles: { A: "CDR", B: "CMP", C: "LMP", D: "MS2" },
    indicators: ["motion_sickness_score", "sleep_h", "rest_hr", "pvt_ms", "temp_c"],
    meta: {
      title: "Sindrome de Adaptacion Espacial – Apollo 8",
      summary: "Conflicto vestibular-visual en microgravedad. Escala Graybiel. Adaptacion en 2-4 dias. Protocolo: space_adaptation_syndrome.",
      protocol_id: "space_adaptation_syndrome",
      evidence_ids: ["HRP-SENSORIMOTOR-SAS"],
      mission: "Apollo 8 (diciembre 1968)",
      astronauts: "Frank Borman, James Lovell, William Anders",
    },
    days,
  };
}

// ─── Case 5: Pérdida de masa ósea e hipercalciuria (ISS / ARED) ─────────────

function buildBoneLossCrewDay(day: number, rand: () => number, member: "A" | "B" | "C" | "D"): CrewDay {
  const severeFactor = member === "A" ? 1.0 : member === "B" ? 0.7 : 0.4;
  const t = clamp((day - 1) / 13, 0, 1);

  const ared_load = Math.round(lerp(140, 140 - 30 * severeFactor, t)) + Math.round((rand() - 0.5) * 10);
  const urinary_calcium = parseFloat(lerp(2.5, 2.5 + 1.8 * severeFactor, t).toFixed(2)) + (rand() - 0.5) * 0.15;

  const rest_hr = parseFloat((65 + (rand() - 0.5) * 5).toFixed(1));
  const sleep_h = parseFloat((6.8 + (rand() - 0.5) * 0.8).toFixed(1));
  const pvt_ms = parseFloat((255 + t * 30 * severeFactor + (rand() - 0.5) * 20).toFixed(0));

  const ared_z = parseFloat((-t * 2.0 * severeFactor).toFixed(2));
  const ca_z = parseFloat((t * 2.2 * severeFactor).toFixed(2));

  const urgencyLevel =
    severeFactor > 0.8 && day > 10 ? "watch" :
    severeFactor > 0.5 && day > 10 ? "watch" : "info";

  return {
    level: urgencyLevel,
    syndrome_z: parseFloat((t * 1.5 * severeFactor).toFixed(2)),
    learning: day <= 3,
    indicators: {
      ared_load_kg: reading(ared_load, 140, "kg", "musculoskeletal", "altered_gravity", ared_z,
        { earth: "normal", space: ared_load < 120 ? "low" : "normal",
          personal: ared_load < 125 ? "watch" : "normal", pattern: "concordant_alert" }),
      urinary_calcium: reading(urinary_calcium, 2.5, "mmol/L", "musculoskeletal", "altered_gravity", ca_z,
        { earth: urinary_calcium > 3.8 ? "high" : "normal", earth_range: [1.0, 3.5] }),
      rest_hr: reading(rest_hr, 65, "bpm", "cardiovascular", "altered_gravity", (rest_hr - 65) / 6,
        { earth_range: [60, 100] }),
      sleep_h: reading(sleep_h, 7.0, "h", "behavioral", "isolation", (sleep_h - 7.0) / 0.8,
        { earth_range: [7, 9] }),
      pvt_ms: reading(pvt_ms, 255, "ms", "behavioral", "closed_environment", (pvt_ms - 255) / 25),
    },
    card: card(
      urgencyLevel,
      urgencyLevel === "watch"
        ? "Bone resorption markers trending — activate bone loss mitigation protocol"
        : "Bone health indicators within monitored range",
      `ARED load ${ared_load} kg (baseline 140); urinary calcium ${urinary_calcium.toFixed(2)} mmol/L.`,
      "Absence of gravitational mechanical loading shifts skeletal remodeling toward osteoclastic bone resorption. Rising urinary calcium indicates this process and signals increased renal stone risk during long-duration missions (cite: HRP-OSTEOCLAST-BONE-LOSS).",
      urgencyLevel === "watch"
        ? ["Activate bone_loss_mitigation protocol", "Ensure ARED session compliance (at least 6 days per week)", "Review calcium and vitamin D intake per dietary log", "Flag to CMO for trending review"]
        : ["Maintain scheduled ARED sessions", "Log urinary calcium proxy weekly"],
      ["ARED session compliance", "Urinary calcium trend", "Sleep duration"],
      ["Urinary calcium > 4.5 mmol/L sustained", "ARED session compliance < 50% for 7 days", "Symptomatic renal stone (flank pain)"],
      `${member} ARED: ${ared_load} kg, U-Ca: ${urinary_calcium.toFixed(2)} mmol/L. ${urgencyLevel === "watch" ? "Watch — bone protocol recommended." : "Routine monitoring."}`,
      ["HRP-OSTEOCLAST-BONE-LOSS", "HRP-RISKS-OVERVIEW"],
    ),
    card_source: "template",
    routing: { ...ISS_ROUTING, send_now: false, priority: 3 },
    protocol_id: urgencyLevel === "watch" ? "bone_loss_mitigation" : undefined,
  };
}

function buildBoneLossScenario(): ScenarioDoc {
  const days: ScenarioDay[] = [];
  for (let d = 1; d <= 14; d++) {
    days.push({
      day: d,
      attribution: { mode: "individual", affected: ["A", "B"] },
      crew: {
        A: buildBoneLossCrewDay(d, lcg(5100 + d), "A"),
        B: buildBoneLossCrewDay(d, lcg(5200 + d), "B"),
        C: buildBoneLossCrewDay(d, lcg(5300 + d), "C"),
        D: buildBoneLossCrewDay(d, lcg(5400 + d), "D"),
      },
    });
  }
  return {
    synthetic: true,
    note: "Synthetic proxy data. Not a medical device. Modelled after long-duration ISS/Mir bone loss findings. All values generated.",
    name: "case_bone_loss",
    scenario: "case_bone_loss",
    title: "Caso 5: Desmineralizacion osea e hipercalciuria (ISS / Mir, ARED)",
    description: "Simulacion sintetica de la perdida de masa osea en misiones prolongadas en microgravedad. La carga mecanica reducida desplaza el remodelado oseo hacia la reabsorcion osteoclastica, elevando el calcio urinario. El dispositivo ARED (Advanced Resistive Exercise Device) es la contramedida principal.",
    variant: "investigation",
    delay_profile: "moon",
    crew: { A: { role: "CMO", label: "A – Crew Medical Officer" }, B: { role: "CDR", label: "B – Commander" }, C: { role: "MS1", label: "C – Mission Specialist 1" }, D: { role: "MS2", label: "D – Mission Specialist 2" } },
    crew_roles: { A: "CMO", B: "CDR", C: "MS1", D: "MS2" },
    indicators: ["ared_load_kg", "urinary_calcium", "rest_hr", "sleep_h", "pvt_ms"],
    meta: {
      title: "Perdida de Masa Osea – ISS / Mir",
      summary: "Reabsorcion osea por microgravedad. Hipercalciuria como proxy. Contramedida: ARED. Protocolo: bone_loss_mitigation.",
      protocol_id: "bone_loss_mitigation",
      evidence_ids: ["HRP-OSTEOCLAST-BONE-LOSS"],
      mission: "Misiones prolongadas ISS / Mir (1990s–presente)",
      astronauts: "Multiples tripulantes de larga duracion",
    },
    days,
  };
}

// ─── Case 6: Estrés / Confinamiento (Salyut / Mir) ───────────────────────────

function buildConfinementCrewDay(day: number, rand: () => number, member: "A" | "B" | "C" | "D"): CrewDay {
  const driftFactor = member === "A" ? 1.0 : member === "C" ? 0.7 : 0.3;
  const t = clamp((day - 2) / 12, 0, 1);

  const voice_stress = parseFloat((0.2 + t * 0.55 * driftFactor + (rand() - 0.5) * 0.08).toFixed(2));
  const sleep_h = parseFloat((6.8 - t * 1.5 * driftFactor + (rand() - 0.5) * 0.6).toFixed(1));
  const pvt_ms = parseFloat((255 + t * 75 * driftFactor + (rand() - 0.5) * 20).toFixed(0));
  const rest_hr = parseFloat((65 + t * 7 * driftFactor + (rand() - 0.5) * 5).toFixed(1));
  const temp_c = parseFloat((36.6 + (rand() - 0.5) * 0.2).toFixed(2));

  const voice_z = parseFloat((t * 2.6 * driftFactor).toFixed(2));

  const urgencyLevel =
    driftFactor > 0.8 && day > 11 ? "act" :
    driftFactor > 0.5 && day > 8 ? "watch" : "info";

  return {
    level: urgencyLevel,
    syndrome_z: parseFloat((t * 2.0 * driftFactor).toFixed(2)),
    learning: day <= 2,
    indicators: {
      voice_stress_idx: reading(voice_stress, 0.2, "0-1", "behavioral", "isolation", voice_z,
        { earth: "normal", space: voice_stress > 0.65 ? "high" : "normal",
          personal: voice_stress > 0.55 ? "watch" : "normal",
          pattern: driftFactor > 0.7 && day > 10 ? "expected_for_you" : "concordant_alert" }),
      sleep_h: reading(sleep_h, 6.8, "h", "behavioral", "isolation", (sleep_h - 6.8) / 0.8,
        { earth: sleep_h < 5.5 ? "low" : "normal", earth_range: [7, 9] }),
      pvt_ms: reading(pvt_ms, 255, "ms", "behavioral", "closed_environment", (pvt_ms - 255) / 30),
      rest_hr: reading(rest_hr, 65, "bpm", "cardiovascular", "altered_gravity", (rest_hr - 65) / 6,
        { earth_range: [60, 100] }),
      temp_c: reading(temp_c, 36.6, "C", "immune", "altered_gravity", (temp_c - 36.6) / 0.3,
        { earth_range: [36.1, 37.5] }),
    },
    card: card(
      urgencyLevel,
      urgencyLevel === "act"
        ? "Behavioral drift above personal baseline — activate countermeasure protocol"
        : urgencyLevel === "watch"
        ? "Psychological fatigue markers trending — increased monitoring"
        : "Behavioral indicators within expected long-duration range",
      `Voice stress ${voice_stress.toFixed(2)} (baseline 0.20); sleep ${sleep_h.toFixed(1)} h; PVT ${pvt_ms} ms.`,
      "Long-duration isolation, confinement, and communication delay are established risk factors for interpersonal friction, mood decline, and neurobehavioral performance decrements (cite: HRP-BEHAVIORAL-CONFINEMENT). Multi-indicator behavioral drift is a stronger signal than any single reading.",
      urgencyLevel === "act"
        ? ["Activate behavioral_countermeasure protocol", "Schedule structured rest and recreation period", "Request psych support contact via Earth link", "CMO: conduct informal crew welfare check"]
        : urgencyLevel === "watch"
        ? ["Encourage rest and social time", "Review circadian schedule compliance", "Monitor voice stress trend over next 3 days"]
        : ["Maintain scheduled crew activities and rest periods"],
      ["Voice stress trend", "Sleep duration", "Reaction time", "Resting HR"],
      ["Voice stress > 0.8 for 3 consecutive days", "Sleep < 5 h for 3+ nights", "Interpersonal conflict report", "PVT > 400 ms"],
      `${member} voice stress ${voice_stress.toFixed(2)}, sleep ${sleep_h.toFixed(1)} h, PVT ${pvt_ms} ms. ${urgencyLevel === "act" ? "Act — behavioral protocol active." : "Monitoring."}`,
      ["HRP-BEHAVIORAL-CONFINEMENT", "HRP-RISKS-OVERVIEW"],
    ),
    card_source: "template",
    routing: { ...MIR_ROUTING, send_now: urgencyLevel === "act", priority: urgencyLevel === "act" ? 1 : 3 },
    protocol_id: urgencyLevel === "act" ? "behavioral_countermeasure" : undefined,
  };
}

function buildConfinementScenario(): ScenarioDoc {
  const days: ScenarioDay[] = [];
  for (let d = 1; d <= 14; d++) {
    days.push({
      day: d,
      attribution: { mode: "individual", affected: ["A", "C"] },
      crew: {
        A: buildConfinementCrewDay(d, lcg(6100 + d), "A"),
        B: buildConfinementCrewDay(d, lcg(6200 + d), "B"),
        C: buildConfinementCrewDay(d, lcg(6300 + d), "C"),
        D: buildConfinementCrewDay(d, lcg(6400 + d), "D"),
      },
    });
  }
  return {
    synthetic: true,
    note: "Synthetic proxy data. Not a medical device. Modelled after psychological stress findings from Salyut/Mir long-duration missions. All values generated.",
    name: "case_confinement",
    scenario: "case_confinement",
    title: "Caso 6: Estres psicologico y confinamiento (Salyut / Mir)",
    description: "Simulacion sintetica del deterioro conductual y psicologico documentado en misiones de larga duracion (Salyut, Mir, ISS). El aislamiento, el confinamiento y la latencia de comunicacion elevan el estres vocal, reducen el sueno y degradan el tiempo de reaccion de forma acumulativa.",
    variant: "investigation",
    delay_profile: "mars",
    crew: { A: { role: "CDR", label: "A – Commander" }, B: { role: "MS1", label: "B – Mission Specialist 1" }, C: { role: "MS2", label: "C – Mission Specialist 2" }, D: { role: "MS3", label: "D – Mission Specialist 3" } },
    crew_roles: { A: "CDR", B: "MS1", C: "MS2", D: "MS3" },
    indicators: ["voice_stress_idx", "sleep_h", "pvt_ms", "rest_hr", "temp_c"],
    meta: {
      title: "Estres Psicologico y Confinamiento – Salyut / Mir",
      summary: "Fatiga conductual acumulativa por aislamiento, confinamiento y latencia de comunicacion. Voice stress + sleep + PVT como indicadores. Protocolo: behavioral_countermeasure.",
      protocol_id: "behavioral_countermeasure",
      evidence_ids: ["HRP-BEHAVIORAL-CONFINEMENT"],
      mission: "Misiones Salyut / Mir (decadas 1980–1990) e ISS",
      astronauts: "Multiples tripulaciones de larga duracion",
    },
    days,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const INVESTIGATION_SCENARIO_NAMES = [
  "case_sans",
  "case_jugular",
  "case_apollo7",
  "case_apollo8",
  "case_bone_loss",
  "case_confinement",
] as const;

export type InvestigationScenarioName = (typeof INVESTIGATION_SCENARIO_NAMES)[number];

export function isInvestigationScenario(name: string): name is InvestigationScenarioName {
  return (INVESTIGATION_SCENARIO_NAMES as readonly string[]).includes(name);
}

/** Build the ScenarioDoc for a given investigation case name. */
export function buildInvestigationScenario(name: InvestigationScenarioName): ScenarioDoc {
  switch (name) {
    case "case_sans": return buildSansScenario();
    case "case_jugular": return buildJugularScenario();
    case "case_apollo7": return buildApollo7Scenario();
    case "case_apollo8": return buildApollo8Scenario();
    case "case_bone_loss": return buildBoneLossScenario();
    case "case_confinement": return buildConfinementScenario();
  }
}

/** Summary entries for the ScenarioBar selector (appended client-side). */
export const INVESTIGATION_SUMMARIES = [
  { name: "case_sans", title: "Caso 1 · SANS – Vision neuro-ocular (ISS Exp. 20)", available: true, source: "investigation-case" },
  { name: "case_jugular", title: "Caso 2 · Trombosis yugular (ISS Exp. 56/57)", available: true, source: "investigation-case" },
  { name: "case_apollo7", title: "Caso 3 · Infeccion respiratoria / barotrauma (Apollo 7)", available: true, source: "investigation-case" },
  { name: "case_apollo8", title: "Caso 4 · Sindrome de adaptacion espacial (Apollo 8)", available: true, source: "investigation-case" },
  { name: "case_bone_loss", title: "Caso 5 · Desmineralizacion osea – ARED (ISS / Mir)", available: true, source: "investigation-case" },
  { name: "case_confinement", title: "Caso 6 · Estres y confinamiento (Salyut / Mir)", available: true, source: "investigation-case" },
];
