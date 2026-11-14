/**
 * PHYSIOLOGICAL MULTI-ORGAN SIMULATION ENGINE
 * 
 * Orchestrates multi-organ physiological integration, state coupling,
 * and environmental spaceflight response.
 */

import type {
  CardiovascularState,
  FullOrganismPhysiology,
  MusculoskeletalState,
  NeuroOcularState,
  PulmonaryState,
  RenalState,
  SpaceflightContext,
  ThermalMetabolicState,
} from "./types";
import { stepCardiovascular } from "./models/cardiovascular";
import { stepNeuroOcular } from "./models/neuro-ocular";
import { stepRespiratory } from "./models/respiratory";
import { stepRenal } from "./models/renal";
import { stepThermalMetabolic } from "./models/thermal-metabolic";
import { stepMusculoskeletal } from "./models/musculoskeletal";

export const NOMINAL_PREFLIGHT_CARDIO: CardiovascularState = {
  heartRate_bpm: 65.0,
  strokeVolume_mL: 72.0,
  cardiacOutput_Lmin: 4.68,
  meanArterialPressure_mmHg: 92.0,
  centralVenousPressure_mmHg: 4.0,
  jugularVenousPressure_mmHg: 2.0,
  plasmaVolumeFraction: 1.0,
  thoracicFluidShift_mL: 0.0,
};

export const NOMINAL_PREFLIGHT_NEURO: NeuroOcularState = {
  intracranialPressure_mmHg: 1.5,
  intraocularPressure_mmHg: 14.5,
  translaminarPressure_mmHg: 13.0,
  opticNerveSheathStrain: 1.0,
  vestibularAdaptation: 1.0,
  cerebralBloodFlow_cms: 58.0,
};

export const NOMINAL_PREFLIGHT_PULMONARY: PulmonaryState = {
  respiratoryRate_bpm: 14.0,
  tidalVolume_L: 0.52,
  alveolarVentilation_Lmin: 5.18,
  alveolarPCO2_mmHg: 40.0,
  alveolarPO2_mmHg: 102.0,
  arterialSpO2_pct: 98.2,
  hypercapnicDrive: 1.0,
};

export const NOMINAL_PREFLIGHT_RENAL: RenalState = {
  gfr_mLmin: 115.0,
  urineOutput_mLh: 62.1,
  fluidBalance_mL: 0.0,
  adhSuppressionIndex: 0.0,
  anpStimulationIndex: 0.0,
};

export const NOMINAL_PREFLIGHT_THERMAL: ThermalMetabolicState = {
  coreTemp_C: 36.85,
  skinTemp_C: 33.2,
  metabolicHeat_W: 88.0,
  heatLossRate_W: 88.0,
  convectiveImpairment: 0.0,
  circadianShift_hours: 0.0,
};

export const NOMINAL_PREFLIGHT_MUSCULO: MusculoskeletalState = {
  trabecularBMDRatio: 1.0,
  calciumEfflux_mgDay: 180.0,
  muscleVolumeRatio: 1.0,
  mechanicalLoadFraction: 1.0,
};

export class PhysiologySimulationEngine {
  private state: FullOrganismPhysiology;

  constructor(initialContext?: Partial<SpaceflightContext>) {
    const context: SpaceflightContext = {
      gLevel: initialContext?.gLevel ?? 0.0, // Default to microgravity
      cabinCO2_ppm: initialContext?.cabinCO2_ppm ?? 2200.0, // Typical ISS/exploration cabin CO2
      missionDay: initialContext?.missionDay ?? 1,
      ambientTemp_C: initialContext?.ambientTemp_C ?? 22.5,
      exerciseLoad: initialContext?.exerciseLoad ?? 0.0,
      hydrationFactor: initialContext?.hydrationFactor ?? 1.0,
    };

    this.state = {
      time_seconds: 0,
      missionDay: context.missionDay,
      context,
      cardiovascular: { ...NOMINAL_PREFLIGHT_CARDIO },
      neuroOcular: { ...NOMINAL_PREFLIGHT_NEURO },
      pulmonary: { ...NOMINAL_PREFLIGHT_PULMONARY },
      renal: { ...NOMINAL_PREFLIGHT_RENAL },
      thermalMetabolic: { ...NOMINAL_PREFLIGHT_THERMAL },
      musculoskeletal: { ...NOMINAL_PREFLIGHT_MUSCULO },
    };
  }

