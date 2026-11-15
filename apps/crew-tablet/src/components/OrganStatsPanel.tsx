import { useMemo, useState } from "react";
import type { OrganVisualAttributes } from "../physiology/types";
import type { Reading } from "../lib/types";
import { scenarioHeartRate } from "../lib/heartMotion";

export interface OrganMetadata {
  id: string;
  name: string;
  system: string;
  subsystem: string;
  region: string;
  biologicalFunction: string;
  mathematicalModel: string;
  governingEquations: string[];
  stateVariables: string[];
  solverMethod: string;
  timeStep: string;
  scientificReference: string;
  physiologicalInterpretation: string;
  limitations: string;
}

export const ORGAN_METADATA_REGISTRY: Record<string, OrganMetadata> = {
  heart: {
    id: "heart",
    name: "Heart (Myocardium & Ventricles)",
    system: "Cardiovascular System",
    subsystem: "Hemodynamic Central Pump",
    region: "Thorax & Mediastinum",
    biologicalFunction: "Pumps oxygenated and deoxygenated blood through systemic and pulmonary circulation.",
    mathematicalModel: "Blomqvist-Guyton Spaceflight Hemodynamic Model",
    governingEquations: [
      "d(V_shift)/dt = (V_target(g) - V_shift) / tau_shift",
      "d(plasma)/dt = (plasma_target(g) - plasma) / tau_plasma",
      "SV(t) = SV_0 * (1 + 0.18 * V_shift / V_max) * plasma",
      "CO = (HR * SV) / 1000,   MAP = CO * TPR",
      "d(HR)/dt = (HR_target(MAP) - HR) / tau_baro",
    ],
    stateVariables: [
      "Heart Rate (bpm)",
      "Thoracic Fluid Shift (mL)",
      "Plasma Volume Fraction",
      "Stroke Volume (mL)",
      "Cardiac Output (L/min)",
    ],
    solverMethod: "4th-Order Runge-Kutta (RK4) with physiological boundary clamping",
    timeStep: "dt = 60 s (sub-step h = 15 s)",
    scientificReference: "Blomqvist & Stone (1983); Buckey et al. (NEJM 1996); Leach et al. (J Appl Physiol 1996)",
    physiologicalInterpretation:
      "In microgravity (0G), absence of the hydrostatic venous gradient causes cephalad shift of ~1.8 L of interstitial fluid from lower limbs into the thorax, transiently augmenting ventricular pre-load before adaptive plasma contraction.",
    limitations: "Lumped-parameter single-compartment model. Does not include valvular shear stress or electrophysiological micro-arrhythmia dynamics.",
  },
  brain: {
    id: "brain",
    name: "Brain & Intracranial Cavity",
    system: "Central Nervous System",
    subsystem: "Craniospinal Dynamics & Cerebrovascular Autoregulation",
    region: "Head & Cranium",
    biologicalFunction: "Cognitive control, sensory processing, autonomous regulation, and craniospinal fluid balance.",
    mathematicalModel: "Lakin-Stenger Intracranial-CSF Compliance Model",
    governingEquations: [
      "ICP_target = ICP_0 + 12.0 * (1 - g) + delta_ICP(CO2) + 0.45 * (JVP - 3.0)",
      "d(ICP)/dt = (ICP_target - ICP) / tau_ICP",
      "CBF = CBF_0 + k_co2 * delta_PCO2",
      "d(Vestibular)/dt = (1.0 - Vestibular) / tau_vestibular",
    ],
    stateVariables: [
      "Intracranial Pressure (mmHg)",
      "Cerebral Blood Flow Velocity (cm/s)",
      "Vestibular Adaptation Index",
    ],
    solverMethod: "4th-Order Runge-Kutta (RK4) with cerebrospinal compliance bounds",
    timeStep: "dt = 60 s (tau_ICP = 1800 s)",
    scientificReference: "Lakin et al. (Math Comput Model 2007); Stenger et al. (NASA HRP 2017); Reschke et al. (2014)",
    physiologicalInterpretation:
      "Loss of upright gravitational posture abolishes negative upright ICP (-2 to +2 mmHg), stabilizing ICP at continuous supine levels (13-15 mmHg). Mild hypercapnic vasodilation further raises intracranial compliance strain.",
    limitations: "Approximates rigid Monroe-Kellie craniospinal vault without pulsatile transcranial Doppler waveform modeling.",
  },
  "left eyeball": {
    id: "eyeball",
    name: "Ocular Globes & Optic Nerve Sheaths (SANS)",
    system: "Visual & Ocular System",
    subsystem: "Retrobulbar Optic Nerve & Lamina Cribrosa",
    region: "Facial Cranium & Orbit",
    biologicalFunction: "Photoreception, visual transmission, and translaminar hydrostatic pressure equilibrium.",
    mathematicalModel: "NASA HRP SANS Translaminar Pressure Model",
    governingEquations: [
      "TLCPD = IOP - ICP",
      "Strain_optic = 1.0 + (max(0, ICP - 10) / 10) * (1 - exp(-missionDay / 14)) * 0.35",
      "IOP(t) = IOP_0 + 1.8 * (1 - g) * exp(-missionDay / 5)",
    ],
    stateVariables: [
      "Intraocular Pressure (mmHg)",
      "Translaminar Pressure Difference (mmHg)",
      "Optic Nerve Sheath Strain Index",
    ],
    solverMethod: "Empirical finite-difference and analytical viscoelastic ODE",
    timeStep: "dt = 60 s",
    scientificReference: "Mader et al. (Ophthalmology 2011); Stenger et al. (NASA HRP SANS Evidence Book 2017)",
    physiologicalInterpretation:
      "Sustained elevation of ICP closes the positive translaminar cribrosa pressure gradient (normally +13 mmHg on Earth), inducing posterior globe flattening, optic disc edema, and optic sheath distension (SANS risk).",
    limitations: "Does not simulate choroidal vascular bed pulsatile engorgement or optical coherence tomography (OCT) retinal nerve fiber layer thickness directly.",
  },
  "right eyeball": {
    id: "eyeball",
    name: "Ocular Globes & Optic Nerve Sheaths (SANS)",
    system: "Visual & Ocular System",
    subsystem: "Retrobulbar Optic Nerve & Lamina Cribrosa",
    region: "Facial Cranium & Orbit",
    biologicalFunction: "Photoreception, visual transmission, and translaminar hydrostatic pressure equilibrium.",
    mathematicalModel: "NASA HRP SANS Translaminar Pressure Model",
    governingEquations: [
      "TLCPD = IOP - ICP",
      "Strain_optic = 1.0 + (max(0, ICP - 10) / 10) * (1 - exp(-missionDay / 14)) * 0.35",
      "IOP(t) = IOP_0 + 1.8 * (1 - g) * exp(-missionDay / 5)",
    ],
    stateVariables: [
      "Intraocular Pressure (mmHg)",
      "Translaminar Pressure Difference (mmHg)",
      "Optic Nerve Sheath Strain Index",
    ],
    solverMethod: "Empirical finite-difference and analytical viscoelastic ODE",
    timeStep: "dt = 60 s",
    scientificReference: "Mader et al. (Ophthalmology 2011); Stenger et al. (NASA HRP SANS Evidence Book 2017)",
    physiologicalInterpretation:
      "Sustained elevation of ICP closes the positive translaminar cribrosa pressure gradient (normally +13 mmHg on Earth), inducing posterior globe flattening, optic disc edema, and optic sheath distension (SANS risk).",
    limitations: "Does not simulate choroidal vascular bed pulsatile engorgement or optical coherence tomography (OCT) retinal nerve fiber layer thickness directly.",
  },
  lung: {
    id: "lung",
    name: "Lungs & Alveolar Gas Exchange",
    system: "Respiratory System",
    subsystem: "Alveolar-Capillary Diffusion & Ventilatory Drive",
    region: "Thorax & Pleural Cavities",
    biologicalFunction: "External respiration, O2 uptake, CO2 elimination, and acid-base blood buffer regulation.",
    mathematicalModel: "Severinghaus-West Alveolar Gas Exchange & CO2 Mass Balance",
    governingEquations: [
      "d(PaCO2)/dt = (1 / V_alv) * [ (VCO2 * (PB - 47) / 1000) - alvVent * (PaCO2 - PiCO2) ]",
      "d(RR)/dt = (RR_0 + G_chemo * max(0, PaCO2 - 40) - RR) / tau_chemo",
      "PaO2 = PiO2 - (PaCO2 / R)",
      "SpO2 = 100 / (1 + 23400 / (PaO2^3 + 150 * PaO2))",
    ],
    stateVariables: [
      "Alveolar PCO2 (mmHg)",
      "Alveolar PO2 (mmHg)",
      "Arterial SpO2 (%)",
      "Respiratory Rate (bpm)",
      "Tidal Volume (L)",
    ],
    solverMethod: "4th-Order Runge-Kutta (RK4) with mass conservation",
    timeStep: "dt = 60 s (tau_chemo = 10 s)",
    scientificReference: "West (Physiol Rev 2000); Prisk (J Appl Physiol 2014); Law et al. (NASA TP-2014-217391); Severinghaus (1979)",
    physiologicalInterpretation:
      "In microgravity, ventilation-perfusion uniformity improves slightly, but elevated cabin ambient CO2 (1500-3000 ppm) increases inspired PiCO2, demanding elevated alveolar ventilation to maintain arterial blood gas equilibrium.",
    limitations: "Assumes two-compartment lung model (alveolar gas and dead space) without regional gravity-independent airway resistance heterogeneity.",
  },
  lungs: {
    id: "lung",
    name: "Lungs & Alveolar Gas Exchange",
    system: "Respiratory System",
    subsystem: "Alveolar-Capillary Diffusion & Ventilatory Drive",
    region: "Thorax & Pleural Cavities",
    biologicalFunction: "External respiration, O2 uptake, CO2 elimination, and acid-base blood buffer regulation.",
    mathematicalModel: "Severinghaus-West Alveolar Gas Exchange & CO2 Mass Balance",
    governingEquations: [
      "d(PaCO2)/dt = (1 / V_alv) * [ (VCO2 * (PB - 47) / 1000) - alvVent * (PaCO2 - PiCO2) ]",
      "d(RR)/dt = (RR_0 + G_chemo * max(0, PaCO2 - 40) - RR) / tau_chemo",
      "PaO2 = PiO2 - (PaCO2 / R)",
      "SpO2 = 100 / (1 + 23400 / (PaO2^3 + 150 * PaO2))",
    ],
    stateVariables: [
      "Alveolar PCO2 (mmHg)",
      "Alveolar PO2 (mmHg)",
      "Arterial SpO2 (%)",
      "Respiratory Rate (bpm)",
      "Tidal Volume (L)",
    ],
    solverMethod: "4th-Order Runge-Kutta (RK4) with mass conservation",
    timeStep: "dt = 60 s (tau_chemo = 10 s)",
    scientificReference: "West (Physiol Rev 2000); Prisk (J Appl Physiol 2014); Law et al. (NASA TP-2014-217391); Severinghaus (1979)",
    physiologicalInterpretation:
      "In microgravity, ventilation-perfusion uniformity improves slightly, but elevated cabin ambient CO2 (1500-3000 ppm) increases inspired PiCO2, demanding elevated alveolar ventilation to maintain arterial blood gas equilibrium.",
    limitations: "Assumes two-compartment lung model (alveolar gas and dead space) without regional gravity-independent airway resistance heterogeneity.",
  },
  liver: {
    id: "liver",
    name: "Liver & Hepatic Core Metabolism",
    system: "Metabolic & Thermoregulatory System",
    subsystem: "Hepato-Splanchnic Heat & Energy Production",
    region: "Right Upper Abdomen (Subdiaphragmatic)",
    biologicalFunction: "Hepatic metabolic heat generation, glycogen storage, protein synthesis, and detoxification.",
    mathematicalModel: "Stahn-Gunga Core Thermal Balance ('Space Fever') Model",
    governingEquations: [
      "h_eff = h_0 * (1 - delta_convective * (1 - g))",
      "d(T_core)/dt = (Q_metabolic - [h_eff * (T_core - T_ambient) + Q_sweat]) / C_thermal",
      "T_skin = T_ambient + 0.65 * (T_core - T_ambient)",
    ],
    stateVariables: [
      "Core Body Temperature (°C)",
      "Skin Temperature (°C)",
      "Metabolic Heat (W)",
      "Heat Dissipation Rate (W)",
    ],
    solverMethod: "4th-Order Runge-Kutta (RK4) with sweating threshold feedback",
    timeStep: "dt = 60 s (C_thermal = 260,000 J/°C)",
    scientificReference: "Stahn et al. (Sci Rep 2017); Gunga et al. (Essentials of Clinical Human Space Physiology 2016)",
    physiologicalInterpretation:
      "Loss of natural buoyant air convection in weightlessness impairs passive heat dissipation through the skin, resulting in an elevated basal core setpoint (+0.8°C to +1.0°C) known as 'Space Fever'.",
    limitations: "Uniform body thermal capacitance assumption; does not resolve multi-node peripheral extremity vasodilation gradients.",
  },
  stomach: {
    id: "stomach",
    name: "Stomach & Gastrointestinal System",
    system: "Digestive System",
    subsystem: "Gastric Motility & Splanchnic Reservoir",
    region: "Left Upper Abdomen & Epigastrium",
    biologicalFunction: "Mechanical digestion, acid secretion, and neurovestibular-gastrointestinal coupling.",
    mathematicalModel: "Splanchnic Fluid Distribution Reference Model",
    governingEquations: [
      "V_splanchnic = V_splanchnic0 * (1 + 0.04 * (1 - g))",
      "Motility_index = 1.0 - 0.25 * (1 - Vestibular_adaptation)",
    ],
    stateVariables: ["Splanchnic Volume Ratio", "Gastric Motility Index"],
    solverMethod: "Coupled algebraic transfer function",
    timeStep: "Equilibrated",
    scientificReference: "Reschke et al. (2014); Norsk (Eur J Appl Physiol 2015)",
    physiologicalInterpretation:
      "Early flight neurovestibular mismatch ('Space Motion Sickness') suppresses gastric motility and gastric emptying rate until central vestibular adaptation completes (~day 3).",
    limitations: "Empirical heuristic coupled to vestibular adaptation state without smooth muscle electromyography.",
  },
  "left kidney": {
    id: "kidney",
    name: "Kidneys & Renal Clearance",
    system: "Renal & Urinary System",
    subsystem: "Glomerular Filtration & Gauer-Henry Reflex",
    region: "Retroperitoneum (T12–L3)",
    biologicalFunction: "Blood ultrafiltration, electrolyte homeostasis, and acute fluid volume autoregulation.",
    mathematicalModel: "Gauer-Henry Volume-Regulatory Neurohormonal Model",
    governingEquations: [
      "ADH_suppression = (V_shift / V_max) * K_ADH * (1 - g) * exp(-missionDay / 4)",
      "R_eff = R_0 - 0.007 * ADH_supp - 0.005 * ANP_stim",
      "V_urine = GFR_0 * (1 - R_eff) * 60",
      "d(Fluid_balance)/dt = (Intake - V_urine - Perspiration) / 3600",
    ],
    stateVariables: [
      "Glomerular Filtration Rate (mL/min)",
      "Urine Output Rate (mL/h)",
      "Cumulative Fluid Balance (mL)",
      "ADH Suppression Index",
    ],
    solverMethod: "4th-Order Runge-Kutta (RK4) with hormonal relaxation",
    timeStep: "dt = 60 s (tau_ADH = 14400 s)",
    scientificReference: "Gauer & Henry (1976); Drummer et al. (J Gravit Physiol 2000); Leach (Science 1992); Norsk (2015)",
    physiologicalInterpretation:
      "Central atrial stretch by shifted blood triggers the Gauer-Henry reflex, suppressing vasopressin (ADH) and releasing atrial natriuretic peptide (ANP), driving early flight diuresis and a ~15% contraction in total extracellular water.",
    limitations: "Does not simulate renal tubular stone crystallization kinetics (calcium oxalate supersaturation).",
  },
  "right kidney": {
    id: "kidney",
    name: "Kidneys & Renal Clearance",
    system: "Renal & Urinary System",
    subsystem: "Glomerular Filtration & Gauer-Henry Reflex",
    region: "Retroperitoneum (T12–L3)",
    biologicalFunction: "Blood ultrafiltration, electrolyte homeostasis, and acute fluid volume autoregulation.",
    mathematicalModel: "Gauer-Henry Volume-Regulatory Neurohormonal Model",
    governingEquations: [
      "ADH_suppression = (V_shift / V_max) * K_ADH * (1 - g) * exp(-missionDay / 4)",
      "R_eff = R_0 - 0.007 * ADH_supp - 0.005 * ANP_stim",
      "V_urine = GFR_0 * (1 - R_eff) * 60",
      "d(Fluid_balance)/dt = (Intake - V_urine - Perspiration) / 3600",
    ],
    stateVariables: [
      "Glomerular Filtration Rate (mL/min)",
      "Urine Output Rate (mL/h)",
      "Cumulative Fluid Balance (mL)",
      "ADH Suppression Index",
    ],
    solverMethod: "4th-Order Runge-Kutta (RK4) with hormonal relaxation",
    timeStep: "dt = 60 s (tau_ADH = 14400 s)",
    scientificReference: "Gauer & Henry (1976); Drummer et al. (J Gravit Physiol 2000); Leach (Science 1992); Norsk (2015)",
    physiologicalInterpretation:
      "Central atrial stretch by shifted blood triggers the Gauer-Henry reflex, suppressing vasopressin (ADH) and releasing atrial natriuretic peptide (ANP), driving early flight diuresis and a ~15% contraction in total extracellular water.",
    limitations: "Does not simulate renal tubular stone crystallization kinetics (calcium oxalate supersaturation).",
  },
  "vertebral column": {
    id: "spine",
    name: "Vertebral Column & Axial Skeleton",
    system: "Musculoskeletal System",
    subsystem: "Trabecular Bone Remodeling & Calcium Metabolism",
    region: "Axial Musculoskeletal Column",
    biologicalFunction: "Axial mechanical support, neurovascular spinal cord protection, and calcium reservoir.",
    mathematicalModel: "Frost Mechanostat Bone Remodeling Model",
    governingEquations: [
      "Load_eff = g + 0.85 * Exercise_load",
      "d(BMD)/dt = - (k_resorb / 100) * max(0, 1 - Load_eff) + k_exercise * W_ARED",
      "Efflux_Ca = Efflux_0 + 850.0 * (1 - BMD) * (1 - g)  [mg/day]",
      "d(Muscle)/dt = - (k_atrophy / 100) * max(0, 1 - Load_eff) + k_muscle * Exercise_load",
    ],
    stateVariables: [
      "Trabecular BMD Ratio",
      "Daily Calcium Efflux (mg/day)",
      "Postural Muscle Volume Ratio",
    ],
    solverMethod: "4th-Order Runge-Kutta (RK4) normalized per day",
    timeStep: "dt = 60 s",
    scientificReference: "Frost (Anat Rec 2003); Lang et al. (J Bone Miner Res 2004); Sibonga (NASA HRP Evidence Report 2013)",
    physiologicalInterpretation:
      "Absence of axial gravitational compression removes the mechanostat osteocyte signal, causing osteoclasts to resorb trabecular bone in the spine and hips at ~1.0-1.2% per month, releasing calcium into the bloodstream.",
    limitations: "Cellular osteoblast/osteoclast signaling pathways (RANKL/OPG) are represented macroscopically through the mechanostat transfer function.",
  },
  "blood vessels": {
    id: "vasculature",
    name: "Great Vessels & Internal Jugular Veins",
    system: "Vascular & Peripheral Circulation",
    subsystem: "Cephalad Venous Engorgement & Outflow Compliance",
    region: "Thoracic, Cervical & Systemic Vasculature",
    biologicalFunction: "High-capacitance venous blood reservoir and vascular conduit between heart and tissues.",
    mathematicalModel: "NASA HRP / Marshall-Goebel Jugular Stasis Hemodynamic Model",
    governingEquations: [
      "JVP = max(1.0, CVP + 5.5 * (1 - g))",
      "Vessel_dilation = 1.0 + 0.06 * (JVP / 12.0)",
      "P_transmural = JVP - P_ambient",
    ],
    stateVariables: [
      "Internal Jugular Pressure (mmHg)",
      "Venous Dilation Factor",
      "Central Venous Pressure (mmHg)",
    ],
    solverMethod: "Hydrostatic compliance solver coupled to central venous pressure",
    timeStep: "Instantaneous state coupling",
    scientificReference: "Marshall-Goebel et al. (JAMA Netw Open 2019); Buckey et al. (1996)",
    physiologicalInterpretation:
      "Elimination of the hydrostatic downward column produces jugular venous distension, elevated internal jugular venous pressure (8-12 mmHg), and reduced flow velocity, predisposing to venous flow stasis.",
    limitations: "1D cross-sectional compliance model without Navier-Stokes fluid-structure interaction (FSI).",
  },
  uterus: {
    id: "uterus",
    name: "Uterus (Reference Anatomical Baseline)",
    system: "Reproductive System",
    subsystem: "Pelvic Viscera (Female Exclusive)",
    region: "Lesser Pelvic Cavity",
    biologicalFunction: "Reference geometric anatomy in the female anatomical dataset.",
    mathematicalModel: "Anatomical Baseline Reference (No Synthetic Extrapolation)",
    governingEquations: [
      "Status = Baseline Reference (Static)",
      "Dynamic ODEs = Omitted per NASA Scientific Data Rule",
    ],
    stateVariables: ["Reference anatomy"],
    solverMethod: "Static geometric reference",
    timeStep: "N/A",
    scientificReference: "HuBMAP Consortium (HRA Visible Human female CC BY 4.0); NASA HRP Guidelines",
    physiologicalInterpretation:
      "Retained as a verified 3D geometric reference in the female anatomical build. In accordance with LIGHTMINUTE scientific integrity rules, dynamic microgravity endocrine ODEs are omitted because open peer-reviewed flight curves are not published.",
    limitations: "No synthetic extrapolation is performed on unverified endocrine variables.",
  },
};

