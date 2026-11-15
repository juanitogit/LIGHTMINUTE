/**
 * NASA investigation cases — display metadata for the six clinical cases.
 *
 * The synthetic dataset and its numbers live in `investigationScenarios.ts`;
 * this module only adds the historical context, citations and the one metric
 * each case turns on, so the UI can give the case visual prominence without
 * recomputing anything. Citations reuse the verified ids in `kb/evidence.yaml`.
 */
import type { LoadedScenario, ScenarioDoc } from "./types";
import type { InvestigationScenarioName } from "./investigationScenarios";

export type MarkerSite = "eyes" | "neck" | "ear" | "head" | "kidney";

export interface CriticalMetric {
  /** Indicator key inside the case document. */
  key: string;
  label: string;
  unit: string;
  decimals: number;
  /** Full-scale value for the HUD bar. */
  barMax: number;
  direction: "high" | "low";
  watchAt: number;
  alertAt: number;
  normalWord: string;
  watchWord: string;
  alertWord: string;
}

export interface CaseCitation {
  text: string;
  source: string;
  url?: string;
}

export interface NasaCase {
  scenario: InvestigationScenarioName;
  number: number;
  short: string;
  title: string;
  mission: string;
  year: string;
  astronauts: string;
  affectedCrew: string[];
  affectedLabel: string;
  traceLabel: string;
  dilemma: string;
  traditional: string;
  lightminute: string;
  protocol: string;
  evidenceId: string;
  citations: CaseCitation[];
  critical: CriticalMetric;
  marker?: { site: MarkerSite; label: string };
}

/** Where each sensor sits on the HUD body silhouette (viewBox 0 0 100 220). */
export const MARKER_POINTS: Record<MarkerSite, { x: number; y: number }> = {
  eyes: { x: 50, y: 14 },
  neck: { x: 50, y: 36 },
  ear: { x: 59, y: 18 },
  head: { x: 50, y: 12 },
  kidney: { x: 37, y: 97 },
};

