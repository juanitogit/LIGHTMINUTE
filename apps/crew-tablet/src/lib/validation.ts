/**
 * Parser for `public/data/validation.json` (A5 benchmark export).
 *
 * Every number here is produced by `ml/validation/run_all.py` on SYNTHETIC
 * crews, at an equal false-alarm budget with tuning and report seeds disjoint.
 * The page must show the design and the limitations next to the results,
 * otherwise the percentages read as accuracy claims they are not.
 */

export interface ValidationMethod {
  id: string;
  name: string;
  faPerWeek?: number;
  recall: { mild?: number; moderate?: number; strong?: number };
  delayDays?: number;
}

export interface ValidationScenario {
  id: string;
  title: string;
  multiplier?: number;
  methods: ValidationMethod[];
}

export interface ValidationDesign {
  budgetPerWeek?: number;
  tuningSeeds?: number;
  reportSeeds?: number;
  experimentSeeds?: number;
  days?: number;
  onsetDay?: number;
  warmupDays?: number;
  horizonDays?: number;
  effectUnit?: string;
}

export interface ValidationReport {
  synthetic: boolean;
  label?: string;
  generatedBy?: string;
  design: ValidationDesign;
  scenarios: ValidationScenario[];
  calibration?: {
    nominal?: number;
    overall?: number;
    n?: number;
    byIndicator: { indicator: string; coverage: number }[];
  };
  missingData: {
    missingFraction: number;
    recall: Record<string, number>;
    faPerWeek: Record<string, number>;
  }[];
  baselineLength: { days: number; recall: Record<string, number> }[];
  limitations: string[];
  note?: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function numMap(value: unknown): Record<string, number> {
  const raw = record(value);
  if (!raw) return {};
  return Object.fromEntries(
    Object.entries(raw).flatMap(([key, item]) => {
      const parsed = num(item);
      return parsed === undefined ? [] : [[key, parsed] as [string, number]];
    }),
  );
}

function method(value: unknown): ValidationMethod | null {
  const raw = record(value);
  if (!raw) return null;
  const id = str(raw.id);
  if (!id) return null;
  const recall = record(raw.recall) ?? {};
  return {
    id,
    name: str(raw.name) ?? id,
    faPerWeek: num(raw.fa_per_week),
    recall: { mild: num(recall.mild), moderate: num(recall.moderate), strong: num(recall.strong) },
    delayDays: num(raw.median_delay_moderate_days),
  };
}

export function parseValidation(raw: unknown): ValidationReport | null {
  const doc = record(raw);
  if (!doc) return null;
  const scenarios = Array.isArray(doc.scenarios)
    ? doc.scenarios.flatMap((item) => {
        const entry = record(item);
        if (!entry) return [];
        const methods = Array.isArray(entry.methods)
          ? entry.methods.map(method).filter((m): m is ValidationMethod => m !== null)
          : [];
        if (methods.length === 0) return [];
        return [{
          id: str(entry.id) ?? "scenario",
          title: str(entry.title) ?? "Scenario",
          multiplier: num(entry.between_person_sd_multiplier),
          methods,
        }];
      })
    : [];
  if (scenarios.length === 0) return null;

  const designRaw = record(doc.design) ?? {};
  const calibrationRaw = record(doc.calibration);
  const byIndicator = record(calibrationRaw?.by_indicator)
    ? Object.entries(calibrationRaw!.by_indicator as Record<string, unknown>)
        .flatMap(([indicator, coverage]) => {
          const parsed = num(coverage);
          return parsed === undefined ? [] : [{ indicator, coverage: parsed }];
        })
    : [];

  const missingData = Array.isArray(doc.missing_data)
    ? doc.missing_data.flatMap((item) => {
        const entry = record(item);
        const fraction = num(entry?.missing_fraction);
        if (!entry || fraction === undefined) return [];
        return [{ missingFraction: fraction, recall: numMap(entry.recall_moderate), faPerWeek: numMap(entry.fa_per_week) }];
      })
    : [];

  const baselineLength = Array.isArray(doc.baseline_length)
    ? doc.baseline_length.flatMap((item) => {
        const entry = record(item);
        const days = num(entry?.baseline_days);
        if (!entry || days === undefined) return [];
        return [{ days, recall: numMap(entry.recall_moderate) }];
      })
    : [];

  return {
    synthetic: doc.synthetic === true,
    label: str(doc.label),
    generatedBy: str(doc.generated_by),
    design: {
      budgetPerWeek: num(designRaw.false_alarm_budget_per_crew_week),
      tuningSeeds: num(designRaw.tuning_seeds),
      reportSeeds: num(designRaw.report_seeds),
      experimentSeeds: num(designRaw.experiment_seeds),
      days: num(designRaw.days),
      onsetDay: num(designRaw.onset_day),
      warmupDays: num(designRaw.warmup_days),
      horizonDays: num(designRaw.detection_horizon_days),
      effectUnit: str(designRaw.effect_unit),
    },
    scenarios,
    calibration:
      calibrationRaw || byIndicator.length > 0
        ? {
            nominal: num(calibrationRaw?.nominal),
            overall: num(calibrationRaw?.overall_coverage),
            n: num(calibrationRaw?.n),
            byIndicator,
          }
        : undefined,
    missingData,
    baselineLength,
    limitations: Array.isArray(doc.limitations)
      ? doc.limitations.filter((item): item is string => typeof item === "string")
      : [],
    note: str(doc.note),
  };
}

/** 0.704 -> "70%". The report itself rounds to whole points. */
export function pct(value: number | undefined): string {
  return value === undefined ? "—" : `${Math.round(value * 100)}%`;
}

export function methodIds(report: ValidationReport): string[] {
  const ids = new Set<string>();
  for (const scenario of report.scenarios) for (const m of scenario.methods) ids.add(m.id);
  return Array.from(ids);
}
