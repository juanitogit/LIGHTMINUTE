import { test } from "node:test";
import assert from "node:assert/strict";
import { makeFhirExample } from "../src/lib/fhirExport";
import type { Reading } from "../src/lib/types";

test("synthetic FHIR example exports known vital signs without invented dates", () => {
  const make = (value:number, unit:string):Reading => ({value,unit,hrp_risk:"demo",hazard:"demo",lens:{earth:"normal",space:"no_rule",personal:"typical",pattern:"mixed"}});
  const result = makeFhirExample({rest_hr:make(68,"bpm"),temp_c:make(36.5,"°C"),sleep_h:make(8,"h")},"A",16);
  assert.equal(result.entry.length,2);
  assert.deepEqual(result.entry.map(x=>x.resource.code.coding[0].code),["8867-4","8310-5"]);
  assert.deepEqual(result.entry.map(x=>x.resource.valueQuantity.code),["/min","Cel"]);
  assert(result.entry.every(x=>!Object.hasOwn(x.resource,"effectiveDateTime")));
  assert.match(result.entry[0].resource.note[0].text,/Synthetic/);
  assert.equal(makeFhirExample({temp_c:make(98.6,"F")},"A",16).entry.length,0);
  assert.equal(makeFhirExample({temp_c:make(36.5,"C")},"A",16).entry[0]?.resource.valueQuantity.code,"Cel");
});