  public getState(): FullOrganismPhysiology {
    return { ...this.state };
  }

  public setContext(newContext: Partial<SpaceflightContext>): void {
    this.state.context = {
      ...this.state.context,
      ...newContext,
    };
    this.state.missionDay = this.state.context.missionDay;
  }

  /**
   * Advance the simulation by dt seconds with cross-organ physiological coupling.
   */
  public step(dt: number = 60.0): FullOrganismPhysiology {
    const ctx = this.state.context;

    // 1. Cardiovascular step (drives thoracic fluid shift and central/jugular venous pressures)
    const nextCardio = stepCardiovascular(this.state.cardiovascular, ctx, dt);

    // 2. Neuro-ocular step (coupled to jugular venous pressure and cabin CO2)
    const nextNeuro = stepNeuroOcular(
      this.state.neuroOcular,
      nextCardio.jugularVenousPressure_mmHg,
      ctx,
      dt
    );

    // 3. Pulmonary step (coupled to cabin CO2 and metabolic demand)
    const nextPulmonary = stepRespiratory(this.state.pulmonary, ctx, dt);

    // 4. Renal step (coupled to thoracic fluid shift from cardiovascular)
    const nextRenal = stepRenal(this.state.renal, nextCardio.thoracicFluidShift_mL, ctx, dt);

    // 5. Thermal-metabolic step
    const nextThermal = stepThermalMetabolic(this.state.thermalMetabolic, ctx, dt);

    // 6. Musculoskeletal step
    const nextMusculo = stepMusculoskeletal(this.state.musculoskeletal, ctx, dt);

    this.state.time_seconds += dt;
    this.state.cardiovascular = nextCardio;
    this.state.neuroOcular = nextNeuro;
    this.state.pulmonary = nextPulmonary;
    this.state.renal = nextRenal;
    this.state.thermalMetabolic = nextThermal;
    this.state.musculoskeletal = nextMusculo;

    return this.getState();
  }

  /**
   * Calibrates and advances the simulation to reflect a specific mission day and sensor readings.
   */
  public simulateToMissionDay(
    targetDay: number,
    measuredSensors?: Record<string, { value: number; hrp_risk?: string }>
  ): FullOrganismPhysiology {
    this.setContext({ missionDay: targetDay });

    // Extract measured constraints if provided
    if (measuredSensors) {
      if (measuredSensors["rest_hr"]?.value) {
        this.state.cardiovascular.heartRate_bpm = measuredSensors["rest_hr"].value;
      }
      if (measuredSensors["temp_c"]?.value) {
        this.state.thermalMetabolic.coreTemp_C = measuredSensors["temp_c"].value;
      }
      if (measuredSensors["co2_ppm"]?.value) {
        this.state.context.cabinCO2_ppm = measuredSensors["co2_ppm"].value;
      }
    }

    // Step multi-organ system through simulated equilibration
    const steps = 10;
    const dt = 3600.0; // 1 hour steps
    for (let i = 0; i < steps; i++) {
      this.step(dt);
    }

    // If external readings are present, enforce measured constraint as ground truth
    if (measuredSensors) {
      if (measuredSensors["rest_hr"]?.value) {
        this.state.cardiovascular.heartRate_bpm = measuredSensors["rest_hr"].value;
      }
      if (measuredSensors["temp_c"]?.value) {
        this.state.thermalMetabolic.coreTemp_C = measuredSensors["temp_c"].value;
      }
    }

    return this.getState();
  }
}
