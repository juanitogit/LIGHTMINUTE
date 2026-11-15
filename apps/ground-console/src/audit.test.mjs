/* Generated from apps/ground-console/src/audit.test.ts; edit the TypeScript source. */
/* Fixed-vector test for src/audit.js against the Python engine.
 *
 *   node apps/ground-console/src/audit.test.mjs
 *
 * The expected hashes were produced by services/engine/tether_engine/audit.py:
 *   AuditLog().append("protocol_step", {...}, ts=0) / ts=1000
 */
import { appendEntry, canonicalJson, GENESIS, verifyChain } from "./audit.js";
const VECTORS = [
    {
        idx: 0,
        ts: 0,
        event: "protocol_step",
        payload: { protocolId: "fever_like_syndrome", stepIndex: 0, status: "done" },
        prev: GENESIS,
        hash: "615730f9d59179b0a8199f3fde7abc215a3aea4148b937b97b2e3ae555c47549",
    },
    {
        idx: 1,
        ts: 1000,
        event: "protocol_step",
        payload: { protocolId: "fever_like_syndrome", stepIndex: 1, status: "cannot" },
        prev: "615730f9d59179b0a8199f3fde7abc215a3aea4148b937b97b2e3ae555c47549",
        hash: "9afc0f9a20b84efb222955e2f7b3dd36df290196e33883de9c714baec1018770",
    },
];
let failures = 0;
function check(name, condition, detail) {
    if (condition) {
        console.log("PASS", name);
    }
    else {
        failures += 1;
        console.log("FAIL", name, detail ?? "");
    }
}
function deepEqual(a, b) {
    return canonicalJson(a) === canonicalJson(b);
}
async function buildChain() {
    const chain = [];
    chain.push(await appendEntry([], VECTORS[0]));
    chain.push(await appendEntry(chain, VECTORS[1]));
    return chain;
}
const chain = await buildChain();
check("entry 0 matches the Python hash", chain[0].hash === VECTORS[0].hash && chain[0].prev === VECTORS[0].prev, chain[0].hash);
check("entry 1 matches the Python hash", chain[1].hash === VECTORS[1].hash && chain[1].prev === VECTORS[0].hash, chain[1].hash);
check("entries match the expected bodies", deepEqual(chain[0], VECTORS[0]) && deepEqual(chain[1], VECTORS[1]));
const intact = await verifyChain(chain);
check("intact chain verifies", intact.ok && intact.firstBadIndex === null, JSON.stringify(intact));
const tampered = chain.map((e) => ({ ...e, payload: { ...e.payload } }));
tampered[1].payload.status = "done";
const tamperResult = await verifyChain(tampered);
check("tampered payload is caught at index 1", tamperResult.ok === false && tamperResult.firstBadIndex === 1, JSON.stringify(tamperResult));
const relinked = chain.map((e) => ({ ...e }));
relinked[1].prev = GENESIS;
const relinkResult = await verifyChain(relinked);
check("broken link is caught at index 1", relinkResult.ok === false && relinkResult.firstBadIndex === 1 && relinkResult.reason === "broken link", JSON.stringify(relinkResult));
check("canonical JSON sorts keys and stays compact", canonicalJson({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } }) === '{"a":{"c":[3,{"y":2,"z":1}],"d":2},"b":1}', canonicalJson({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } }));
check("non-ascii is escaped like Python ensure_ascii", canonicalJson({ t: "café" }) === '{"t":"caf\\u00e9"}', canonicalJson({ t: "café" }));
console.log(failures === 0 ? "\naudit: all checks passed" : `\naudit: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
