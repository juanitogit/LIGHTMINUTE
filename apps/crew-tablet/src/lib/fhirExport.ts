import type { Reading } from "./types";

// HL7 FHIR R4 vital signs: https://hl7.org/fhir/R4/observation-vitalsigns.html
const CODES: Record<string, {code:string; display:string; unit:string; ucum:string}> = {
  rest_hr: {code:"8867-4", display:"Heart rate", unit:"beats/minute", ucum:"/min"},
  temp_c: {code:"8310-5", display:"Body temperature", unit:"°C", ucum:"Cel"},
};

/** Synthetic example; no acquisition date is fabricated and no conformance is asserted. */
export function makeFhirExample(readings: Record<string, Reading>, crew: string, day: number) {
  const entry = Object.entries(CODES).flatMap(([key, definition]) => {
    const reading = readings[key];
    if (!reading || !Number.isFinite(reading.value)) return [];
    const accepted = key === "rest_hr" ? ["bpm", "/min"] : ["C", "°C", "Cel"];
    if (!accepted.includes(reading.unit)) return [];
    return [{resource: {
      resourceType:"Observation", status:"final",
      category:[{coding:[{system:"http://terminology.hl7.org/CodeSystem/observation-category",code:"vital-signs"}]}],
      code:{coding:[{system:"http://loinc.org",code:definition.code,display:definition.display}]},
      subject:{display:`Synthetic crew ${crew}`},
      valueQuantity:{value:reading.value,unit:definition.unit,system:"http://unitsofmeasure.org",code:definition.ucum},
      note:[{text:`Synthetic demonstration, mission day ${day}; acquisition date is not available.`}],
    }}];
  });
  return {resourceType:"Bundle",type:"collection",entry};
}

export function downloadFhirExample(readings: Record<string, Reading>, crew: string, day: number) {
  const data = JSON.stringify(makeFhirExample(readings,crew,day), null, 2);
  const url = URL.createObjectURL(new Blob([data], {type:"application/fhir+json"}));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `lightminute-synthetic-crew-${crew}-day-${day}.fhir.json`;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
