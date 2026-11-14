/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute API origin. Empty means same-origin (Vite proxy in dev). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "virtual:lightminute-protocols" {
  interface ProtocolDoc {
    id?: string;
    title?: string;
    trigger_patterns?: string[];
    steps?: unknown[];
  }

  export const protocols: Record<string, ProtocolDoc>;
}

declare module "virtual:lightminute-thresholds" {
  interface EarthRule {
    low?: number | null;
    high?: number | null;
    status?: string;
    source?: string;
  }

  interface ThresholdEntry {
    indicator: string;
    unit?: string;
    hrp_risk?: string;
    hazard?: string;
    earth?: EarthRule | null;
    space?: EarthRule | null;
    note?: string;
  }

  export const thresholds: Record<string, ThresholdEntry>;
}

declare module "virtual:lightminute-protocol-css" {
  const css: string;
  export default css;
}

declare module "virtual:lightminute-protocol-runner" {
  type MountFn = (
    el: HTMLElement,
    opts: { protocolId: string; onStep?: (step: unknown) => void; onDone?: () => void },
  ) => void;

  export const mountProtocolRunner: MountFn | null;
  const runner: { mountProtocolRunner?: MountFn } | null;
  export default runner;
}
