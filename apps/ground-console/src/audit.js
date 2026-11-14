/* ES module entry point for src/audit-core.js (Node tests, bundlers, http).
 * The core is a classic script so file:// pages can load it without CORS. */
import "./audit-core.js";

const audit = globalThis.TetherAudit;

export const GENESIS = audit.GENESIS;
export const { canonicalJson, sha256Hex, appendEntry, verifyChain, renderChainRows } = audit;
export default audit;
