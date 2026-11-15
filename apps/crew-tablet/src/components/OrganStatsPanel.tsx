import { useMemo, useState } from "react";
import type { OrganVisualAttributes } from "../physiology/types";

export interface OrganMetadata {
  id: string;
  name: string;
  system: string;
  subsystem: string;
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
    mathematicalModel: "Blomqvist-Guyton Spaceflight Hemodynamic Model",
    governingEquations: [
      "d(V_shift)/dt = (V_target(g) - V_shift) / tau_shift",
      "d(plasma)/dt = (plasma_target(g) - plasma) / tau_plasma",
      "SV(t) = SV_0 * (1 + 0.18 * V_shift / V_max) * plasma",
      "CO = (HR * SV) / 1000,   MAP = CO * TPR",
      "d(HR)/dt = (HR_target(MAP) - HR) / tau_baro",
    ],
    stateVariables: ["Heart Rate (bpm)", "Thoracic Fluid Shift (mL)", "Plasma Volume Fraction", "Stroke Volume (mL)", "Cardiac Output (L/min)"],
    solverMethod: "4th-Order Runge-Kutta (RK4) with physiological boundary clamping",
    timeStep: "dt = 60 s (sub-step h = 15 s)",
    scientificReference: "Blomqvist & Stone (1983); Buckey et al. (NEJM 1996); Leach et al. (J Appl Physiol 1996)",
    physiologicalInterpretation: "In microgravity (0G), absence of the hydrostatic venous gradient causes cephalad shift of ~1.8 L of interstitial fluid from lower limbs into the thorax, transiently augmenting ventricular pre-load before adaptive plasma contraction.",
    limitations: "Lumped-parameter single-compartment model. Does not include valvular shear stress or electrophysiological micro-arrhythmia dynamics.",
  },
  brain: {
    id: "brain",
    name: "Brain & Intracranial Cavity",
    system: "Central Nervous System",
    subsystem: "Craniospinal Dynamics & Cerebrovascular Autoregulation",
    mathematicalModel: "Lakin-Stenger Intracranial-CSF Compliance Model",
    governingEquations: [
      "ICP_target = ICP_0 + 12.0 * (1 - g) + delta_ICP(CO2) + 0.45 * (JVP - 3.0)",
      "d(ICP)/dt = (ICP_target - ICP) / tau_ICP",
      "CBF = CBF_0 + k_co2 * delta_PCO2",
      "d(Vestibular)/dt = (1.0 - Vestibular) / tau_vestibular",
    ],
    stateVariables: ["Intracranial Pressure (mmHg)", "Cerebral Blood Flow Velocity (cm/s)", "Vestibular Adaptation Index"],
    solverMethod: "4th-Order Runge-Kutta (RK4) with cerebrospinal compliance bounds",
    timeStep: "dt = 60 s (tau_ICP = 1800 s)",
    scientificReference: "Lakin et al. (Math Comput Model 2007); Stenger et al. (NASA HRP 2017); Reschke et al. (2014)",
    physiologicalInterpretation: "Loss of upright gravitational posture abolishes negative upright ICP (-2 to +2 mmHg), stabilizing ICP at continuous supine levels (13-15 mmHg). Mild hypercapnic vasodilation further raises intracranial compliance strain.",
    limitations: "Approximates rigid Monroe-Kellie craniospinal vault without pulsatile transcranial Doppler waveform modeling.",
  },
  "left eyeball": {
    id: "eyeball",
    name: "Ocular Globes & Optic Nerve Sheaths (SANS)",
    system: "Visual & Ocular System",
    subsystem: "Retrobulbar Optic Nerve & Lamina Cribrosa",
    mathematicalModel: "NASA HRP SANS Translaminar Pressure Model",
    governingEquations: [
      "TLCPD = IOP - ICP",
      "Strain_optic = 1.0 + (max(0, ICP - 10) / 10) * (1 - exp(-missionDay / 14)) * 0.35",
      "IOP(t) = IOP_0 + 1.8 * (1 - g) * exp(-missionDay / 5)",
    ],
    stateVariables: ["Intraocular Pressure (mmHg)", "Translaminar Pressure Difference (mmHg)", "Optic Nerve Sheath Strain Index"],
    solverMethod: "Empirical finite-difference and analytical viscoelastic ODE",
    timeStep: "dt = 60 s",
    scientificReference: "Mader et al. (Ophthalmology 2011); Stenger et al. (NASA HRP SANS Evidence Book 2017)",
    physiologicalInterpretation: "Sustained elevation of ICP closes the positive translaminar cribrosa pressure gradient (normally +13 mmHg on Earth), inducing posterior globe flattening, optic disc edema, and optic sheath distension (SANS risk).",
    limitations: "Does not simulate choroidal vascular bed pulsatile engorgement or optical coherence tomography (OCT) retinal nerve fiber layer thickness directly.",
  },
  "right eyeball": {
    id: "eyeball",
    name: "Ocular Globes & Optic Nerve Sheaths (SANS)",
    system: "Visual & Ocular System",
    subsystem: "Retrobulbar Optic Nerve & Lamina Cribrosa",
    mathematicalModel: "NASA HRP SANS Translaminar Pressure Model",
    governingEquations: [
      "TLCPD = IOP - ICP",
      "Strain_optic = 1.0 + (max(0, ICP - 10) / 10) * (1 - exp(-missionDay / 14)) * 0.35",
      "IOP(t) = IOP_0 + 1.8 * (1 - g) * exp(-missionDay / 5)",
    ],
    stateVariables: ["Intraocular Pressure (mmHg)", "Translaminar Pressure Difference (mmHg)", "Optic Nerve Sheath Strain Index"],
    solverMethod: "Empirical finite-difference and analytical viscoelastic ODE",
    timeStep: "dt = 60 s",
    scientificReference: "Mader et al. (Ophthalmology 2011); Stenger et al. (NASA HRP SANS Evidence Book 2017)",
    physiologicalInterpretation: "Sustained elevation of ICP closes the positive translaminar cribrosa pressure gradient (normally +13 mmHg on Earth), inducing posterior globe flattening, optic disc edema, and optic sheath distension (SANS risk).",
    limitations: "Does not simulate choroidal vascular bed pulsatile engorgement or optical coherence tomography (OCT) retinal nerve fiber layer thickness directly.",
  },
  lung: {
    id: "lung",
    name: "Lungs & Alveolar Gas Exchange",
    system: "Respiratory System",
    subsystem: "Alveolar-Capillary Diffusion & Ventilatory Drive",
    mathematicalModel: "Severinghaus-West Alveolar Gas Exchange & CO2 Mass Balance",
    governingEquations: [
      "d(PaCO2)/dt = (1 / V_alv) * [ (VCO2 * (PB - 47) / 1000) - alvVent * (PaCO2 - PiCO2) ]",
      "d(RR)/dt = (RR_0 + G_chemo * max(0, PaCO2 - 40) - RR) / tau_chemo",
      "PaO2 = PiO2 - (PaCO2 / R)",
      "SpO2 = 100 / (1 + 23400 / (PaO2^3 + 150 * PaO2))",
    ],
    stateVariables: ["Alveolar PCO2 (mmHg)", "Alveolar PO2 (mmHg)", "Arterial SpO2 (%)", "Respiratory Rate (bpm)", "Tidal Volume (L)"],
    solverMethod: "4th-Order Runge-Kutta (RK4) with mass conservation",
    timeStep: "dt = 60 s (tau_chemo = 10 s)",
    scientificReference: "West (Physiol Rev 2000); Prisk (J Appl Physiol 2014); Law et al. (NASA TP-2014-217391); Severinghaus (1979)",
    physiologicalInterpretation: "In microgravity, ventilation-perfusion uniformity improves slightly, but elevated cabin ambient CO2 (1500-3000 ppm) increases inspired PiCO2, demanding elevated alveolar ventilation to maintain arterial blood gas equilibrium.",
    limitations: "Assumes two-compartment lung model (alveolar gas and dead space) without regional gravity-independent airway resistance heterogeneity.",
  },
  lungs: {
    id: "lung",
    name: "Lungs & Alveolar Gas Exchange",
    system: "Respiratory System",
    subsystem: "Alveolar-Capillary Diffusion & Ventilatory Drive",
    mathematicalModel: "Severinghaus-West Alveolar Gas Exchange & CO2 Mass Balance",
    governingEquations: [
      "d(PaCO2)/dt = (1 / V_alv) * [ (VCO2 * (PB - 47) / 1000) - alvVent * (PaCO2 - PiCO2) ]",
      "d(RR)/dt = (RR_0 + G_chemo * max(0, PaCO2 - 40) - RR) / tau_chemo",
      "PaO2 = PiO2 - (PaCO2 / R)",
      "SpO2 = 100 / (1 + 23400 / (PaO2^3 + 150 * PaO2))",
    ],
    stateVariables: ["Alveolar PCO2 (mmHg)", "Alveolar PO2 (mmHg)", "Arterial SpO2 (%)", "Respiratory Rate (bpm)", "Tidal Volume (L)"],
    solverMethod: "4th-Order Runge-Kutta (RK4) with mass conservation",
    timeStep: "dt = 60 s (tau_chemo = 10 s)",
    scientificReference: "West (Physiol Rev 2000); Prisk (J Appl Physiol 2014); Law et al. (NASA TP-2014-217391); Severinghaus (1979)",
    physiologicalInterpretation: "In microgravity, ventilation-perfusion uniformity improves slightly, but elevated cabin ambient CO2 (1500-3000 ppm) increases inspired PiCO2, demanding elevated alveolar ventilation to maintain arterial blood gas equilibrium.",
    limitations: "Assumes two-compartment lung model (alveolar gas and dead space) without regional gravity-independent airway resistance heterogeneity.",
  },
  liver: {
    id: "liver",
    name: "Liver & Hepatic Core Metabolism",
    system: "Metabolic & Thermoregulatory System",
    subsystem: "Hepato-Splanchnic Heat & Energy Production",
    mathematicalModel: "Stahn-Gunga Core Thermal Balance ('Space Fever') Model",
    governingEquations: [
      "h_eff = h_0 * (1 - delta_convective * (1 - g))",
      "d(T_core)/dt = (Q_metabolic - [h_eff * (T_core - T_ambient) + Q_sweat]) / C_thermal",
      "T_skin = T_ambient + 0.65 * (T_core - T_ambient)",
    ],
    stateVariables: ["Core Body Temperature (°C)", "Skin Temperature (°C)", "Metabolic Heat (W)", "Heat Dissipation Rate (W)"],
    solverMethod: "4th-Order Runge-Kutta (RK4) with sweating threshold feedback",
    timeStep: "dt = 60 s (C_thermal = 260,000 J/°C)",
    scientificReference: "Stahn et al. (Sci Rep 2017); Gunga et al. (Essentials of Clinical Human Space Physiology 2016)",
    physiologicalInterpretation: "Loss of natural buoyant air convection in weightlessness impairs passive heat dissipation through the skin, resulting in an elevated basal core setpoint (+0.8°C to +1.0°C) known as 'Space Fever'.",
    limitations: "Uniform body thermal capacitance assumption; does not resolve multi-node peripheral extremity vasodilation gradients.",
  },
  stomach: {
    id: "stomach",
    name: "Stomach & Gastrointestinal System",
    system: "Digestive System",
    subsystem: "Gastric Motility & Splanchnic Reservoir",
    mathematicalModel: "Splanchnic Fluid Distribution Reference Model",
    governingEquations: [
      "V_splanchnic = V_splanchnic0 * (1 + 0.04 * (1 - g))",
      "Motility_index = 1.0 - 0.25 * (1 - Vestibular_adaptation)",
    ],
    stateVariables: ["Splanchnic Volume Ratio", "Gastric Motility Index"],
    solverMethod: "Coupled algebraic transfer function",
    timeStep: "Equilibrated",
    scientificReference: "Reschke et al. (2014); Norsk (Eur J Appl Physiol 2015)",
    physiologicalInterpretation: "Early flight neurovestibular mismatch ('Space Motion Sickness') suppresses gastric motility and gastric emptying rate until central vestibular adaptation completes (~day 3).",
    limitations: "Empirical heuristic coupled to vestibular adaptation state without smooth muscle electromyography.",
  },
  "left kidney": {
    id: "kidney",
    name: "Kidneys & Renal Clearance",
    system: "Renal & Urinary System",
    subsystem: "Glomerular Filtration & Gauer-Henry Reflex",
    mathematicalModel: "Gauer-Henry Volume-Regulatory Neurohormonal Model",
    governingEquations: [
      "ADH_suppression = (V_shift / V_max) * K_ADH * (1 - g) * exp(-missionDay / 4)",
      "R_eff = R_0 - 0.007 * ADH_supp - 0.005 * ANP_stim",
      "V_urine = GFR_0 * (1 - R_eff) * 60",
      "d(Fluid_balance)/dt = (Intake - V_urine - Perspiration) / 3600",
    ],
    stateVariables: ["Glomerular Filtration Rate (mL/min)", "Urine Output Rate (mL/h)", "Cumulative Fluid Balance (mL)", "ADH Suppression Index"],
    solverMethod: "4th-Order Runge-Kutta (RK4) with hormonal relaxation",
    timeStep: "dt = 60 s (tau_ADH = 14400 s)",
    scientificReference: "Gauer & Henry (1976); Drummer et al. (J Gravit Physiol 2000); Leach (Science 1992); Norsk (2015)",
    physiologicalInterpretation: "Central atrial stretch by shifted blood triggers the Gauer-Henry reflex, suppressing vasopressin (ADH) and releasing atrial natriuretic peptide (ANP), driving early flight diuresis and a ~15% contraction in total extracellular water.",
    limitations: "Does not simulate renal tubular stone crystallization kinetics (calcium oxalate supersaturation).",
  },
  "right kidney": {
    id: "kidney",
    name: "Kidneys & Renal Clearance",
    system: "Renal & Urinary System",
    subsystem: "Glomerular Filtration & Gauer-Henry Reflex",
    mathematicalModel: "Gauer-Henry Volume-Regulatory Neurohormonal Model",
    governingEquations: [
      "ADH_suppression = (V_shift / V_max) * K_ADH * (1 - g) * exp(-missionDay / 4)",
      "R_eff = R_0 - 0.007 * ADH_supp - 0.005 * ANP_stim",
      "V_urine = GFR_0 * (1 - R_eff) * 60",
      "d(Fluid_balance)/dt = (Intake - V_urine - Perspiration) / 3600",
    ],
    stateVariables: ["Glomerular Filtration Rate (mL/min)", "Urine Output Rate (mL/h)", "Cumulative Fluid Balance (mL)", "ADH Suppression Index"],
    solverMethod: "4th-Order Runge-Kutta (RK4) with hormonal relaxation",
    timeStep: "dt = 60 s (tau_ADH = 14400 s)",
    scientificReference: "Gauer & Henry (1976); Drummer et al. (J Gravit Physiol 2000); Leach (Science 1992); Norsk (2015)",
    physiologicalInterpretation: "Central atrial stretch by shifted blood triggers the Gauer-Henry reflex, suppressing vasopressin (ADH) and releasing atrial natriuretic peptide (ANP), driving early flight diuresis and a ~15% contraction in total extracellular water.",
    limitations: "Does not simulate renal tubular stone crystallization kinetics (calcium oxalate supersaturation).",
  },
  "vertebral column": {
    id: "spine",
    name: "Vertebral Column & Weight-Bearing Skeleton",
    system: "Musculoskeletal System",
    subsystem: "Trabecular Bone Remodeling & Calcium Metabolism",
    mathematicalModel: "Frost Mechanostat Bone Remodeling Model",
    governingEquations: [
      "Load_eff = g + 0.85 * Exercise_load",
      "d(BMD)/dt = - (k_resorb / 100) * max(0, 1 - Load_eff) + k_exercise * W_ARED",
      "Efflux_Ca = Efflux_0 + 850.0 * (1 - BMD) * (1 - g)  [mg/day]",
      "d(Muscle)/dt = - (k_atrophy / 100) * max(0, 1 - Load_eff) + k_muscle * Exercise_load",
    ],
    stateVariables: ["Trabecular BMD Ratio", "Daily Calcium Efflux (mg/day)", "Postural Muscle Volume Ratio"],
    solverMethod: "4th-Order Runge-Kutta (RK4) normalized per day",
    timeStep: "dt = 60 s",
    scientificReference: "Frost (Anat Rec 2003); Lang et al. (J Bone Miner Res 2004); Sibonga (NASA HRP Evidence Report 2013)",
    physiologicalInterpretation: "Absence of axial gravitational compression removes the mechanostat osteocyte signal, causing osteoclasts to resorb trabecular bone in the spine and hips at ~1.0-1.2% per month, releasing calcium into the bloodstream.",
    limitations: "Cellular osteoblast/osteoclast signaling pathways (RANKL/OPG) are represented macroscopically through the mechanostat transfer function.",
  },
  "blood vessels": {
    id: "vasculature",
    name: "Great Vessels & Internal Jugular Veins",
    system: "Vascular & Peripheral Circulation",
    subsystem: "Cephalad Venous Engorgement & Outflow Compliance",
    mathematicalModel: "NASA HRP / Marshall-Goebel Jugular Stasis Hemodynamic Model",
    governingEquations: [
      "JVP = max(1.0, CVP + 5.5 * (1 - g))",
      "Vessel_dilation = 1.0 + 0.06 * (JVP / 12.0)",
      "P_transmural = JVP - P_ambient",
    ],
    stateVariables: ["Internal Jugular Pressure (mmHg)", "Venous Dilation Factor", "Central Venous Pressure (mmHg)"],
    solverMethod: "Hydrostatic compliance solver coupled to central venous pressure",
    timeStep: "Instantaneous state coupling",
    scientificReference: "Marshall-Goebel et al. (JAMA Netw Open 2019); Buckey et al. (1996)",
    physiologicalInterpretation: "Elimination of the hydrostatic downward column produces jugular venous distension, elevated internal jugular venous pressure (8-12 mmHg), and reduced flow velocity, predisposing to venous flow stasis.",
    limitations: "1D cross-sectional compliance model without Navier-Stokes fluid-structure interaction (FSI).",
  },
  uterus: {
    id: "uterus",
    name: "Uterus (Reference Anatomical Baseline)",
    system: "Reproductive System",
    subsystem: "Pelvic Viscera (Female Exclusive)",
    mathematicalModel: "Anatomical Baseline Reference (No Synthetic Extrapolation)",
    governingEquations: [
      "Status = Baseline Reference (Static)",
      "Dynamic ODEs = Omitted per NASA Scientific Data Rule",
    ],
    stateVariables: ["Reference anatomy"],
    solverMethod: "Static geometric reference",
    timeStep: "N/A",
    scientificReference: "HuBMAP Consortium (HRA Visible Human female CC BY 4.0); NASA HRP Guidelines",
    physiologicalInterpretation: "Retained as a verified 3D geometric reference in the female anatomical build. In accordance with LIGHTMINUTE scientific integrity rules, dynamic microgravity endocrine ODEs are omitted because open peer-reviewed flight curves are not published.",
    limitations: "No synthetic extrapolation is performed on unverified endocrine variables.",
  },
};