export const NASA_CASES: NasaCase[] = [
  {
    scenario: "case_sans",
    number: 1,
    short: "SANS",
    title: "Alteraciones neuro-oculares",
    mission: "ISS Expedición 20",
    year: "2009",
    astronauts: "Michael Barratt y Robert Thirsk",
    affectedCrew: ["A"],
    affectedLabel: "Tripulante A (CMO)",
    traceLabel: "EXPEDICIÓN ISS 20",
    dilemma:
      "Dos tripulantes notaron que su visión cercana cambiaba en órbita. En 2009 el edema de papila y el aplanamiento del globo ocular se describieron después del vuelo, cuando el cambio refractivo ya se había instalado.",
    traditional:
      "Refracción y fondo de ojo al regreso: el hallazgo se documenta cuando el cambio ya es permanente.",
    lightminute:
      "ONSD y delta refractivo medidos a diario; la lente personal marca la desviación varios días antes de que el síntoma sea evidente, con el protocolo sans_fluid_shift listo.",
    protocol: "sans_fluid_shift",
    evidenceId: "HRP-SANS-EVIDENCE",
    citations: [
      {
        text: "Los desplazamientos cefálicos de fluidos en microgravedad producen edema de papila, aplanamiento del globo ocular, pliegues coroideos y shift hipermetrópico (SANS), medibles con ecografía ocular y fundoscopía.",
        source: "NASA Human Research Program · Risks",
        url: "https://www.nasa.gov/hrp/risks",
      },
      {
        text: "Mader TH et al. Optic Disc Edema, Globe Flattening, Choroidal Folds, and Hyperopic Shifts Observed in Astronauts after Long-duration Space Flight. Ophthalmology. 2011;118(10):2058-2069.",
        source: "Ophthalmology 2011",
      },
    ],
    critical: {
      key: "onsd_mm",
      label: "ONSD ocular",
      unit: "mm",
      decimals: 2,
      barMax: 7.5,
      direction: "high",
      watchAt: 5.3,
      alertAt: 5.8,
      normalWord: "NOMINAL",
      watchWord: "VIGILAR",
      alertWord: "ALERTA",
    },
    marker: { site: "eyes", label: "ECO OCULAR · ONSD" },
  },
  {
    scenario: "case_jugular",
    number: 2,
    short: "Trombosis yugular",
    title: "Trombosis de vena yugular interna",
    mission: "ISS Expedición 56/57",
    year: "2018",
    astronauts: "Serena Auñón-Chancellor",
    affectedCrew: ["A"],
    affectedLabel: "Tripulante A",
    traceLabel: "EXPEDICIÓN ISS 56/57",
    dilemma:
      "El flujo de la yugular interna se volvió estasis y luego flujo retrógrado en órbita. En Tierra la trombosis se confirmó cuando el cuello ya estaba comprometido, y el tratamiento anticoagulante tuvo que decidirse sin guía previa.",
    traditional:
      "El síntoma aparece primero; la ecografía llega cuando la estasis ya es una trombosis establecida.",
    lightminute:
      "Doppler yugular y dímero D en la misma serie temporal; el motor señala la caída de flujo el día 7 y escala a protocolo neck_vein_review antes del evento clínico.",
    protocol: "neck_vein_review",
    evidenceId: "NEJM-JUGULAR-THROMBOSIS",
    citations: [
      {
        text: "Se documentó estasis venosa y trombosis de la vena yugular interna durante vuelo de larga duración en la ISS, manejada con anticoagulación y vigilancia por ecografía Doppler.",
        source: "NASA Human Research Program · Risks",
        url: "https://www.nasa.gov/hrp/risks",
      },
      {
        text: "Auñón-Chancellor SM, Pattarini JM, Moll S, Sargsyan A. Venous thrombosis during spaceflight. N Engl J Med. 2020;382:89-90. doi:10.1056/NEJMc1905875",
        source: "New England Journal of Medicine",
        url: "https://doi.org/10.1056/NEJMc1905875",
      },
    ],
    critical: {
      key: "jugular_flow_vel",
      label: "Doppler yugular (IJV)",
      unit: "cm/s",
      decimals: 1,
      barMax: 20,
      direction: "low",
      watchAt: 5,
      alertAt: 2,
      normalWord: "PERMEABLE",
      watchWord: "FLUJO BAJO",
      alertWord: "ESTASIS",
    },
    marker: { site: "neck", label: "DOPPLER YUGULAR · IJV" },
  },
  {
    scenario: "case_apollo7",
    number: 3,
    short: "Barotrauma",
    title: "Infección respiratoria y barotrauma",
    mission: "Apollo 7",
    year: "1968",
    astronauts: "Walter Schirra y Donn Eisele",
    affectedCrew: ["A", "B"],
    affectedLabel: "Tripulantes A (Schirra) y B (Eisele)",
    traceLabel: "APOLLO 7",
    dilemma:
      "Un resfriado en cabina cerrada no drena por gravedad: la congestión subió hasta comprometer la compensación timpánica en la maniobra de Valsalva, con dos tripulantes sintomáticos y la misión en riesgo.",
    traditional:
      "Se trata la congestión cuando ya duele el oído o falla la compensación de presión.",
    lightminute:
      "La puntuación nasal/ótica y la temperatura se leen juntas; el contagio cruzado en cabina se ve en la atribución compartida antes del barotrauma, con protocolo eustachian_barotrauma.",
    protocol: "eustachian_barotrauma",
    evidenceId: "HRP-IMMUNE-SPACEFLIGHT-STRESSORS",
    citations: [
      {
        text: "Radiación, microgravedad, sueño pobre y otros estresores del vuelo espacial alteran el sistema inmunitario y pueden reactivar virus latentes o desencadenar reacciones alérgicas.",
        source: "NASA Human Research Program · Immune system",
        url: "https://www.nasa.gov/reference/risk-of-altered-immune-system-responses",
      },
    ],
    critical: {
      key: "nasal_ear_score",
      label: "Congestión nasal/ótica",
      unit: "/10",
      decimals: 1,
      barMax: 10,
      direction: "high",
      watchAt: 4,
      alertAt: 6,
      normalWord: "PERMEABLE",
      watchWord: "CONGESTIÓN",
      alertWord: "BAROTRAUMA",
    },
    marker: { site: "ear", label: "SENSOR TÍMPANICO" },
  },
  {
    scenario: "case_apollo8",
    number: 4,
    short: "SAS",
    title: "Síndrome de adaptación espacial",
    mission: "Apollo 8",
    year: "1968",
    astronauts: "Frank Borman",
    affectedCrew: ["A"],
    affectedLabel: "Tripulante A (Borman)",
    traceLabel: "APOLLO 8",
    dilemma:
      "El mareo por conflicto vestibular apareció en los primeros días y nadie sabía cuánto duraría. La decisión era si la tripulación seguía operando el vehículo o se reprogramaba la misión.",
    traditional:
      "Se trata el mareo cuando ya limita la operación, sin saber si la adaptación llegará.",
    lightminute:
      "Escala Graybiel, sueño, FC y PVT muestran la curva de campana: pico temprano y remisión espontánea, así que el protocolo space_adaptation_syndrome se activa con la dosis justa.",
    protocol: "space_adaptation_syndrome",
    evidenceId: "HRP-SENSORIMOTOR-SAS",
    citations: [
      {
        text: "El conflicto sensorial neuro-vestibular entre órganos otolíticos, canales semicirculares y visión causa el síndrome de adaptación espacial agudo (SAS) en los primeros días de microgravedad.",
        source: "NASA Human Research Program · Risks",
        url: "https://www.nasa.gov/hrp/risks",
      },
    ],
    critical: {
      key: "motion_sickness_score",
      label: "Mareo espacial (Graybiel)",
      unit: "/10",
      decimals: 1,
      barMax: 10,
      direction: "high",
      watchAt: 3,
      alertAt: 6,
      normalWord: "ADAPTADO",
      watchWord: "MAREO",
      alertWord: "SAS AGUDO",
    },
    marker: { site: "head", label: "VESTIBULAR · GRAYBIEL" },
  },
  {
    scenario: "case_bone_loss",
    number: 5,
    short: "Hueso",
    title: "Pérdida de masa ósea e hipercalciuria",
    mission: "ISS / Mir · ARED",
    year: "1990s–presente",
    astronauts: "Múltiples tripulaciones de larga duración",
    affectedCrew: ["A", "B"],
    affectedLabel: "Toda la tripulación, con mayor severidad en A y B",
    traceLabel: "ISS / MIR · ARED",
    dilemma:
      "Sin carga mecánica el remodelado óseo se inclina hacia la reabsorción: el calcio se va a la orina y el riesgo de litiasis renal crece en silencio durante meses.",
    traditional:
      "Densitometría al regreso; el riesgo de cálculo se descubre cuando ya hay cólico renal.",
    lightminute:
      "Carga ARED y calcio urinario en tendencia: la desviación personal aparece antes de la pérdida densitométrica y activa bone_loss_mitigation con la sesión de ejercicio correcta.",
    protocol: "bone_loss_mitigation",
    evidenceId: "HRP-OSTEOCLAST-BONE-LOSS",
    citations: [
      {
        text: "La ausencia de carga mecánica en microgravedad desplaza el remodelado esquelético hacia la reabsorción osteoclástica, aumentando la excreción urinaria de calcio y el riesgo de litiasis renal.",
        source: "NASA Human Research Program · Risks",
        url: "https://www.nasa.gov/hrp/risks",
      },
    ],
    critical: {
      key: "urinary_calcium",
      label: "Calcio urinario",
      unit: "mmol/L",
      decimals: 2,
      barMax: 5,
      direction: "high",
      watchAt: 3.5,
      alertAt: 4,
      normalWord: "ESTABLE",
      watchWord: "RESORCIÓN",
      alertWord: "HIPERCALCIURIA",
    },
    marker: { site: "kidney", label: "PROXY RENAL · U-Ca" },
  },
  {
    scenario: "case_confinement",
    number: 6,
    short: "Confinamiento",
    title: "Estrés psicológico y confinamiento",
    mission: "Salyut / Mir",
    year: "1980s–1990s",
    astronauts: "Múltiples tripulaciones de larga duración",
    affectedCrew: ["A", "C"],
    affectedLabel: "Tripulantes A y C",
    traceLabel: "SALYUT / MIR",
    dilemma:
      "Aislamiento, confinamiento y latencia de comunicación degradan el ánimo y el rendimiento sin un signo físico claro, y el conflicto interpersonal suele ser el primer aviso.",
    traditional:
      "La fatiga se reconoce en el informe psicológico posterior o cuando ya hay fricción en la tripulación.",
    lightminute:
      "Voz, sueño y PVT en la misma serie: la deriva multi-indicador cruza la banda personal hacia el día 11 y activa behavioral_countermeasure antes del conflicto.",
    protocol: "behavioral_countermeasure",
    evidenceId: "HRP-BEHAVIORAL-CONFINEMENT",
    citations: [
      {
        text: "El aislamiento, el confinamiento y la latencia de comunicaciones elevan el riesgo de fricción interpersonal, deterioro del ánimo y declive del rendimiento neuroconductual en misiones de espacio profundo.",
        source: "NASA Human Research Program · Risks",
        url: "https://www.nasa.gov/hrp/risks",
      },
    ],
    critical: {
      key: "voice_stress_idx",
      label: "Tensión vocal",
      unit: "0-1",
      decimals: 2,
      barMax: 1,
      direction: "high",
      watchAt: 0.55,
      alertAt: 0.7,
      normalWord: "BASAL",
      watchWord: "TENSIÓN",
      alertWord: "ASTENIA",
    },
    marker: { site: "head", label: "VOZ · TENSIÓN ACÚSTICA" },
  },
];

