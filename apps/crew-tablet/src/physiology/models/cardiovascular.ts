/**
 * CARDIOVASCULAR & HEMODYNAMIC SPACEFLIGHT ADAPTATION MODEL
 * 
 * Represents Heart, Aorta, Internal Jugular Veins, and peripheral vasculature.
 * 
 * Scientific Foundation:
 * 1. Blomqvist, C. G., & Stone, H. L. (1983). Cardiovascular adjustments to gravitational stress.
 *    Handbook of Physiology, The Cardiovascular System, Peripheral Circulation and Organ Blood Flow.
 * 2. Buckey, J. C., et al. (1996). Central venous pressure in space. New England Journal of Medicine, 334(6), 370-372.
 * 3. Marshall-Goebel, K., et al. (2019). Assessment of jugular venous blood flow stasis on the ISS.
 *    JAMA Network Open, 2(11), e1915011.
 * 4. Leach, C. S., Alfrey, C. P., et al. (1996). Regulation of body fluid compartments during short-duration spaceflight.
 *    Journal of Applied Physiology, 81(1), 105-116.
 */

import type { CardiovascularState, SpaceflightContext } from "../types";
import { integrate } from "../integrator";


export interface CardiovascularParameters {
  /** Baseline resting heart rate (bpm) [DATOS REALES] */
  hr0_bpm: number;
  /** Baseline stroke volume (mL) [DATOS REALES] */
  sv0_mL: number;
  /** Baseline mean arterial pressure (mmHg) [DATOS REALES] */
  map0_mmHg: number;
  /** Total peripheral resistance baseline (mmHg * min / L) */
  tpr0: number;
  /** Maximum cephalad fluid shift volume in 0G (mL) ~1800 mL (Blomqvist & Stone, 1983) */
  maxFluidShift_mL: number;
  /** Time constant for cephalad fluid redistribution (seconds) ~2 hours */
  tauShift_s: number;
  /** Time constant for hypovolemic plasma contraction (seconds) ~48 hours */
  tauPlasma_s: number;
  /** Baroreflex gain (bpm / mmHg) */
  kBaro: number;
}

export const DEFAULT_CARDIO_PARAMS: CardiovascularParameters = {
  hr0_bpm: 65.0,
  sv0_mL: 72.0,
  map0_mmHg: 92.0,
  tpr0: 19.6, // 92 / (65 * 0.072 = 4.68 L/min)
  maxFluidShift_mL: 1750.0,
  tauShift_s: 7200.0, // 2 hours
  tauPlasma_s: 172800.0, // 48 hours
  kBaro: 0.85,
};

/**
 * Solves the ODE state update for the cardiovascular system over interval dt.
 * State vector: [heartRate_bpm, thoracicShift_mL, plasmaVolumeFraction]
 */
export function stepCardiovascular(
  state: CardiovascularState,
  context: SpaceflightContext,
  dt: number,
  params: CardiovascularParameters = DEFAULT_CARDIO_PARAMS
): CardiovascularState {
  // Target fluid shift as a function of gravity: 0G = maxFluidShift, 1G = 0
  const gEffect = Math.max(0, Math.min(1, context.gLevel));
  const targetShift = params.maxFluidShift_mL * (1.0 - gEffect);
  
  // Target plasma volume in space (contracts ~12% in microgravity)
  const targetPlasma = 1.0 - 0.12 * (1.0 - gEffect) * context.hydrationFactor;

  // Exercise factor increases target heart rate and reduces peripheral resistance
  const exerciseHRBoost = context.exerciseLoad * 75.0; // up to +75 bpm during high exercise
  const exerciseTPRFactor = 1.0 / (1.0 + 1.2 * context.exerciseLoad);

  const y0 = [state.heartRate_bpm, state.thoracicFluidShift_mL, state.plasmaVolumeFraction];

  // Derivative function
  const derivatives = (_t: number, y: number[]): number[] => {
    const hr = y[0]!;
    const shift = y[1]!;
    const plasma = y[2]!;

    // d(shift)/dt = (targetShift - shift) / tauShift
    const dShift_dt = (targetShift - shift) / params.tauShift_s;

    // d(plasma)/dt = (targetPlasma - plasma) / tauPlasma
    const dPlasma_dt = (targetPlasma - plasma) / params.tauPlasma_s;

    // Frank-Starling stroke volume estimate
    const currentSV = params.sv0_mL * (1.0 + 0.18 * (shift / params.maxFluidShift_mL)) * plasma;
    const currentCO = (hr * currentSV) / 1000.0;
    const currentMAP = currentCO * (params.tpr0 * exerciseTPRFactor);

    // Baroreflex heart rate target
    const targetHR = params.hr0_bpm + params.kBaro * (params.map0_mmHg - currentMAP) + exerciseHRBoost;
    const dHR_dt = (targetHR - hr) / 30.0; // 30-second baroreflex settling

    return [dHR_dt, dShift_dt, dPlasma_dt];
  };

  const bounds = [
    { min: 40.0, max: 195.0 }, // Heart rate bounds
    { min: 0.0, max: 2200.0 }, // Thoracic fluid shift bounds (mL)
    { min: 0.75, max: 1.25 },  // Plasma volume fraction bounds
  ];

  const yNext = integrate(derivatives, 0, y0, dt, "rk4", 4, bounds);

  const nextHR = yNext[0]!;
  const nextShift = yNext[1]!;
  const nextPlasma = yNext[2]!;

  // Derive final hemodynamic pressures and flows
  const nextSV = params.sv0_mL * (1.0 + 0.18 * (nextShift / params.maxFluidShift_mL)) * nextPlasma;
  const nextCO = (nextHR * nextSV) / 1000.0;
  const nextMAP = nextCO * (params.tpr0 * exerciseTPRFactor);

  // Central venous pressure: baseline 4 mmHg + shift contribution - hypovolemia offset
  const nextCVP = 4.0 + 4.5 * (nextShift / params.maxFluidShift_mL) - 2.5 * (1.0 - nextPlasma);

  // Internal Jugular Venous Pressure: elevated significantly in 0G due to loss of downward gravity
  // (Marshall-Goebel et al. reported JVP resting elevated at ~8-12 mmHg on ISS vs ~2 mmHg Earth standing)
  const nextJVP = Math.max(1.0, nextCVP + 5.5 * (1.0 - gEffect));

  return {
    heartRate_bpm: nextHR,
    strokeVolume_mL: nextSV,
    cardiacOutput_Lmin: nextCO,
    meanArterialPressure_mmHg: nextMAP,
    centralVenousPressure_mmHg: nextCVP,
    jugularVenousPressure_mmHg: nextJVP,
    plasmaVolumeFraction: nextPlasma,
    thoracicFluidShift_mL: nextShift,
  };
}