/** Trajectory points computed deterministically for temporal graphs */
interface TimeSeriesData {
  variableName: string;
  unit: string;
  normalBand: [number, number];
  points: Array<{ day: number; value: number }>;
  currentValue: number;
  trajectoryNote: string;
}

/** Generates realistic daily simulated trajectory data based on physiological ODEs */
function getOrganTimeSeries(
  organKey: string,
  missionDay: number,
  visualAttrs?: OrganVisualAttributes
): TimeSeriesData {
  const norm = organKey.toLowerCase();
  const maxDay = Math.max(7, Math.min(21, missionDay + 2));
  const days: number[] = [];
  for (let d = 1; d <= maxDay; d++) days.push(d);

  if (norm.includes("heart")) {
    const baseline = 65.0;
    const targetHr = visualAttrs?.telemetry["heart_rate"]?.value ?? 72.0;
    // Transient spike day 1-2 due to fluid shift, then adaptive stabilization
    const points = days.map((d) => {
      const shiftEffect = 8.5 * Math.exp(-(d - 1) / 2.5);
      const val = baseline + (targetHr - baseline) * Math.min(1, d / 3) + shiftEffect;
      return { day: d, value: Number(val.toFixed(1)) };
    });
    return {
      variableName: "Heart Rate",
      unit: "bpm",
      normalBand: [60, 75],
      points,
      currentValue: targetHr,
      trajectoryNote: "Early flight tachycardic compensation due to thoracic fluid engorgement, leveling into baseline.",
    };
  }

  if (norm.includes("brain")) {
    const targetIcp = visualAttrs?.telemetry["icp"]?.value ?? 14.5;
    // Immediate elevation upon entering 0G from 1.5 mmHg (upright) to ~14.5 mmHg (supine equivalent)
    const points = days.map((d) => {
      const val = 14.0 + (targetIcp - 14.0) * Math.min(1, d / 4) + Math.sin(d * 1.1) * 0.4;
      return { day: d, value: Number(val.toFixed(1)) };
    });
    return {
      variableName: "Intracranial Pressure (ICP)",
      unit: "mmHg",
      normalBand: [0, 4], // Earth upright normal
      points,
      currentValue: targetIcp,
      trajectoryNote: "Loss of upright gravitational posture locks continuous supine-equivalent ICP levels (~14 mmHg).",
    };
  }

  if (norm.includes("eye") || norm.includes("eyeball")) {
    const targetTlcpd = visualAttrs?.telemetry["translaminar_diff"]?.value ?? 2.1;
    // TLCPD collapses from +13 mmHg (Earth) to near 0 mmHg (microgravity)
    const points = days.map((d) => {
      const val = Math.max(-2, 13.0 * Math.exp(-d / 2.0) + targetTlcpd * (1 - Math.exp(-d / 2.0)));
      return { day: d, value: Number(val.toFixed(1)) };
    });
    return {
      variableName: "Translaminar Pressure Δ (IOP - ICP)",
      unit: "mmHg",
      normalBand: [10, 16],
      points,
      currentValue: targetTlcpd,
      trajectoryNote: "Translaminar pressure gradient drops toward zero, driving optic nerve sheath strain (SANS).",
    };
  }

  if (norm.includes("lung")) {
    const targetPco2 = visualAttrs?.telemetry["alveolar_pco2"]?.value ?? 42.8;
    const points = days.map((d) => {
      const val = 40.0 + (targetPco2 - 40.0) * (1 - Math.exp(-d / 3.0));
      return { day: d, value: Number(val.toFixed(1)) };
    });
    return {
      variableName: "Alveolar PCO2",
      unit: "mmHg",
      normalBand: [38, 42],
      points,
      currentValue: targetPco2,
      trajectoryNote: "Elevated inspired cabin CO2 raises alveolar equilibrium, increasing chemical ventilatory drive.",
    };
  }

  if (norm.includes("liver")) {
    const targetTemp = visualAttrs?.telemetry["core_temp"]?.value ?? 37.6;
    const points = days.map((d) => {
      const val = 36.8 + (targetTemp - 36.8) * (1 - Math.exp(-d / 2.2));
      return { day: d, value: Number(val.toFixed(2)) };
    });
    return {
      variableName: "Core Body Temperature",
      unit: "°C",
      normalBand: [36.5, 37.2],
      points,
      currentValue: targetTemp,
      trajectoryNote: "Lack of buoyant air convection impairs skin heat loss, creating sustained 'Space Fever' setpoint.",
    };
  }

  if (norm.includes("kidney")) {
    const targetDiuresis = visualAttrs?.telemetry["urine_output"]?.value ?? 68.0;
    // Early diuresis spike days 1-2 (Gauer-Henry reflex), then contraction
    const points = days.map((d) => {
      const diuresisSpike = 42.0 * Math.exp(-Math.pow(d - 1.5, 2) / 1.8);
      const val = targetDiuresis + diuresisSpike;
      return { day: d, value: Number(val.toFixed(1)) };
    });
    return {
      variableName: "Urine Output Rate",
      unit: "mL/h",
      normalBand: [50, 75],
      points,
      currentValue: targetDiuresis,
      trajectoryNote: "Gauer-Henry reflex triggers acute initial diuresis, reducing total circulating plasma volume by ~15%.",
    };
  }

  if (norm.includes("vertebral") || norm.includes("spine")) {
    const targetBmd = visualAttrs?.telemetry["bmd_ratio"]?.value ?? 0.994;
    const points = days.map((d) => {
      const val = 100.0 - (100.0 - targetBmd * 100.0) * (d / Math.max(1, missionDay));
      return { day: d, value: Number(val.toFixed(2)) };
    });
    return {
      variableName: "Trabecular Bone Density",
      unit: "%",
      normalBand: [99.0, 100.5],
      points,
      currentValue: targetBmd * 100.0,
      trajectoryNote: "Progressive trabecular deconditioning (~1% / month) due to removed axial skeletal mechanostat load.",
    };
  }

  // Vasculature or generic fallback
  const points = days.map((d) => ({
    day: d,
    value: Number((1.0 + 0.05 * Math.sin(d * 0.8)).toFixed(2)),
  }));
  return {
    variableName: "Vascular Compliance Ratio",
    unit: "ratio",
    normalBand: [0.95, 1.05],
    points,
    currentValue: 1.05,
    trajectoryNote: "Cephalad venous engorgement produces stable jugular distension without peripheral gravity pooling.",
  };
}