interface OrganStatsPanelProps {
  organName: string;
  visualAttrs?: OrganVisualAttributes;
  build: "male" | "female";
  missionDay: number;
  onClose: () => void;
}

export function OrganStatsPanel({
  organName,
  visualAttrs,
  build,
  missionDay,
  onClose,
}: OrganStatsPanelProps) {
  const [showMathDetails, setShowMathDetails] = useState(false);

  // Match organ metadata by canonical key
  const normKey = organName.toLowerCase();
  const metadata = useMemo<OrganMetadata>(() => {
    // Exact or partial match in registry
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

  const classification = visualAttrs?.classification ?? "reference";
  const statusLabel =
    classification === "mild_strain"
      ? "Mild Strain Detected"
      : classification === "adapted_nominal"
        ? "Adapted to Microgravity"
        : classification === "sustained_deviation"
          ? "Sustained Deviation"
          : "Anatomical Reference";

  return (
    <aside
      className="organ-stats-panel"
      aria-label={`Physiological statistics for ${metadata.name}`}
      role="region"
    >
      {/* A. Encabezado */}
      <header className="organ-stats-panel__header">
        <div className="organ-stats-panel__title-box">
          <span className="micro organ-stats-panel__system">
            {metadata.system} · {build === "male" ? "Male Build" : "Female Build"}
          </span>
          <h3 className="organ-stats-panel__name">{metadata.name}</h3>
          <span className="organ-stats-panel__subsystem">{metadata.subsystem}</span>
        </div>
        <div className="organ-stats-panel__actions">
          <span className={`organ-stats-panel__badge is-${classification}`}>
            {statusLabel}
          </span>
          <button
            type="button"
            className="organ-stats-panel__close-btn"
            onClick={onClose}
            aria-label="Close organ statistics panel"
          >
            ✕
          </button>
        </div>
      </header>

      {/* B. Estado Fisiológico en Tiempo Real */}
      <section className="organ-stats-panel__section">
        <h4 className="organ-stats-panel__section-title">Simulated physiology · Day {missionDay}</h4>
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

      {/* D. Parámetros del Modelo Matemático */}
      <section className="organ-stats-panel__section">
        <button
          type="button"
          className="organ-stats-panel__toggle-btn"
          onClick={() => setShowMathDetails(!showMathDetails)}
          aria-expanded={showMathDetails}
        >
          <span>Mathematical Model Details</span>
          <span className="organ-stats-panel__toggle-icon">{showMathDetails ? "▲" : "▼"}</span>
        </button>

        {showMathDetails ? (
          <div className="organ-stats-panel__math-box">
            <p>
              <strong>Governing Model:</strong> {metadata.mathematicalModel}
            </p>
            <p>
              <strong>Numerical Solver:</strong> {metadata.solverMethod}
            </p>
            <p>
              <strong>Integration Step:</strong> {metadata.timeStep}
            </p>
            <div className="organ-stats-panel__equations">
              <strong>Differential Equations:</strong>
              {metadata.governingEquations.map((eq, i) => (
                <code key={i} className="organ-stats-panel__code-line">
                  {eq}
                </code>
              ))}
            </div>
            <p>
              <strong>State Variables:</strong> {metadata.stateVariables.join(", ")}
            </p>
            <p>
              <strong>Scientific Citations:</strong> {metadata.scientificReference}
            </p>
          </div>
        ) : null}
      </section>

      {/* E. Interpretación Científica y Procedencia */}
      <footer className="organ-stats-panel__footer">
        <h4 className="organ-stats-panel__section-title">Physiological Interpretation</h4>
        <p className="organ-stats-panel__interpretation">
          {visualAttrs?.statusDescription ?? metadata.physiologicalInterpretation}
        </p>
        <p className="organ-stats-panel__limitations">
          <strong>Model Scope:</strong> {metadata.limitations}
        </p>
        <p className="organ-stats-panel__disclaimer">
          Illustrative reference anatomy. Synthetic simulation data for mission support. Not a medical device. No clinical diagnosis.
        </p>
      </footer>
    </aside>
  );
}
