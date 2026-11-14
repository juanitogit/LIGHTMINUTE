/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute API origin. Empty means same-origin (Vite proxy in dev). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "virtual:tether-protocols" {
  interface ProtocolDoc {
    id?: string;
    title?: string;
    steps?: unknown[];
  }

  export const protocols: Record<string, ProtocolDoc>;
}

declare module "virtual:tether-protocol-css" {
  const css: string;
  export default css;
}

declare module "virtual:tether-protocol-runner" {
  type MountFn = (
    el: HTMLElement,
    opts: { protocolId: string; onStep?: (step: unknown) => void; onDone?: () => void },
  ) => void;

  export const mountProtocolRunner: MountFn | null;
  const runner: { mountProtocolRunner?: MountFn } | null;
  export default runner;
}
