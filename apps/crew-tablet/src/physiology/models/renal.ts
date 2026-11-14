/**
 * RENAL FLUID & ELECTROLYTE REGULATION (GAUER-HENRY REFLEX) MODEL
 * 
 * Represents Kidneys, Urinary Bladder, and Total Body Water Balance.
 * 
 * Scientific Foundation:
 * 1. Gauer, O. H., & Henry, J. P. (1976). Neurohormonal control of plasma volume.
 *    Cardiovascular Physiology II, 9, 145-190.
 * 2. Drummer, C., et al. (2000). Fluid and electrolyte regulation in space.
 *    Journal of Gravitational Physiology, 7(1), S19-S22.
 * 3. Norsk, P. (2015). Blood pressure regulation IV: adaptive responses to weightlessness.
 *    European Journal of Applied Physiology, 114(3), 481-497.
 * 4. Leach, C. S. (1992). Fluid and electrolyte regulation in spaceflight.
 *    Science, 256(5063), 1572-1574.
 */

import type { RenalState, SpaceflightContext } from "../types";
import { integrate } from "../integrator";

export interface RenalParameters {
  /** Baseline nominal Glomerular Filtration Rate (mL/min) ~115 [DATOS REALES] */
  gfr0_mLmin: number;
  /** Nominal tubular fluid reabsorption fraction ~0.991 */
  r0_reabsorption: number;
  /** Nominal daily fluid intake rate (mL/hour) ~105 mL/h (2.5 L/day) */
  nominalIntake_mLh: number;
  /** Baseline insensible perspiration and respiratory water loss (mL/hour) ~40 mL/h */
  insensibleLoss_mLh: number;
  /** Gauer-Henry reflex gain for ADH suppression */
  adhReflexGain: number;
}

export const DEFAULT_RENAL_PARAMS: RenalParameters = {
  gfr0_mLmin: 115.0,
  r0_reabsorption: 0.991,
  nominalIntake_mLh: 105.0,
  insensibleLoss_mLh: 40.0,
  adhReflexGain: 0.85,
};

/**
 * Solves renal fluid excretion and total body water dynamics over interval dt.
 * Coupled with thoracic fluid shift (thoracicShift_mL) from cardiovascular system.
 */
export function stepRenal(
  state: RenalState,
  thoracicShift_mL: number,
  context: SpaceflightContext,
  dt: number,
  params: RenalParameters = DEFAULT_RENAL_PARAMS
): RenalState {
  const gEffect = Math.max(0, Math.min(1, context.gLevel));

  // Gauer-Henry reflex: thoracic fluid shift stretches atria, causing:
  // 1. Suppression of Antidiuretic Hormone (ADH / Vasopressin)
  // 2. Secretion of Atrial Natriuretic Peptide (ANP)
  const shiftRatio = Math.min(1.0, thoracicShift_mL / 1750.0);
  
  // Transient early diuresis in flight: strongest in days 0-3, then adapts to contracted plasma
  const earlyFlightFactor = Math.exp(-context.missionDay / 4.0);
  const targetADHSuppression = shiftRatio * params.adhReflexGain * (1.0 - gEffect) * earlyFlightFactor;
  const targetANPStimulation = shiftRatio * 1.4 * (1.0 - gEffect) * earlyFlightFactor;

  const y0 = [state.fluidBalance_mL, state.adhSuppressionIndex, state.anpStimulationIndex];

  // Hourly intake and losses
  const currentIntake = params.nominalIntake_mLh * context.hydrationFactor;
  const currentInsensible = params.insensibleLoss_mLh * (1.0 + 0.6 * context.exerciseLoad);

  const derivatives = (_t: number, y: number[]): number[] => {
    const adh = y[1]!;
    const anp = y[2]!;

    // Tubular reabsorption fraction decreases during ADH suppression & ANP release
    const effectiveReabsorption = params.r0_reabsorption - 0.007 * adh - 0.005 * anp;
    const currentUrine_mLmin = params.gfr0_mLmin * (1.0 - effectiveReabsorption);
    const currentUrine_mLh = currentUrine_mLmin * 60.0;

    // Rate of net fluid balance change in mL/second
    const dFluidBal_dt = (currentIntake - currentUrine_mLh - currentInsensible) / 3600.0;

    // Hormone relaxation dynamics
    const dADH_dt = (targetADHSuppression - adh) / 14400.0; // 4-hour hormonal time constant
    const dANP_dt = (targetANPStimulation - anp) / 7200.0;

    return [dFluidBal_dt, dADH_dt, dANP_dt];
  };

  const bounds = [
    { min: -3500.0, max: 2000.0 }, // Net fluid balance deviation (mL)
    { min: 0.0, max: 1.0 },        // ADH suppression [0, 1]
    { min: 0.0, max: 2.0 },        // ANP stimulation [0, 2]
  ];

  const yNext = integrate(derivatives, 0, y0, dt, "rk4", 4, bounds);

  const nextFluidBal = yNext[0]!;
  const nextADH = yNext[1]!;
  const nextANP = yNext[2]!;

  const finalReabsorption = params.r0_reabsorption - 0.007 * nextADH - 0.005 * nextANP;
  const nextUrineRate_mLh = params.gfr0_mLmin * (1.0 - finalReabsorption) * 60.0;

  return {
    gfr_mLmin: params.gfr0_mLmin,
    urineOutput_mLh: nextUrineRate_mLh,
    fluidBalance_mL: nextFluidBal,
    adhSuppressionIndex: nextADH,
    anpStimulationIndex: nextANP,
  };
}
