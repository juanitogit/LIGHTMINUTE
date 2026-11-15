import "./audit-core.js";
import type { AuditApi } from "./audit-types";

const audit = (globalThis as typeof globalThis & {LightminuteAudit: AuditApi}).LightminuteAudit;
export const {GENESIS, canonicalJson, sha256Hex, appendEntry, verifyChain, renderChainRows} = audit;
export default audit;
