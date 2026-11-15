import assert from "node:assert/strict";
import test from "node:test";
import { armAlignment } from "../src/lib/anatomyAlignment";

function skinAt(x: number): Float32Array {
  const points: number[] = [];
  for (let y = 0.44; y <= 0.801; y += 0.02) {
    for (let i = 0; i < 12; i++) points.push(i % 2 ? x : -x, y, 0);
  }
  return new Float32Array(points);
}

test("supplementary arm vessels follow the target silhouette symmetrically", () => {
  const align = armAlignment(skinAt(0.15), 1, skinAt(0.23), 1);
  assert(Math.abs(align(0.15, 0.6) - 0.23) < 0.002);
  assert(Math.abs(align(-0.15, 0.6) + 0.23) < 0.002);
});

test("alignment leaves the torso and legs anchored", () => {
  const align = armAlignment(skinAt(0.15), 1, skinAt(0.23), 1);
  assert.equal(align(0.05, 0.6), 0.05);
  assert.equal(align(0.15, 0.3), 0.15);
  assert.equal(align(-0.15, 0.9), -0.15);
});

test("missing skin samples do not move vessels", () => {
  const align = armAlignment(new Float32Array(), 1, skinAt(0.23), 1);
  assert.equal(align(0.15, 0.6), 0.15);
});
