import { integrate } from "../integrator";
import { stepCardiovascular, DEFAULT_CARDIO_PARAMS } from "../models/cardiovascular";
import { stepNeuroOcular, DEFAULT_NEURO_PARAMS } from "../models/neuro-ocular";
import { stepRespiratory, DEFAULT_RESPIRATORY_PARAMS } from "../models/respiratory";
import { stepRenal, DEFAULT_RENAL_PARAMS } from "../models/renal";
import { stepThermalMetabolic, DEFAULT_THERMAL_PARAMS } from "../models/thermal-metabolic";
import { stepMusculoskeletal, DEFAULT_MUSCULO_PARAMS } from "../models/musculoskeletal";
import { PhysiologySimulationEngine, NOMINAL_PREFLIGHT_CARDIO, NOMINAL_PREFLIGHT_NEURO, NOMINAL_PREFLIGHT_PULMONARY, NOMINAL_PREFLIGHT_RENAL, NOMINAL_PREFLIGHT_THERMAL, NOMINAL_PREFLIGHT_MUSCULO } from "../engine";
import { Physiology3DAdapter } from "../adapter";
import type { SpaceflightContext } from "../types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

export function runAllPhysiologyTests() {
  console.log("=== RUNNING PHYSIOLOGY SIMULATOR TEST SUITE ===");

  // 1. Integrator: Exponential decay dy/dt = -k*y
  {
    const k = 0.5;
    const f = (_t: number, y: number[]) => [-k * y[0]!];
    const y0 = [10.0];
    const dt = 1.0;
    const yNextRK4 = integrate(f, 0, y0, dt, "rk4", 10);
    const analytical = 10.0 * Math.exp(-k * dt); // 6.0653066...
    assert(Math.abs(yNextRK4[0]! - analytical) < 1e-5, "RK4 accuracy on exponential decay");
    console.log("  PASS 1: Numerical Integrator (RK4 accuracy on analytical decay)");
  }

  // 2. Cardiovascular: 0G Cephalad Fluid Shift vs 1G baseline
  {
    const ctx0G: SpaceflightContext = {
      gLevel: 0.0,
      cabinCO2_ppm: 2000,
      missionDay: 2,
      ambientTemp_C: 22,
      exerciseLoad: 0.0,
      hydrationFactor: 1.0,
    };
    const s0 = { ...NOMINAL_PREFLIGHT_CARDIO };
    const sNext = stepCardiovascular(s0, ctx0G, 3600.0, DEFAULT_CARDIO_PARAMS);
    assert(sNext.thoracicFluidShift_mL > 0, "Fluid shift must increase in 0G");
    assert(sNext.plasmaVolumeFraction <= 1.0, "Plasma volume contracts in microgravity");
    assert(sNext.jugularVenousPressure_mmHg > s0.jugularVenousPressure_mmHg, "Jugular venous pressure elevates in 0G");
    console.log("  PASS 2: Cardiovascular fluid shift & jugular pressure in microgravity");
  }

  // 3. Neuro-ocular: ICP and SANS TLCPD collapse in 0G
  {
    const ctx0G: SpaceflightContext = {
      gLevel: 0.0,
      cabinCO2_ppm: 3500, // Elevated cabin CO2
      missionDay: 15,
      ambientTemp_C: 22,
      exerciseLoad: 0.0,
      hydrationFactor: 1.0,
    };
    const s0 = { ...NOMINAL_PREFLIGHT_NEURO };
    const sNext = stepNeuroOcular(s0, 9.5, ctx0G, 3600.0, DEFAULT_NEURO_PARAMS);
    assert(sNext.intracranialPressure_mmHg > s0.intracranialPressure_mmHg, "ICP must increase in microgravity with hypercapnia");
    assert(sNext.translaminarPressure_mmHg < s0.translaminarPressure_mmHg, "Translaminar pressure difference (IOP - ICP) collapses in space");
    assert(sNext.opticNerveSheathStrain >= 1.0, "Optic nerve sheath strain ratio >= 1.0");
    console.log("  PASS 3: Neuro-Ocular ICP elevation and SANS translaminar gradient collapse");
  }

  // 4. Respiratory: Hypercapnic ventilatory drive from cabin CO2
  {
    const ctxCO2: SpaceflightContext = {
      gLevel: 0.0,
      cabinCO2_ppm: 4500, // High cabin CO2
      missionDay: 5,
      ambientTemp_C: 22,
      exerciseLoad: 0.0,
      hydrationFactor: 1.0,
    };
    const s0 = { ...NOMINAL_PREFLIGHT_PULMONARY };
    const sNext = stepRespiratory(s0, ctxCO2, 60.0, DEFAULT_RESPIRATORY_PARAMS);
    assert(sNext.respiratoryRate_bpm >= s0.respiratoryRate_bpm, "Respiratory rate increases under high cabin CO2");
    assert(sNext.hypercapnicDrive >= 1.0, "Hypercapnic drive factor is activated");
    assert(sNext.arterialSpO2_pct >= 90.0 && sNext.arterialSpO2_pct <= 100.0, "SpO2 remains physiologically bounded");
    console.log("  PASS 4: Respiratory hypercapnic chemoreflex response");
  }

  // 5. Renal: Diuresis triggered by Gauer-Henry reflex
  {
    const ctx0G: SpaceflightContext = {
      gLevel: 0.0,
      cabinCO2_ppm: 2000,
      missionDay: 1, // Early flight (peak diuresis)
      ambientTemp_C: 22,
      exerciseLoad: 0.0,
      hydrationFactor: 1.0,
    };
    const s0 = { ...NOMINAL_PREFLIGHT_RENAL };
    const sNext = stepRenal(s0, 1500.0, ctx0G, 3600.0, DEFAULT_RENAL_PARAMS);
    assert(sNext.adhSuppressionIndex > 0.0, "ADH suppression triggered by central shift");
    assert(sNext.urineOutput_mLh > s0.urineOutput_mLh, "Early flight diuresis rate increases");
    console.log("  PASS 5: Renal Gauer-Henry reflex & volume contraction diuresis");
  }

  // 6. Thermal: Space fever (convective impairment)
  {
    const ctx0G: SpaceflightContext = {
      gLevel: 0.0,
      cabinCO2_ppm: 2000,
      missionDay: 25,
      ambientTemp_C: 23.0,
      exerciseLoad: 0.0,
      hydrationFactor: 1.0,
    };
    const s0 = { ...NOMINAL_PREFLIGHT_THERMAL };
    const sNext = stepThermalMetabolic(s0, ctx0G, 3600.0, DEFAULT_THERMAL_PARAMS);
    assert(sNext.convectiveImpairment > 0.0, "Microgravity convective dissipation impairment detected");
    assert(sNext.coreTemp_C >= s0.coreTemp_C, "Core body temperature baseline shifts upward in microgravity");
    console.log("  PASS 6: Core thermal heat balance and spaceflight convective impairment");
  }

  // 7. Musculoskeletal: Bone mineral density reduction under disuse
  {
    const ctx0G: SpaceflightContext = {
      gLevel: 0.0,
      cabinCO2_ppm: 2000,
      missionDay: 30,
      ambientTemp_C: 22,
      exerciseLoad: 0.0, // No countermeasure
      hydrationFactor: 1.0,
    };
    const s0 = { ...NOMINAL_PREFLIGHT_MUSCULO };
    const sNext = stepMusculoskeletal(s0, ctx0G, 86400.0 * 30.0, DEFAULT_MUSCULO_PARAMS);
    assert(sNext.trabecularBMDRatio < 1.0, "Trabecular BMD must decrease during prolonged unweighted disuse");
    assert(sNext.calciumEfflux_mgDay > s0.calciumEfflux_mgDay, "Calcium efflux rate increases during bone resorption");
    console.log("  PASS 7: Musculoskeletal mechanostat remodeling & calcium efflux");
  }

  // 8. Multi-organ Engine & 3D Adapter mapping
  {
    const engine = new PhysiologySimulationEngine({ gLevel: 0.0, missionDay: 9 });
    const physio = engine.simulateToMissionDay(9, {
      rest_hr: { value: 78.5, hrp_risk: "cardiovascular" },
      temp_c: { value: 37.95, hrp_risk: "immune" }, // Fever
      co2_ppm: { value: 2800.0 },
    });

    assert(physio.cardiovascular.heartRate_bpm === 78.5, "Sensor constraint incorporated into heart rate");
    assert(physio.thermalMetabolic.coreTemp_C === 37.95, "Sensor constraint incorporated into core temperature");

    const visuals = Physiology3DAdapter.mapToVisuals(physio);
    assert(visuals["heart"] !== undefined, "Heart visual attributes mapped");
    assert(visuals["brain"] !== undefined, "Brain visual attributes mapped");
    assert(visuals["liver"] !== undefined, "Liver visual attributes mapped");
    assert(visuals["lung"] !== undefined, "Lung visual attributes mapped");
    assert(visuals["uterus"] !== undefined, "Uterus visual attributes mapped");
    assert(visuals["uterus"]!.classification === "reference", "Uterus correctly classified as reference baseline without synthetic dynamics");
    assert(visuals["heart"]!.pulsationFrequency_Hz > 0.0, "Heart has valid non-zero dynamic pulsation frequency");
    assert(Object.keys(visuals["uterus"]!.telemetry).length === 0, "Reference anatomy has no telemetry");
    assert(Object.values(visuals).every(organ =>
      Object.values(organ.telemetry).every(metric => metric.tag !== "[DATOS REALES]")
    ), "Scenario telemetry must retain synthetic provenance");
    console.log("  PASS 8: Multi-organ Engine orchestration and 3D Visual Adapter mapping");
  }

  console.log("=== ALL PHYSIOLOGY TESTS PASSED SUCCESSFULLY (8/8) ===");
}

runAllPhysiologyTests();
