/**
 * MUSCULOSKELETAL & BONE REMODELING (MECHANOSTAT) MODEL
 * 
 * Represents Vertebral Column (Spine), Weight-Bearing Bones, and Postural Skeletal Muscle.
 * 
 * Scientific Foundation:
 * 1. Lang, T., et al. (2004). Cortical and trabecular bone mineral loss in the spine and hip in
 *    long-duration spaceflight. Journal of Bone and Mineral Research, 19(6), 1006-1012.
 * 2. LeBlanc, A., et al. (2000). Bone mineral and lean tissue changes in ISS astronauts.
 *    Journal of Gravitational Physiology.
 * 3. Sibonga, J. D. (2013). Risk of early onset osteoporosis due to spaceflight.
 *    NASA Human Research Program Evidence Report.
 * 4. Frost, H. M. (2003). Bone's mechanostat: a 2003 update. The Anatomical Record, 275A(2), 1081-1101.
 */

import type { MusculoskeletalState, SpaceflightContext } from "../types";
import { integrate } from "../integrator";

export interface MusculoskeletalParameters {
  /** Daily baseline trabecular resorption rate in complete disuse (% per day) ~0.04% (~1.2% / month) [DATOS REALES] */
  dailyResorptionRate_pct: number;
  /** Countermeasure exercise osteogenic stimulation efficiency */
  exerciseOsteoEfficiency: number;
  /** Baseline daily bone calcium efflux rate (mg / day) ~180 mg/day */
  baselineCalciumEfflux_mgDay: number;
  /** Daily postural muscle atrophy rate under complete disuse (% per day) ~0.15% (~1.0% / week) */
  dailyMuscleAtrophyRate_pct: number;
}

export const DEFAULT_MUSCULO_PARAMS: MusculoskeletalParameters = {
  dailyResorptionRate_pct: 0.04, // ~1.2% per 30 days (Lang et al., 2004)
  exerciseOsteoEfficiency: 0.035,
  baselineCalciumEfflux_mgDay: 180.0,
  dailyMuscleAtrophyRate_pct: 0.14,
};

/**
 * Solves musculoskeletal remodeling and calcium efflux over interval dt (seconds).
 */
export function stepMusculoskeletal(
  state: MusculoskeletalState,
  context: SpaceflightContext,
  dt: number,
  params: MusculoskeletalParameters = DEFAULT_MUSCULO_PARAMS
): MusculoskeletalState {
  const gEffect = Math.max(0, Math.min(1, context.gLevel));

  // Effective mechanical load: combination of gravity load and countermeasure exercise (ARED/T2)
  const effectiveLoad = gEffect + 0.85 * context.exerciseLoad;

  const y0 = [state.trabecularBMDRatio, state.muscleVolumeRatio];

  const derivatives = (_t: number, _y: number[]): number[] => {
    // Bone remodeling balance:
    // If effectiveLoad < 1.0, resorption exceeds formation
    const mechanicalDeficit = Math.max(0, 1.0 - effectiveLoad);
    const osteogenicDrive = context.exerciseLoad * params.exerciseOsteoEfficiency;
    const dBMD_perDay = - (params.dailyResorptionRate_pct / 100.0) * mechanicalDeficit + osteogenicDrive;

    // Muscle protein balance:
    const muscleDeficit = Math.max(0, 1.0 - effectiveLoad);
    const dMuscle_perDay = - (params.dailyMuscleAtrophyRate_pct / 100.0) * muscleDeficit + 0.0012 * context.exerciseLoad;

    // Convert from per-day to per-second
    return [dBMD_perDay / 86400.0, dMuscle_perDay / 86400.0];
  };

  const bounds = [
    { min: 0.65, max: 1.15 }, // BMD ratio bounds [0.65, 1.15]
    { min: 0.70, max: 1.15 }, // Muscle volume ratio bounds [0.70, 1.15]
  ];

  const yNext = integrate(derivatives, 0, y0, dt, "rk4", 4, bounds);
  const nextBMD = yNext[0]!;
  const nextMuscle = yNext[1]!;

  // Calcium efflux from bone resorption into extracellular fluid and urine:
  // Excess osteoclastic resorption releases up to +150-250 mg extra Ca2+/day
  const excessResorptionFraction = Math.max(0, 1.0 - nextBMD);
  const currentEfflux = params.baselineCalciumEfflux_mgDay + 850.0 * excessResorptionFraction * (1.0 - gEffect);

  return {
    trabecularBMDRatio: nextBMD,
    calciumEfflux_mgDay: currentEfflux,
    muscleVolumeRatio: nextMuscle,
    mechanicalLoadFraction: effectiveLoad,
  };
}

