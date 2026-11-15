import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {runInNewContext} from "node:vm";

test("the generated HyperFrames script registers its startup timeline", () => {
  const calls: string[] = [];
  const timeline = {
    to() { calls.push("to"); return this; },
    fromTo() { calls.push("fromTo"); return this; },
  };
  const window = {gsap:{timeline:() => timeline},__timelines:{} as Record<string,unknown>};
  const source = readFileSync(new URL("../media/hyperframes/startup.js", import.meta.url), "utf8");
  runInNewContext(source,{window});
  assert.equal(window.__timelines["lightminute-start"],timeline);
  assert.deepEqual(calls,["to","fromTo","to","to"]);
});
