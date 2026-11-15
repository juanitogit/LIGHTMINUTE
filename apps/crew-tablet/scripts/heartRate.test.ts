import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeHeartRate } from "../src/lib/heartRate";

test("Bluetooth heart-rate packets honor the width flag and reject truncation",()=>{
  assert.equal(decodeHeartRate(new DataView(Uint8Array.from([0,72]).buffer)),72);
  assert.equal(decodeHeartRate(new DataView(Uint8Array.from([1,44,1]).buffer)),300);
  assert.throws(()=>decodeHeartRate(new DataView(Uint8Array.from([1,44]).buffer)));
  assert.throws(()=>decodeHeartRate(new DataView(new ArrayBuffer(0))));
});
