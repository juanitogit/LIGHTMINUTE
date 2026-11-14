/**
 * NEURO-OCULAR & INTRACRANIAL FLUID PRESSURE (SANS) MODEL
 * 
 * Represents Brain, Eyes, Optic Nerve Sheath, and Vestibular System.
 * 
 * Scientific Foundation:
 * 1. Stenger, M. B., et al. (2017). Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS).
 *    NASA Human Research Program Evidence Book.
 * 2. Lakin, W. D., et al. (2007). A mathematical model of intracranial pressure and cerebral
 *    blood flow under microgravity. Mathematical and Computer Modelling, 46(3-4), 620-639.
 * 3. Mader, T. H., et al. (2011). Optic disc edema, globe flattening, choroidal folds, and hyperopic
 *    shifts in astronauts. Ophthalmology, 118(10), 2058-2069.
 * 4. Reschke, M. F., et al. (2014). Vestibular adaptation to spaceflight. NASA HRP.
 */

import type { NeuroOcularState, SpaceflightContext } from "../types";
import { integrate } from "../integrator";


export interface NeuroOcularParameters {
  /** Baseline upright Earth ICP in mmHg (~1.0 mmHg) [DATOS REALES] */
  icp0_standing_mmHg: number;
  /** Craniospinal fluid compliance (mL / mmHg) ~0.8 */
  craniospinalCompliance: number;
  /** Venous CSF outflow resistance (mmHg * min / mL) ~8.5 */
  venousOutflowResistance: number;
  /** Normal CSF production rate (mL / min) ~0.35 */
  csfProductionRate_mLmin: number;
  /** Baseline intraocular pressure in mmHg ~14.5 [DATOS REALES] */
  iop0_mmHg: number;
  /** Time constant for neurovestibular adaptation (seconds) ~3 days (259200 s) */
  tauVestibular_s: number;
}

export const DEFAULT_NEURO_PARAMS: NeuroOcularParameters = {
  icp0_standing_mmHg: 1.5,
  craniospinalCompliance: 0.85,
  venousOutflowResistance: 8.5,
  csfProductionRate_mLmin: 0.35,
  iop0_mmHg: 14.5,
  tauVestibular_s: 259200.0, // 3 days
};

/**
 * Solves the neuro-ocular state dynamics over interval dt.
 * Coupled with jugular venous pressure (jvp_mmHg) from the cardiovascular system.
 */
export function stepNeuroOcular(
  state: NeuroOcularState,
  jvp_mmHg: number,
  context: SpaceflightContext,
  dt: number,
  params: NeuroOcularParameters = DEFAULT_NEURO_PARAMS
): NeuroOcularState {
  const gEffect = Math.max(0, Math.min(1, context.gLevel));

  // In 0G, absence of downward hydrostatic gradient keeps target ICP elevated (~13-15 mmHg)
  // In 1G upright, target is lower (~2 mmHg).
  const targetICP_gravity = params.icp0_standing_mmHg + 12.0 * (1.0 - gEffect);
  
  // Elevating cabin CO2 causes mild cerebral vasodilation which increases ICP further
  // (Law et al., 2014: cabin CO2 elevation correlates with astronaut headache & ICP shifts)
  const co2Dilatation_mmHg = Math.max(0, (context.cabinCO2_ppm - 600.0) / 1000.0) * 1.5;
  const targetICP = targetICP_gravity + co2Dilatation_mmHg + (jvp_mmHg - 3.0) * 0.45;

  const y0 = [state.intracranialPressure_mmHg, state.vestibularAdaptation];

  const derivatives = (_t: number, y: number[]): number[] => {
    const icp = y[0]!;
    const vest = y[1]!;

    // d(ICP)/dt = (targetICP - ICP) / tauICP
    const dICP_dt = (targetICP - icp) / 1800.0; // 30-minute CSF equilibration time

    // Vestibular adaptation rate: approaches 1.0 asymptotically over ~3 days
    const dVest_dt = (1.0 - vest) / params.tauVestibular_s;

    return [dICP_dt, dVest_dt];
  };

  const bounds = [
    { min: -2.0, max: 28.0 }, // ICP bounds (mmHg)
    { min: 0.0, max: 1.0 },   // Vestibular adaptation index [0, 1]
  ];

  const yNext = integrate(derivatives, 0, y0, dt, "rk4", 4, bounds);

  const nextICP = yNext[0]!;
  const nextVest = yNext[1]!;

  // Intraocular pressure maintains slight autoregulation around 14.5 mmHg with small fluid shift component
  const nextIOP = params.iop0_mmHg + 1.8 * (1.0 - gEffect) * Math.exp(-context.missionDay / 5.0);

  // Translaminar cribrosa pressure difference (IOP - ICP)
  const nextTLCPD = nextIOP - nextICP;

  // Optic nerve sheath strain: increases when ICP exceeds normal physiological threshold (~10 mmHg)
  // for multiple days, contributing to optic disc edema (SANS)
  const chronicExposureDays = Math.max(0, context.missionDay);
  const excessPressure = Math.max(0, nextICP - 10.0);
  const nextStrain = 1.0 + (excessPressure / 10.0) * (1.0 - Math.exp(-chronicExposureDays / 14.0)) * 0.35;

  // Cerebral blood flow velocity index (cm/s, baseline ~58 cm/s middle cerebral artery)
  const nextCBF = 58.0 + co2Dilatation_mmHg * 2.2;

  return {
    intracranialPressure_mmHg: nextICP,
    intraocularPressure_mmHg: nextIOP,
    translaminarPressure_mmHg: nextTLCPD,
    opticNerveSheathStrain: nextStrain,
    vestibularAdaptation: nextVest,
    cerebralBloodFlow_cms: nextCBF,
  };
}
