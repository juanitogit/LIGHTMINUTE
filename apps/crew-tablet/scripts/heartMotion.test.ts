import { test } from "node:test";
import assert from "node:assert/strict";
import { heartScale, scenarioHeartRate } from "../src/lib/heartMotion";
import type { Reading } from "../src/lib/types";

test("heart contracts once per beat at the selected reading's rate", () => {
  const reading = {value: 75, unit:"bpm"} as Reading;
  const bpm = scenarioHeartRate(reading);
  assert.equal(bpm, 75);
  const beatSeconds = 60 / 75;
  assert(heartScale("heart", bpm, 0.1 * beatSeconds, false) < 0.97);
  assert(Math.abs(heartScale("heart", bpm, 0.1 * beatSeconds, false) - heartScale("heart", bpm, 1.1 * beatSeconds, false)) < 1e-10);
  assert.notEqual(heartScale("heart", 60, 0.1, false), heartScale("heart", 120, 0.1, false));
});

test("vessels, missing readings, and reduced motion never pulse", () => {
  assert.equal(heartScale("aorta", 75, 0.08, false), 1);
  assert.equal(heartScale("blood vessels", 75, 0.08, false), 1);
  assert.equal(heartScale("heart", null, 0.08, false), 1);
  assert.equal(heartScale("heart", 75, 0.08, true), 1);
  assert.equal(scenarioHeartRate(undefined), null);
  assert.equal(scenarioHeartRate({value: NaN, unit:"bpm"} as Reading), null);
  assert.equal(scenarioHeartRate({value: 75, unit:"Hz"} as Reading), null);
});
