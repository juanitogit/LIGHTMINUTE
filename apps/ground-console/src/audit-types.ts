/** Types shared by the static ground-console audit implementation. */
export interface AuditBody {
  idx: number;
  ts: number;
  event: string;
  payload: unknown;
}

export interface AuditEntry extends AuditBody {
  prev: string;
  hash: string;
}

export interface AuditApi {
  GENESIS: string;
  canonicalJson(value: unknown): string;
  sha256Hex(text: string): Promise<string>;
  appendEntry(entries: readonly AuditEntry[], input: {event: unknown; payload?: unknown; ts?: number | null}): Promise<AuditEntry>;
  verifyChain(entries: readonly AuditEntry[]): Promise<{ok: boolean; firstBadIndex: number | null; reason: string | null}>;
  renderChainRows(tbody: HTMLTableSectionElement, entries: readonly AuditEntry[], badIndex: number | null): void;
}