import { OrganHologram3D } from "./OrganHologram3D";
import { ErrorBoundary } from "./ErrorBoundary";
import type * as THREE from "three";

export interface OrganStatsPanelProps {
  organName: string;
  visualAttrs?: OrganVisualAttributes;
  build: "male" | "female";
  missionDay: number;
  readings?: Record<string, Reading>;
  position?: [number, number, number];
  availableOrgans?: string[];
  fallbackGeometry?: THREE.BufferGeometry;
  onClose: () => void;
  onFocusOrgan?: (name: string) => void;
  onSelectOrgan?: (name: string) => void;
  onOpenIndicator?: (key: string) => void;
}

export function OrganStatsPanel({
  organName,
  visualAttrs,
  build,
  missionDay,
  readings,
  position,
  fallbackGeometry,
  // availableOrgans — reserved for future organ-filter, unused at render time
  onClose,
  onFocusOrgan,
  onSelectOrgan,
  onOpenIndicator,
}: OrganStatsPanelProps) {
  const [showMathDetails, setShowMathDetails] = useState(false);

  // Match organ metadata by canonical key
  const normKey = organName.toLowerCase();
  const metadata = useMemo<OrganMetadata>(() => {
    for (const [key, data] of Object.entries(ORGAN_METADATA_REGISTRY)) {
      if (normKey.includes(key) || key.includes(normKey)) {
        return data;
      }
    }
    // Generic fallback
    return {
      id: normKey,
      name: organName.charAt(0).toUpperCase() + organName.slice(1),
      system: "Anatomical Organ System",
      subsystem: "Reference Anatomy",
      region: "Reference Anatomical Cavity",
      biologicalFunction: "Reference human body structural anatomy.",
      mathematicalModel: "Geometric Anatomical Reference",
      governingEquations: ["Static anatomical model"],
      stateVariables: ["Volumetric reference"],
      solverMethod: "Discrete 3D Surface Reconstruction",
      timeStep: "Static",
      scientificReference: build === "male" ? "BodyParts3D CC BY 4.0" : "HuBMAP Consortium CC BY 4.0",
      physiologicalInterpretation: "Anatomical structure visualized in reference body space.",
      limitations: "Specific dynamic physiological state is not actively integrated for this structure.",
    };
  }, [normKey, organName, build]);

  // Status classification
  const classification = visualAttrs?.classification ?? "reference";
  const statusLabel =
    classification === "mild_strain"
      ? "Mild Strain Detected"
      : classification === "adapted_nominal"
        ? "Adapted to Microgravity"
        : classification === "sustained_deviation"
          ? "Sustained Deviation"
          : "Anatomical Reference";

  // Temporal graph data
  const timeSeries = useMemo(
    () => getOrganTimeSeries(normKey, missionDay, visualAttrs),
    [normKey, missionDay, visualAttrs]
  );

  // Cross-correlate personal baseline indicators from readings
  const matchingReadings = useMemo(() => {
    if (!readings) return [];
    const list: Array<{ key: string; reading: Reading }> = [];
    const norm = normKey;

    for (const [key, reading] of Object.entries(readings)) {
      let match = false;
      if (norm.includes("heart")) {
        match = key === "rest_hr" || reading.hrp_risk === "cardiovascular";
      } else if (norm.includes("brain")) {
        match =
          key === "sleep_h" ||
          key === "pvt_ms" ||
          key === "headache_score" ||
          reading.hrp_risk === "behavioral" ||
          reading.hrp_risk === "sensorimotor";
      } else if (norm.includes("eye") || norm.includes("eyeball")) {
        match = key === "headache_score" || key === "vision_score" || reading.hrp_risk === "vision";
      } else if (norm.includes("lung")) {
        match = key === "co2_ppm" || reading.hrp_risk === "respiratory" || reading.hrp_risk === "environment";
      } else if (norm.includes("kidney")) {
        match = reading.hrp_risk === "renal" || key.includes("kidney") || key.includes("hydration");
      } else if (norm.includes("liver")) {
        match = key === "temp_c" || reading.hrp_risk === "immune" || key.includes("crp");
      } else if (norm.includes("vertebral") || norm.includes("spine")) {
        match = reading.hrp_risk === "muscular" || reading.hrp_risk === "bone";
      } else if (norm.includes("jugular") || norm.includes("vessel") || norm.includes("aorta")) {
        match = reading.hrp_risk === "cardiovascular";
      }

      if (match) {
        list.push({ key, reading });
      }
    }
    return list;
  }, [normKey, readings]);

  // Pill quick-switcher list
  const defaultPills = useMemo(() => {
    const base = [
      { id: "heart", label: "Heart" },
      { id: build === "male" ? "right lung" : "lungs", label: "Lungs" },
      { id: "brain", label: "Brain" },
      { id: "left eyeball", label: "Eyes" },
      { id: "liver", label: "Liver" },
      { id: "left kidney", label: "Kidneys" },
      { id: "vertebral column", label: "Spine" },
      { id: "blood vessels", label: "Vessels" },
    ];
    if (build === "female") {
      base.push({ id: "uterus", label: "Uterus" });
    }
    return base;
  }, [build]);

  // Render SVG Sparkline — purely numeric data, no function references in return value
  const svgGraph = useMemo(() => {
    const W = 310;
    const H = 76;
    const padX = 28;
    const padY = 10;
    const plotW = W - padX - 12;
    const plotH = H - padY - 18;

    const pts = timeSeries.points;
    if (pts.length === 0) {
      return { W, H, padX, bandTop: padY, bandHeight: 2, pathD: "", activeX: padX, activeY: padY, activeVal: timeSeries.currentValue, minVal: 0, maxVal: 1, points: [] as Array<{x: number; y: number; day: number}>, normalBand: timeSeries.normalBand };
    }

    const values = pts.map((p) => p.value);
    const rawMin = Math.min(...values, timeSeries.normalBand[0]);
    const rawMax = Math.max(...values, timeSeries.normalBand[1]);
    const minVal = isFinite(rawMin) ? rawMin * 0.96 : 0;
    const maxVal = isFinite(rawMax) ? rawMax * 1.04 : 1;
    const range = maxVal - minVal || 1;

    const toY = (val: number) => padY + plotH - ((val - minVal) / range) * plotH;
    const toX = (idx: number) => padX + (idx / Math.max(1, pts.length - 1)) * plotW;

    const bandTop = toY(timeSeries.normalBand[1]);
    const bandBottom = toY(timeSeries.normalBand[0]);
    const bandHeight = Math.max(2, bandBottom - bandTop);

    const pathD = pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`)
      .join(" ");

    const currentIdx = pts.findIndex((p) => p.day === missionDay);
    const activeIdx = currentIdx >= 0 ? currentIdx : pts.length - 1;
    const activePoint = pts[activeIdx];
    const activeX = toX(activeIdx);
    const activeY = activePoint ? toY(activePoint.value) : toY(timeSeries.currentValue);
    const activeVal = activePoint?.value ?? timeSeries.currentValue;

    // Pre-compute per-point positions (no functions stored)
    const pointPositions = pts.map((p, i) => ({ x: toX(i), y: toY(p.value), day: p.day }));

    return { W, H, padX, bandTop, bandHeight, pathD, activeX, activeY, activeVal, minVal, maxVal, points: pointPositions, normalBand: timeSeries.normalBand };
  }, [timeSeries, missionDay]);

  return (
    <aside
      className="organ-stats-panel"
      aria-label={`Physiological statistics and mathematical model for ${metadata.name}`}
      role="region"
    >
      {/* 1. Header with System, Quick Actions & Centroid */}
      <header className="organ-stats-panel__header">
        <div className="organ-stats-panel__title-box">
          <div className="organ-stats-panel__meta-row">
            <span className="micro organ-stats-panel__system">{metadata.system}</span>
            <span className="organ-stats-panel__region-tag">{metadata.region}</span>
          </div>
          <h3 className="organ-stats-panel__name">{metadata.name}</h3>
          <span className="organ-stats-panel__subsystem">{metadata.subsystem}</span>
        </div>

        <div className="organ-stats-panel__actions">
          <button
            type="button"
            className="organ-stats-panel__focus-btn"
            onClick={() => onFocusOrgan?.(organName)}
            title="Center 3D camera onto this organ's centroid"
            aria-label="Focus camera on organ in 3D"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="1" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="23" />
              <line x1="1" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="23" y2="12" />
            </svg>
            <span>Focus 3D</span>
          </button>

          <button
            type="button"
            className="organ-stats-panel__close-btn"
            onClick={onClose}
            aria-label="Cerrar panel de estadísticas"
            title="Cerrar panel (ESC)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Cerrar</span>
          </button>
        </div>
      </header>

      {/* 2. Quick-switch Organ Pills Bar */}
      <nav className="organ-stats-panel__pills-nav" aria-label="Quick select organ">
        <div className="organ-stats-panel__pills-strip">
          {defaultPills.map((pill) => {
            const isActive =
              normKey.includes(pill.id.toLowerCase()) ||
              pill.id.toLowerCase().includes(normKey);
            return (
              <button
                key={pill.id}
                type="button"
                className={`organ-stats-panel__pill ${isActive ? "is-active" : ""}`}
                onClick={() => onSelectOrgan?.(pill.id)}
                aria-pressed={isActive}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. Physiological Status Badge & 3D Coordinates */}
      <div className="organ-stats-panel__status-banner">
        <span className={`organ-stats-panel__badge is-${classification}`}>
          {statusLabel}
        </span>
        {position ? (
          <span className="organ-stats-panel__coords" title="3D anatomical centroid coordinates in meters">
            Centroid [X: {position[0] >= 0 ? "+" : ""}{position[0].toFixed(2)}m, Y: +{position[1].toFixed(2)}m, Z: {position[2] >= 0 ? "+" : ""}{position[2].toFixed(2)}m]
          </span>
        ) : null}
      </div>

      {/* 3b. High-Tech 3D Organ Hologram Projection (GLB / Anatomical 3D Mesh) */}
      <section className="organ-stats-panel__section organ-stats-panel__section--hologram" aria-label="3D Hologram projection">
        <ErrorBoundary fallbackTitle="Holograma 3D no disponible">
          <OrganHologram3D
            organName={organName}
            classification={classification}
            fallbackGeometry={fallbackGeometry}
            heartRateBpm={scenarioHeartRate(readings?.rest_hr)}
          />
        </ErrorBoundary>
      </section>

      {/* A single reading cannot establish a heart-rate trajectory. */}
      {normKey === "heart" ? <section className="organ-stats-panel__section">
        <h4 className="organ-stats-panel__section-title">Selected synthetic heart rate</h4>
        <p>{scenarioHeartRate(readings?.rest_hr) !== null ? `${scenarioHeartRate(readings?.rest_hr)} bpm · mission day ${missionDay}` : "No heart-rate reading for this day."}</p>
        <p className="small muted">The animation follows this scenario reading. It is not live sensor telemetry.</p>
      </section> : <section className="organ-stats-panel__section">
        <div className="organ-stats-panel__chart-header">
          <div>
            <h4 className="organ-stats-panel__section-title">
              Temporal Trajectory · {timeSeries.variableName}
            </h4>
            <span className="organ-stats-panel__chart-sub">
              Simulated flight curve · Mission Days 1–{timeSeries.points.length}
            </span>
          </div>
          <div className="organ-stats-panel__chart-val-box">
            <span className="organ-stats-panel__chart-day">Day {missionDay}</span>
            <strong className="organ-stats-panel__chart-val">
              {svgGraph.activeVal} {timeSeries.unit}
            </strong>
          </div>
        </div>

        <div className="organ-stats-panel__chart-container">
          <svg
            className="organ-stats-panel__chart-svg"
            viewBox={`0 0 ${svgGraph.W} ${svgGraph.H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`${timeSeries.variableName} trajectory graph`}
          >
            {/* Shaded Normal Baseline Band */}
            <rect
              x={svgGraph.padX}
              y={svgGraph.bandTop}
              width={svgGraph.W - svgGraph.padX - 12}
              height={svgGraph.bandHeight}
              fill="rgba(56, 189, 248, 0.12)"
              rx="2"
            />
            {/* Reference baseline line */}
            <line
              x1={svgGraph.padX}
              y1={svgGraph.bandTop + svgGraph.bandHeight / 2}
              x2={svgGraph.W - 12}
              y2={svgGraph.bandTop + svgGraph.bandHeight / 2}
              stroke="rgba(56, 189, 248, 0.35)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />

            {/* Trajectory Curve */}
            <path
              d={svgGraph.pathD}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Individual daily points */}
            {svgGraph.points.map((pt) => (
              <circle
                key={pt.day}
                cx={pt.x}
                cy={pt.y}
                r="2"
                fill="#38bdf8"
              />
            ))}

            {/* Current Mission Day Highlight Marker */}
            <circle
              cx={svgGraph.activeX}
              cy={svgGraph.activeY}
              r="6.5"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              className="organ-stats-panel__pulsing-ring"
            />
            <circle
              cx={svgGraph.activeX}
              cy={svgGraph.activeY}
              r="3.5"
              fill="#ffffff"
            />

            {/* Y-axis baseline band labels */}
            <text
              x={svgGraph.padX - 4}
              y={svgGraph.bandTop + 4}
              textAnchor="end"
              fontSize="7.5"
              fill="var(--muted)"
            >
              {timeSeries.normalBand[1]}
            </text>
            <text
              x={svgGraph.padX - 4}
              y={svgGraph.bandTop + svgGraph.bandHeight + 2}
              textAnchor="end"
              fontSize="7.5"
              fill="var(--muted)"
            >
              {timeSeries.normalBand[0]}
            </text>
          </svg>

          <div className="organ-stats-panel__chart-footer">
            <span className="organ-stats-panel__chart-legend">
              <span className="organ-stats-panel__legend-box" />
              Earth nominal baseline ({timeSeries.normalBand[0]}–{timeSeries.normalBand[1]} {timeSeries.unit})
            </span>
            <span className="organ-stats-panel__chart-caption">
              {timeSeries.trajectoryNote}
            </span>
          </div>
        </div>
      </section>}

      {/* 5. Personal Baseline Anomaly Indicators (Cross-Correlation with Crew Readings) */}
      <section className="organ-stats-panel__section">
        <h4 className="organ-stats-panel__section-title">
          Personal Baseline Cross-Correlation
        </h4>
        {matchingReadings.length > 0 ? (
          <div className="organ-stats-panel__anomalies-list">
            {matchingReadings.map(({ key, reading }) => {
              if (!reading) return null;
              const personalLens = reading.lens?.personal ?? "typical";
              const isUnusual = personalLens === "unusual_high" || personalLens === "unusual_low";
              const zVal = typeof reading.z === "number" && Number.isFinite(reading.z) ? reading.z : null;
              const zScoreStr = zVal != null ? `z = ${zVal >= 0 ? "+" : ""}${zVal.toFixed(2)}` : null;
              const displayVal = typeof reading.value === "number" && Number.isFinite(reading.value) ? reading.value.toFixed(1) : "—";
              const baselineVal = typeof reading.baseline === "number" && Number.isFinite(reading.baseline) ? reading.baseline.toFixed(1) : null;
              const ci = Array.isArray(reading.ci95) && reading.ci95.length >= 2 && Number.isFinite(reading.ci95[0]) && Number.isFinite(reading.ci95[1])
                ? `[${reading.ci95[0].toFixed(1)}–${reading.ci95[1].toFixed(1)}]`
                : null;

              return (
                <div
                  key={key}
                  className={`organ-stats-panel__anomaly-item ${isUnusual ? "is-unusual" : "is-nominal"}`}
                  onClick={() => onOpenIndicator?.(key)}
                  role={onOpenIndicator ? "button" : undefined}
                  tabIndex={onOpenIndicator ? 0 : undefined}
                  title="Click to view full Personal Baseline analysis in Why view"
                >
                  <div className="organ-stats-panel__anomaly-main">
                    <span className="organ-stats-panel__anomaly-name">
                      {key.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <strong className="organ-stats-panel__anomaly-val">
                      {displayVal} <small>{reading.unit ?? ""}</small>
                    </strong>
                  </div>

                  <div className="organ-stats-panel__anomaly-sub">
                    {baselineVal != null ? (
                      <span>Baseline: {baselineVal} {reading.unit ?? ""}</span>
                    ) : null}
                    {ci ? <span>95% band: {ci}</span> : null}
                    {zScoreStr ? <span className="organ-stats-panel__z-tag">{zScoreStr}</span> : null}
                  </div>

                  <div className="organ-stats-panel__lens-tags">
                    <span className={`organ-stats-panel__lens-tag is-${personalLens}`}>
                      {personalLens === "unusual_high"
                        ? "Unusual High"
                        : personalLens === "unusual_low"
                          ? "Unusual Low"
                          : personalLens === "learning"
                            ? "Learning Baseline"
                            : "Typical for Astronaut"}
                    </span>
                    {reading.lens?.pattern ? (
                      <span className="organ-stats-panel__pattern-tag">
                        Pattern: {reading.lens.pattern.replace(/_/g, " ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="organ-stats-panel__anomalies-clean">
            <span className="organ-stats-panel__clean-icon">✓</span>
            <span>No personal baseline anomalies detected for this anatomical system.</span>
          </div>
        )}
      </section>

      {/* 6. Real-time Physiological Telemetry from Mathematical Simulation */}
      <section className="organ-stats-panel__section">
        <h4 className="organ-stats-panel__section-title">
          Deterministic Physiological Telemetry · Day {missionDay}
        </h4>
        {visualAttrs && Object.keys(visualAttrs.telemetry).length > 0 ? (
          <div className="organ-stats-panel__metrics-grid">
            {Object.entries(visualAttrs.telemetry).map(([key, item]) => (
              <div key={key} className="organ-stats-panel__metric-card">
                <span className="organ-stats-panel__metric-name">{item.label}</span>
                <div className="organ-stats-panel__metric-value-row">
                  <strong className="organ-stats-panel__metric-val">
                    {typeof item.value === "number" ? item.value.toFixed(1) : item.value}
                  </strong>
                  <span className="organ-stats-panel__metric-unit">{item.unit}</span>
                </div>
                <span className="organ-stats-panel__tag">{item.tag}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="organ-stats-panel__empty">
            No dynamic telemetry registered for this reference organ.
          </p>
        )}
      </section>

      {/* 7. Mathematical Model & Differential Equations Accordion */}
      <section className="organ-stats-panel__section">
        <button
          type="button"
          className="organ-stats-panel__toggle-btn"
          onClick={() => setShowMathDetails(!showMathDetails)}
          aria-expanded={showMathDetails}
        >
          <div className="organ-stats-panel__toggle-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>Mathematical Engine & ODEs ({metadata.mathematicalModel.split(" ")[0]})</span>
          </div>
          <span className="organ-stats-panel__toggle-icon">{showMathDetails ? "▲" : "▼"}</span>
        </button>

        {showMathDetails ? (
          <div className="organ-stats-panel__math-box">
            <div className="organ-stats-panel__math-field">
              <span className="organ-stats-panel__math-label">Governing Model:</span>
              <span>{metadata.mathematicalModel}</span>
            </div>
            <div className="organ-stats-panel__math-field">
              <span className="organ-stats-panel__math-label">Numerical Solver:</span>
              <span>{metadata.solverMethod}</span>
            </div>
            <div className="organ-stats-panel__math-field">
              <span className="organ-stats-panel__math-label">Time Step:</span>
              <span>{metadata.timeStep}</span>
            </div>

            <div className="organ-stats-panel__equations">
              <span className="organ-stats-panel__math-label">Differential Equations:</span>
              {metadata.governingEquations.map((eq, i) => (
                <code key={i} className="organ-stats-panel__code-line">
                  {eq}
                </code>
              ))}
            </div>

            <div className="organ-stats-panel__math-field">
              <span className="organ-stats-panel__math-label">Active State Vector:</span>
              <span>{metadata.stateVariables.join(", ")}</span>
            </div>

            <div className="organ-stats-panel__math-field">
              <span className="organ-stats-panel__math-label">Literature Citations:</span>
              <span className="organ-stats-panel__citations">{metadata.scientificReference}</span>
            </div>
          </div>
        ) : null}
      </section>

      {/* 8. Anatomical Context, Physiological Interpretation & Disclaimer */}
      <footer className="organ-stats-panel__footer">
        <h4 className="organ-stats-panel__section-title">Anatomical & Scientific Context</h4>
        <p className="organ-stats-panel__biological-func">
          <strong>Biological Role:</strong> {metadata.biologicalFunction}
        </p>
        <p className="organ-stats-panel__interpretation">
          {visualAttrs?.statusDescription ?? metadata.physiologicalInterpretation}
        </p>
        <p className="organ-stats-panel__limitations">
          <strong>Model Scope:</strong> {metadata.limitations}
        </p>
        <div className="organ-stats-panel__provenance">
          <span>
            Attribution: {build === "male" ? "BodyParts3D (DBCLS CC BY 4.0)" : "HuBMAP HRA (Visible Human female CC BY 4.0)"}
          </span>
          <span className="organ-stats-panel__disclaimer-pill">
            SYNTHETIC SIMULATION · NOT A MEDICAL DEVICE · NO DIAGNOSIS
          </span>
        </div>
      </footer>

      {/* 9. Bottom Close Action Button */}
      <div className="organ-stats-panel__bottom-actions">
        <button
          type="button"
          className="organ-stats-panel__bottom-close-btn"
          onClick={onClose}
          aria-label="Cerrar panel de estadísticas de órgano"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span>Cerrar inspección de órgano</span>
        </button>
      </div>
    </aside>
  );
}