export function nasaCase(name: string | undefined | null): NasaCase | undefined {
  if (!name) return undefined;
  return NASA_CASES.find((item) => item.scenario === name);
}

export function nasaCaseForDoc(doc: ScenarioDoc | undefined | null): NasaCase | undefined {
  return nasaCase(doc?.name ?? doc?.scenario);
}

export function nasaCaseForScenario(scenario: LoadedScenario | null | undefined): NasaCase | undefined {
  return nasaCaseForDoc(scenario?.doc);
}

export type MetricTone = "normal" | "watch" | "alert";

export function metricTone(metric: CriticalMetric, value: number | undefined): MetricTone {
  if (typeof value !== "number" || !Number.isFinite(value)) return "normal";
  if (metric.direction === "high") {
    if (value >= metric.alertAt) return "alert";
    if (value >= metric.watchAt) return "watch";
    return "normal";
  }
  if (value <= metric.alertAt) return "alert";
  if (value <= metric.watchAt) return "watch";
  return "normal";
}

export function metricWord(metric: CriticalMetric, tone: MetricTone): string {
  return tone === "alert" ? metric.alertWord : tone === "watch" ? metric.watchWord : metric.normalWord;
}

export function formatMetric(metric: CriticalMetric, value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toFixed(metric.decimals)} ${metric.unit}`;
}

/** First mission day on which an affected crew member leaves `info`. */
export function detectionDay(doc: ScenarioDoc | undefined | null, affected: string[]): number | undefined {
  if (!doc) return undefined;
  for (const day of doc.days) {
    const hit = affected.some((id) => {
      const level = day.crew?.[id]?.level;
      return level === "watch" || level === "act" || level === "escalate";
    });
    if (hit) return day.day;
  }
  return undefined;
}
