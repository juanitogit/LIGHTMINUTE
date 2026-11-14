/**
 * PHYSIOLOGY 3D VISUAL ADAPTER
 * 
 * Translates multi-organ physiological state into Three.js render attributes:
 * PBR color, emissive intensity, volumetric pulsation frequency, vascular engorgement,
 * and scientific telemetry tags.
 */

import type { FullOrganismPhysiology, OrganVisualAttributes, OrganVisualizationMap } from "./types";

export class Physiology3DAdapter {
  /**
   * Transforms mathematical simulation output into render attributes for each organ.
   */
  public static mapToVisuals(physio: FullOrganismPhysiology): OrganVisualizationMap {
    const map: OrganVisualizationMap = {};

    const cardio = physio.cardiovascular;
    const neuro = physio.neuroOcular;
    const pulmonary = physio.pulmonary;
    const renal = physio.renal;
    const thermal = physio.thermalMetabolic;
    const musculo = physio.musculoskeletal;

    // 1. HEART
    const hr = cardio.heartRate_bpm;
    const isTachycardia = hr > 95.0;
    const isBradycardia = hr < 48.0;
    const cardioStatus = isTachycardia || isBradycardia ? "mild_strain" : "adapted_nominal";

    map["heart"] = {
      colorHex: cardioStatus === "mild_strain" ? 0xe28b62 : 0xc96a79,
      emissiveHex: cardioStatus === "mild_strain" ? 0x8f3212 : 0x000000,
      emissiveIntensity: cardioStatus === "mild_strain" ? 0.35 : 0.0,
      pulsationFrequency_Hz: hr / 60.0, // Convert bpm to Hz
      pulsationAmplitude: 0.016 * (cardio.strokeVolume_mL / 72.0), // Subtle physiological ~1.6% contraction/expansion
      volumeScale: 1.0 + 0.02 * (cardio.thoracicFluidShift_mL / 1750.0),
      classification: cardioStatus,
      statusDescription: `Heart rate ${hr.toFixed(1)} bpm, SV ${cardio.strokeVolume_mL.toFixed(1)} mL, CO ${cardio.cardiacOutput_Lmin.toFixed(2)} L/min.`,
      telemetry: {
        heartRate: { value: hr, unit: "bpm", label: "Heart Rate", tag: "[DATOS REALES]" },
        strokeVolume: { value: cardio.strokeVolume_mL, unit: "mL", label: "Stroke Volume", tag: "[SIMULADO]" },
        cardiacOutput: { value: cardio.cardiacOutput_Lmin, unit: "L/min", label: "Cardiac Output", tag: "[DERIVADO]" },
        meanArterialPressure: { value: cardio.meanArterialPressure_mmHg, unit: "mmHg", label: "MAP", tag: "[SIMULADO]" },
      },
    };

    // 2. BRAIN
    const icp = neuro.intracranialPressure_mmHg;
    const isHighICP = icp > 15.0;
    const brainStatus = isHighICP ? "mild_strain" : "adapted_nominal";

    map["brain"] = {
      colorHex: brainStatus === "mild_strain" ? 0xdf9477 : 0xb8a4d5,
      emissiveHex: brainStatus === "mild_strain" ? 0x7a2d10 : 0x000000,
      emissiveIntensity: brainStatus === "mild_strain" ? 0.28 : 0.0,
      pulsationFrequency_Hz: 0.2, // Low-frequency intracranial compliance pulsation
      pulsationAmplitude: 0.003, // Subtle craniospinal compliance pulsation ~0.3%
      volumeScale: 1.0 + 0.01 * Math.max(0, (icp - 10.0) / 10.0),
      classification: brainStatus,
      statusDescription: `Intracranial pressure ${icp.toFixed(1)} mmHg (upright 1G ~1.5 mmHg). Cephalad venous engorgement active.`,
      telemetry: {
        icp: { value: icp, unit: "mmHg", label: "Intracranial Pressure", tag: "[SIMULADO]" },
        cbf: { value: neuro.cerebralBloodFlow_cms, unit: "cm/s", label: "Cerebral Blood Flow", tag: "[ESTIMADO]" },
        vestibular: { value: neuro.vestibularAdaptation, unit: "ratio", label: "Vestibular Adaptation", tag: "[SIMULADO]" },
      },
    };

    // 3. EYES / OCULAR SYSTEM (SANS)
    const tlcpd = neuro.translaminarPressure_mmHg;
    const sansRisk = neuro.opticNerveSheathStrain > 1.08;
    const eyeStatus = sansRisk ? "mild_strain" : "adapted_nominal";

    const eyeAttrs: OrganVisualAttributes = {
      colorHex: eyeStatus === "mild_strain" ? 0xe28b62 : 0xd8dde4,
      emissiveHex: eyeStatus === "mild_strain" ? 0x8f3212 : 0x000000,
      emissiveIntensity: eyeStatus === "mild_strain" ? 0.25 : 0.0,
      pulsationFrequency_Hz: 0.0,
      pulsationAmplitude: 0.0,
      volumeScale: 1.0 + 0.02 * (neuro.opticNerveSheathStrain - 1.0),
      classification: eyeStatus,
      statusDescription: `Translaminar pressure difference (IOP - ICP) ${tlcpd.toFixed(1)} mmHg. Optic sheath strain ratio: ${neuro.opticNerveSheathStrain.toFixed(2)}.`,
      telemetry: {
        iop: { value: neuro.intraocularPressure_mmHg, unit: "mmHg", label: "Intraocular Pressure", tag: "[DATOS REALES]" },
        tlcpd: { value: tlcpd, unit: "mmHg", label: "Translaminar Pressure", tag: "[DERIVADO]" },
        opticSheathStrain: { value: neuro.opticNerveSheathStrain, unit: "strain", label: "Optic Nerve Strain", tag: "[SIMULADO]" },
      },
    };
    map["left eyeball"] = eyeAttrs;
    map["right eyeball"] = eyeAttrs;

    // 4. LUNGS
    const paCO2 = pulmonary.alveolarPCO2_mmHg;
    const isHypercapnia = paCO2 > 43.5;
    const lungStatus = isHypercapnia ? "mild_strain" : "adapted_nominal";

    const lungAttrs: OrganVisualAttributes = {
      colorHex: lungStatus === "mild_strain" ? 0xdba18d : 0xb5becb,
      emissiveHex: lungStatus === "mild_strain" ? 0x6e2b14 : 0x000000,
      emissiveIntensity: lungStatus === "mild_strain" ? 0.22 : 0.0,
      pulsationFrequency_Hz: pulmonary.respiratoryRate_bpm / 60.0,
      pulsationAmplitude: 0.012 * (pulmonary.tidalVolume_L / 0.52), // Subtle ~1.2% respiratory excursion
      volumeScale: 1.0,
      classification: lungStatus,
      statusDescription: `Respiratory rate ${pulmonary.respiratoryRate_bpm.toFixed(1)} bpm, Alveolar PCO2 ${paCO2.toFixed(1)} mmHg, SpO2 ${pulmonary.arterialSpO2_pct.toFixed(1)}%.`,
      telemetry: {
        respiratoryRate: { value: pulmonary.respiratoryRate_bpm, unit: "bpm", label: "Respiratory Rate", tag: "[SIMULADO]" },
        alveolarPCO2: { value: paCO2, unit: "mmHg", label: "Alveolar PCO2", tag: "[SIMULADO]" },
        alveolarPO2: { value: pulmonary.alveolarPO2_mmHg, unit: "mmHg", label: "Alveolar PO2", tag: "[DERIVADO]" },
        arterialSpO2: { value: pulmonary.arterialSpO2_pct, unit: "%", label: "Arterial SpO2", tag: "[DERIVADO]" },
      },
    };
    map["lung"] = lungAttrs;
    map["lungs"] = lungAttrs;
    map["left lung"] = lungAttrs;
    map["right lung"] = lungAttrs;

    // 5. LIVER & CORE METABOLISM
    const coreT = thermal.coreTemp_C;
    const isFever = coreT > 37.8;
    const liverStatus = isFever ? "mild_strain" : "adapted_nominal";

    map["liver"] = {
      colorHex: liverStatus === "mild_strain" ? 0xdc8668 : 0x9f796c,
      emissiveHex: liverStatus === "mild_strain" ? 0x8a2f11 : 0x000000,
      emissiveIntensity: liverStatus === "mild_strain" ? 0.30 : 0.0,
      pulsationFrequency_Hz: 0.0,
      pulsationAmplitude: 0.0,
      volumeScale: 1.0,
      classification: liverStatus,
      statusDescription: `Core temperature ${coreT.toFixed(2)} C. Metabolic heat: ${thermal.metabolicHeat_W.toFixed(0)} W. Microgravity convective dissipation impairment active.`,
      telemetry: {
        coreTemp: { value: coreT, unit: "C", label: "Core Body Temperature", tag: "[DATOS REALES]" },
        skinTemp: { value: thermal.skinTemp_C, unit: "C", label: "Skin Temperature", tag: "[ESTIMADO]" },
        heatProduction: { value: thermal.metabolicHeat_W, unit: "W", label: "Metabolic Heat", tag: "[DERIVADO]" },
      },
    };

    // 6. KIDNEYS & URINARY SYSTEM
    const diuresis = renal.urineOutput_mLh;
    const isDehydrated = renal.fluidBalance_mL < -1800.0;
    const kidneyStatus = isDehydrated ? "mild_strain" : "adapted_nominal";

    const kidneyAttrs: OrganVisualAttributes = {
      colorHex: kidneyStatus === "mild_strain" ? 0xd88c75 : 0x8c6b70,
      emissiveHex: kidneyStatus === "mild_strain" ? 0x7a2910 : 0x000000,
      emissiveIntensity: kidneyStatus === "mild_strain" ? 0.22 : 0.0,
      pulsationFrequency_Hz: 0.0,
      pulsationAmplitude: 0.0,
      volumeScale: 1.0,
      classification: kidneyStatus,
      statusDescription: `GFR ${renal.gfr_mLmin.toFixed(0)} mL/min, Urine rate ${diuresis.toFixed(1)} mL/h, Net fluid shift balance ${renal.fluidBalance_mL.toFixed(0)} mL.`,
      telemetry: {
        gfr: { value: renal.gfr_mLmin, unit: "mL/min", label: "GFR", tag: "[ESTIMADO]" },
        urineRate: { value: diuresis, unit: "mL/h", label: "Urine Output", tag: "[SIMULADO]" },
        fluidBalance: { value: renal.fluidBalance_mL, unit: "mL", label: "Fluid Balance", tag: "[SIMULADO]" },
        adhSuppression: { value: renal.adhSuppressionIndex, unit: "index", label: "ADH Suppression", tag: "[DERIVADO]" },
      },
    };
    map["kidney_left"] = kidneyAttrs;
    map["kidney_right"] = kidneyAttrs;
    map["left kidney"] = kidneyAttrs;
    map["right kidney"] = kidneyAttrs;
    map["urinary bladder"] = {
      ...kidneyAttrs,
      statusDescription: "Urinary bladder collecting central hypervolemic diuresis.",
    };

    // 7. MUSCULOSKELETAL & SPINE
    const bmdRatio = musculo.trabecularBMDRatio;
    const isBoneLoss = bmdRatio < 0.96;
    const musculoStatus = isBoneLoss ? "mild_strain" : "adapted_nominal";

    const spineAttrs: OrganVisualAttributes = {
      colorHex: musculoStatus === "mild_strain" ? 0xe28b62 : 0xc7cacf,
      emissiveHex: musculoStatus === "mild_strain" ? 0x7a2910 : 0x000000,
      emissiveIntensity: musculoStatus === "mild_strain" ? 0.20 : 0.0,
      pulsationFrequency_Hz: 0.0,
      pulsationAmplitude: 0.0,
      volumeScale: 1.0,
      classification: musculoStatus,
      statusDescription: `Trabecular BMD retention ${(bmdRatio * 100).toFixed(1)}%, Daily calcium efflux ${musculo.calciumEfflux_mgDay.toFixed(0)} mg/day.`,
      telemetry: {
        bmdRetention: { value: bmdRatio * 100.0, unit: "%", label: "Trabecular BMD", tag: "[SIMULADO]" },
        calciumEfflux: { value: musculo.calciumEfflux_mgDay, unit: "mg/day", label: "Calcium Efflux", tag: "[SIMULADO]" },
        muscleVolumeRatio: { value: musculo.muscleVolumeRatio * 100.0, unit: "%", label: "Muscle Volume", tag: "[SIMULADO]" },
      },
    };
    map["vertebral column"] = spineAttrs;
    map["spinal cord"] = spineAttrs;

    // 8. VASCULAR SYSTEM & JUGULAR
    const jvp = cardio.jugularVenousPressure_mmHg;
    const isVenousStasis = jvp > 8.0;
    const vascularStatus = isVenousStasis ? "mild_strain" : "adapted_nominal";

    const vascularAttrs: OrganVisualAttributes = {
      colorHex: vascularStatus === "mild_strain" ? 0xcc7269 : 0xa45b63,
      emissiveHex: vascularStatus === "mild_strain" ? 0x6e1b1b : 0x000000,
      emissiveIntensity: vascularStatus === "mild_strain" ? 0.25 : 0.0,
      pulsationFrequency_Hz: cardio.heartRate_bpm / 60.0,
      pulsationAmplitude: 0.004, // Subtle vascular pulse ~0.4%
      volumeScale: 1.0 + 0.03 * (jvp / 12.0), // Cephalad venous dilation
      classification: vascularStatus,
      statusDescription: `Internal jugular venous pressure ${jvp.toFixed(1)} mmHg. Venous engorgement index elevated in microgravity.`,
      telemetry: {
        jvp: { value: jvp, unit: "mmHg", label: "Jugular Venous Pressure", tag: "[SIMULADO]" },
        plasmaVolume: { value: cardio.plasmaVolumeFraction * 100.0, unit: "%", label: "Plasma Volume", tag: "[SIMULADO]" },
        thoracicShift: { value: cardio.thoracicFluidShift_mL, unit: "mL", label: "Thoracic Fluid Shift", tag: "[SIMULADO]" },
      },
    };
    map["aorta"] = vascularAttrs;
    map["blood vessels"] = vascularAttrs;
    map["left internal jugular vein"] = vascularAttrs;
    map["right internal jugular vein"] = vascularAttrs;

    // 9. UTERUS (Reproductive System) — Explicitly non-invented per scientific rule
    map["uterus"] = {
      colorHex: 0xb5becb,
      emissiveHex: 0x000000,
      emissiveIntensity: 0.0,
      pulsationFrequency_Hz: 0.0,
      pulsationAmplitude: 0.0,
      volumeScale: 1.0,
      classification: "reference",
      statusDescription: "Reference anatomical structure. Dynamic spaceflight endocrine ODE models are not published in open NASA HRP data; retained as geometric reference without synthetic extrapolation.",
      telemetry: {
        status: { value: 1.0, unit: "reference", label: "Anatomical Baseline", tag: "[DATOS REALES]" },
      },
    };

    return map;
  }
}
