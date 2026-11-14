/**
 * PHYSIOLOGY SIMULATOR — TYPES & CONTRACTS
 * 
 * Data classification according to project invariants:
 * - [DATOS REALES]: Verified empirical baseline values from published NASA/peer-reviewed literature.
 * - [SIMULADO]: Values computed through numerical integration of dynamical systems (ODEs).
 * - [ESTIMADO]: Approximate parameters calculated via empirical transfer functions.
 * - [DERIVADO]: Analytical combinations of simulated and real states.
 */

export type DataClassification =
  | "[DATOS REALES]"
  | "[SIMULADO]"
  | "[ESTIMADO]"
  | "[DERIVADO]";

/** Environmental and spaceflight mission context */
export interface SpaceflightContext {
  /** Gravity level in Gs: 0.0 (microgravity), 0.166 (Moon), 0.38 (Mars), 1.0 (Earth) */
  gLevel: number;
  /** Ambient cabin CO2 concentration in parts per million (ppm) */
  cabinCO2_ppm: number;
  /** Mission day elapsed since launch */
  missionDay: number;
  /** Ambient cabin temperature in degrees Celsius */
  ambientTemp_C: number;
  /** Physical exercise load factor (0.0 rest to 1.0 maximal EVA/treadmill countermeasure) */
  exerciseLoad: number;
  /** Fluid intake relative to nominal (1.0 = nominal 2.5 L/day) */
  hydrationFactor: number;
}

/** Numerical solver configuration */
export interface SolverOptions {
  /** Time step in seconds (dt) */
  dt: number;
  /** Numerical integration method */
  method: "rk4" | "euler";
  /** Sub-stepping iterations per simulation tick */
  subSteps?: number;
}

/** Cardiovascular and Hemodynamic State */
export interface CardiovascularState {
  /** Heart rate in beats per minute (bpm) */
  heartRate_bpm: number;
  /** Stroke volume in milliliters (mL) */
  strokeVolume_mL: number;
  /** Cardiac output in liters per minute (L/min) */
  cardiacOutput_Lmin: number;
  /** Mean arterial pressure in mmHg */
  meanArterialPressure_mmHg: number;
  /** Central venous pressure in mmHg */
  centralVenousPressure_mmHg: number;
  /** Internal jugular venous pressure in mmHg */
  jugularVenousPressure_mmHg: number;
  /** Circulating plasma volume relative to 1G nominal (fraction) */
  plasmaVolumeFraction: number;
  /** Cephalad fluid shift fraction from lower extremities */
  thoracicFluidShift_mL: number;
}

/** Neuro-Ocular and Intracranial State (SANS Risk) */
export interface NeuroOcularState {
  /** Intracranial pressure in mmHg */
  intracranialPressure_mmHg: number;
  /** Intraocular pressure in mmHg */
  intraocularPressure_mmHg: number;
  /** Translaminar cribrosa pressure difference (IOP - ICP) in mmHg */
  translaminarPressure_mmHg: number;
  /** Optic nerve sheath diameter expansion ratio */
  opticNerveSheathStrain: number;
  /** Vestibular adaptation index (0.0 acute neuro-vestibular sickness to 1.0 fully adapted) */
  vestibularAdaptation: number;
  /** Cerebral blood flow velocity index (cm/s) */
  cerebralBloodFlow_cms: number;
}

/** Pulmonary and Gas Exchange State */
export interface PulmonaryState {
  /** Respiratory rate in breaths per minute */
  respiratoryRate_bpm: number;
  /** Tidal volume in liters (L) */
  tidalVolume_L: number;
  /** Alveolar ventilation in liters per minute (L/min) */
  alveolarVentilation_Lmin: number;
  /** Alveolar partial pressure of CO2 in mmHg */
  alveolarPCO2_mmHg: number;
  /** Alveolar partial pressure of O2 in mmHg */
  alveolarPO2_mmHg: number;
  /** Arterial blood oxygen saturation percentage */
  arterialSpO2_pct: number;
  /** Hypercapnic ventilatory drive multiplier */
  hypercapnicDrive: number;
}

/** Renal and Fluid Regulation State */
export interface RenalState {
  /** Glomerular filtration rate in mL/min */
  gfr_mLmin: number;
  /** Urine production rate in mL/hour */
  urineOutput_mLh: number;
  /** Cumulative fluid volume balance deviation from launch (mL) */
  fluidBalance_mL: number;
  /** Relative antidiuretic hormone (ADH / vasopressin) suppression index */
  adhSuppressionIndex: number;
  /** Atrial natriuretic peptide (ANP) stimulation index */
  anpStimulationIndex: number;
}

/** Thermoregulatory and Metabolic State */
export interface ThermalMetabolicState {
  /** Core body temperature in degrees Celsius */
  coreTemp_C: number;
  /** Mean skin temperature in degrees Celsius */
  skinTemp_C: number;
  /** Metabolic heat production in Watts */
  metabolicHeat_W: number;
  /** Convective + evaporative heat loss rate in Watts */
  heatLossRate_W: number;
  /** Microgravity convective heat dissipation impairment factor (0.0 to 1.0) */
  convectiveImpairment: number;
  /** Circadian core temperature shift in hours */
  circadianShift_hours: number;
}

/** Musculoskeletal and Bone Mineral State */
export interface MusculoskeletalState {
  /** Trabecular bone mineral density ratio relative to pre-flight (1.0 = nominal) */
  trabecularBMDRatio: number;
  /** Daily bone calcium efflux rate in mg/day */
  calciumEfflux_mgDay: number;
  /** Skeletal muscle protein synthesis / atrophy ratio (1.0 = balanced) */
  muscleVolumeRatio: number;
  /** Effective mechanical loading index (fraction of 1G Earth baseline) */
  mechanicalLoadFraction: number;
}

/** Full organism multi-organ physiological state */
export interface FullOrganismPhysiology {
  time_seconds: number;
  missionDay: number;
  context: SpaceflightContext;
  cardiovascular: CardiovascularState;
  neuroOcular: NeuroOcularState;
  pulmonary: PulmonaryState;
  renal: RenalState;
  thermalMetabolic: ThermalMetabolicState;
  musculoskeletal: MusculoskeletalState;
}

/** 3D Visual parameters mapped from mathematical physiology */
export interface OrganVisualAttributes {
  /** Base RGB color hex representation for PBR material */
  colorHex: number;
  /** Emissive glow RGB color hex */
  emissiveHex: number;
  /** Emissive intensity (0.0 to 1.0) */
  emissiveIntensity: number;
  /** Dynamic pulse frequency in Hz (0 = static, ~1.0 = normal heart rate) */
  pulsationFrequency_Hz: number;
  /** Amplitude of geometric volumetric pulsation (scaling factor delta) */
  pulsationAmplitude: number;
  /** Fluid engorgement volumetric scale multiplier (e.g. 1.05 for venous congestion) */
  volumeScale: number;
  /** Operational classification of the organ state */
  classification: "reference" | "adapted_nominal" | "mild_strain" | "sustained_deviation";
  /** Human-readable explanation of physiological status */
  statusDescription: string;
  /** Specific mathematical variables with values and units for inspection */
  telemetry: Record<string, { value: number; unit: string; label: string; tag: DataClassification }>;
}

/** Result map from organ key to visual parameters */
export type OrganVisualizationMap = Record<string, OrganVisualAttributes>;
