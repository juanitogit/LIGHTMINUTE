/**
 * THERMAL-METABOLIC & CORE TEMPERATURE ("SPACE FEVER") MODEL
 * 
 * Represents Liver, Core Temperature Regulation, Metabolic Heat, and Convective Dissipation.
 * 
 * Scientific Foundation:
 * 1. Stahn, A. C., et al. (2017). Increased core body temperature in astronauts during long-duration
 *    space flight. Scientific Reports, 7(1), 17777.
 * 2. Gunga, H. C., et al. (2016). Cardiovascular system and thermal regulation in space.
 *    In Essentials of Clinical Human Space Physiology (pp. 77-94). Springer.
 * 3. Werner, J. (1998). Thermoregulation and heat exchange in space. International Journal of Biometeorology.
 */

import type { ThermalMetabolicState, SpaceflightContext } from "../types";
import { integrate } from "../integrator";

export interface ThermalParameters {
  /** Baseline resting core body temperature (C) ~36.8 [DATOS REALES] */
  tCore0_C: number;
  /** Mean body heat capacity (J / C) ~260,000 J/C for a 75 kg human */
  heatCapacity_J_C: number;
  /** Basal resting metabolic heat production rate (Watts) ~85 W (Liver ~25%, Brain ~20%, Heart ~10%) */
  basalMetabolic_W: number;
  /** 1G nominal heat transfer coefficient (W / C) */
  hTransfer0_W_C: number;
  /** Microgravity convective impairment factor on ISS/cabin (~0.25 reduction) */
  microgravityImpairmentFactor: number;
}

export const DEFAULT_THERMAL_PARAMS: ThermalParameters = {
  tCore0_C: 36.85,
  heatCapacity_J_C: 260000.0,
  basalMetabolic_W: 88.0,
  hTransfer0_W_C: 6.13, // 88 W / (36.85 - 22.5 C) = 6.13 W/C in clothed 1G resting baseline
  microgravityImpairmentFactor: 0.28, // 28% reduction in passive heat loss in 0G (Stahn et al., 2017)
};

/**
 * Solves core thermal and hepatic metabolic heat dynamics over interval dt.
 */
export function stepThermalMetabolic(
  state: ThermalMetabolicState,
  context: SpaceflightContext,
  dt: number,
  params: ThermalParameters = DEFAULT_THERMAL_PARAMS
): ThermalMetabolicState {
  const gEffect = Math.max(0, Math.min(1, context.gLevel));

  // In 0G, absence of natural buoyant air convection around the skin reduces heat dissipation:
  // Convective heat transfer coefficient drops (Stahn et al., 2017)
  const impairment = params.microgravityImpairmentFactor * (1.0 - gEffect);
  const effectiveHT = params.hTransfer0_W_C * (1.0 - impairment);

  // Exercise heat load: active muscle heat generation up to +400 W
  const metabolicHeat = params.basalMetabolic_W * (1.0 + 4.5 * context.exerciseLoad);

  const y0 = [state.coreTemp_C];

  const derivatives = (_t: number, y: number[]): number[] => {
    const tCore = y[0]!;

    // Heat loss from core through skin to cabin environment:
    // Q_loss = effectiveHT * (Tcore - Tambient) + Autonomic sweating compensation
    const deltaT = tCore - context.ambientTemp_C;
    // Sweating activates when core temperature exceeds baseline setpoint
    const sweating_W = Math.max(0, tCore - params.tCore0_C) * 75.0 * (1.0 - impairment * 0.4);
    const heatLoss = effectiveHT * deltaT + sweating_W;

    // dTcore/dt = (Metabolic - HeatLoss) / HeatCapacity
    const dTCore_dt = (metabolicHeat - heatLoss) / params.heatCapacity_J_C;

    return [dTCore_dt];
  };

  const bounds = [
    { min: 35.0, max: 41.5 }, // Core temp bounds (C)
  ];

  const yNext = integrate(derivatives, 0, y0, dt, "rk4", 4, bounds);
  const nextTCore = yNext[0]!;

  const currentDeltaT = nextTCore - context.ambientTemp_C;
  const currentHeatLoss = effectiveHT * currentDeltaT;
  const nextSkinTemp = context.ambientTemp_C + 0.65 * currentDeltaT;

  // Stahn et al. documented a progressive baseline shift in resting core temperature (+0.8 - +1.0 C)
  // and circadian acrophase disruption over mission duration.
  const circadianShift = 1.2 * (1.0 - gEffect) * (1.0 - Math.exp(-context.missionDay / 20.0));

  return {
    coreTemp_C: nextTCore,
    skinTemp_C: nextSkinTemp,
    metabolicHeat_W: metabolicHeat,
    heatLossRate_W: currentHeatLoss,
    convectiveImpairment: impairment,
    circadianShift_hours: circadianShift,
  };
}
