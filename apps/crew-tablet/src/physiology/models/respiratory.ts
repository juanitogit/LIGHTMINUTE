/**
 * PULMONARY & ALVEOLAR GAS EXCHANGE MODEL
 * 
 * Represents Lungs, Alveolar-Capillary Gas Exchange, and Hypercapnic Ventilatory Drive.
 * 
 * Scientific Foundation:
 * 1. West, J. B. (2000). Respiratory system under microgravity. Physiological Reviews, 80(3), 977-1011.
 * 2. Prisk, G. K. (2014). Microgravity and the lung. Journal of Applied Physiology, 116(8), 1076-1083.
 * 3. Law, J., et al. (2014). Relationship Between Carbon Dioxide Levels and Reported Headaches on the
 *    International Space Station. NASA Technical Publication TP-2014-217391.
 * 4. Severinghaus, J. W. (1979). Simple, accurate equations for human blood O2 dissociation computations.
 *    Journal of Applied Physiology, 46(3), 599-602.
 */

import type { PulmonaryState, SpaceflightContext } from "../types";
import { integrate } from "../integrator";

export interface RespiratoryParameters {
  /** Baseline resting respiratory rate (breaths / min) ~14 [DATOS REALES] */
  rr0_bpm: number;
  /** Baseline resting tidal volume (L) ~0.50 L [DATOS REALES] */
  vt0_L: number;
  /** Anatomical dead space (L) ~0.15 L */
  vd0_L: number;
  /** Alveolar gas volume capacity (L) ~2.4 L */
  vAlv_L: number;
  /** Metabolic CO2 production rate (mL / min) ~220 mL/min */
  vCO2_mLmin: number;
  /** Respiratory exchange ratio (R = VCO2 / VO2) ~0.82 */
  respiratoryQuotient: number;
  /** Cabin barometric pressure (mmHg) ~760 mmHg */
  pBaro_mmHg: number;
  /** Water vapor pressure at 37 C (mmHg) = 47 mmHg */
  pH2O_mmHg: number;
  /** Fraction of inspired oxygen (FiO2) ~0.21 */
  fiO2: number;
  /** Chemoreceptor sensitivity to arterial/alveolar PCO2 (breaths/min per mmHg) */
  chemoreceptorGain: number;
}

export const DEFAULT_RESPIRATORY_PARAMS: RespiratoryParameters = {
  rr0_bpm: 14.0,
  vt0_L: 0.52,
  vd0_L: 0.15,
  vAlv_L: 2.4,
  vCO2_mLmin: 220.0,
  respiratoryQuotient: 0.82,
  pBaro_mmHg: 760.0,
  pH2O_mmHg: 47.0,
  fiO2: 0.2095,
  chemoreceptorGain: 1.15,
};

/**
 * Severinghaus analytical equation for hemoglobin oxygen saturation (SpO2)
 */
function calculateSpO2(paO2_mmHg: number): number {
  if (paO2_mmHg <= 0) return 0.0;
  const sO2 = 100.0 / (1.0 + 23400.0 / (Math.pow(paO2_mmHg, 3) + 150.0 * paO2_mmHg));
  return Math.max(0.0, Math.min(100.0, sO2));
}

/**
 * Solves the pulmonary state dynamics over interval dt.
 */
export function stepRespiratory(
  state: PulmonaryState,
  context: SpaceflightContext,
  dt: number,
  params: RespiratoryParameters = DEFAULT_RESPIRATORY_PARAMS
): PulmonaryState {
  const gEffect = Math.max(0, Math.min(1, context.gLevel));

  // In 0G, absence of gravity-dependent ventilation-perfusion mismatch decreases physiological dead space slightly (~8%)
  const deadSpace = params.vd0_L * (1.0 - 0.08 * (1.0 - gEffect));

  // Inspired partial pressure of CO2 from cabin atmosphere (ppm converted to mmHg)
  // PiCO2 = (ppm / 1,000,000) * (Pbaro - pH2O)
  const piCO2_mmHg = (context.cabinCO2_ppm / 1000000.0) * (params.pBaro_mmHg - params.pH2O_mmHg);

  // Inspired partial pressure of O2
  const piO2_mmHg = params.fiO2 * (params.pBaro_mmHg - params.pH2O_mmHg);

  // Exercise factor increases metabolic CO2 production up to 4x during high workloads
  const currentVCO2 = params.vCO2_mLmin * (1.0 + 3.2 * context.exerciseLoad);

  const y0 = [state.alveolarPCO2_mmHg, state.respiratoryRate_bpm];

  const derivatives = (_t: number, y: number[]): number[] => {
    const paCO2 = y[0]!;
    const rr = y[1]!;

    // Tidal volume scales with ventilatory demand
    const currentVT = params.vt0_L * (1.0 + 0.35 * Math.max(0, (paCO2 - 40.0) / 10.0) + 0.8 * context.exerciseLoad);
    const alvVent_Lmin = Math.max(1.0, (rr * (currentVT - deadSpace)));

    // Dynamic mass balance of alveolar CO2:
    // d(PaCO2)/dt = (1 / V_alv) * [ (VCO2 * (PB - 47) / 1000) - alvVent * (PaCO2 - PiCO2) ]
    const co2Inflow = (currentVCO2 * (params.pBaro_mmHg - params.pH2O_mmHg)) / 1000.0;
    const co2Outflow = alvVent_Lmin * (paCO2 - piCO2_mmHg);
    const dPaCO2_dt = (co2Inflow - co2Outflow) / (params.vAlv_L * 60.0);

    // Chemoreflex target respiratory rate
    const targetRR = params.rr0_bpm + params.chemoreceptorGain * Math.max(0, paCO2 - 40.0) + context.exerciseLoad * 18.0;
    const dRR_dt = (targetRR - rr) / 10.0; // 10-second chemoreflex time constant

    return [dPaCO2_dt, dRR_dt];
  };

  const bounds = [
    { min: 25.0, max: 65.0 }, // PaCO2 bounds (mmHg)
    { min: 8.0, max: 48.0 },  // Respiratory rate bounds (bpm)
  ];

  const yNext = integrate(derivatives, 0, y0, dt, "rk4", 4, bounds);

  const nextPaCO2 = yNext[0]!;
  const nextRR = yNext[1]!;

  const currentVT = params.vt0_L * (1.0 + 0.35 * Math.max(0, (nextPaCO2 - 40.0) / 10.0) + 0.8 * context.exerciseLoad);
  const nextAlvVent = Math.max(1.0, nextRR * (currentVT - deadSpace));

  // Alveolar Gas Equation: PaO2 = PiO2 - (PaCO2 / R)
  const nextPaO2 = Math.max(40.0, piO2_mmHg - (nextPaCO2 / params.respiratoryQuotient));

  // Arterial SpO2 percentage
  const nextSpO2 = calculateSpO2(nextPaO2);

  // Hypercapnic drive factor (1.0 = normal, >1.3 = elevated ventilatory stress from cabin CO2)
  const hypercapnicDrive = 1.0 + Math.max(0, (nextPaCO2 - 40.0) / 10.0);

  return {
    respiratoryRate_bpm: nextRR,
    tidalVolume_L: currentVT,
    alveolarVentilation_Lmin: nextAlvVent,
    alveolarPCO2_mmHg: nextPaCO2,
    alveolarPO2_mmHg: nextPaO2,
    arterialSpO2_pct: nextSpO2,
    hypercapnicDrive,
  };
}
