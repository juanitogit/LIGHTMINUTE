import "./runner.js";

type Controller = {
  destroy(): void;
  next(): void;
  prev(): void;
  cannot(): void;
  undo(): void;
  restart(): unknown;
  setProtocol(protocol: unknown): void;
  getState(): unknown;
};
type RunnerApi = {
  mountProtocolRunner(host: HTMLElement, options?: {protocolId?: string; protocol?: unknown; protocolUrl?: string; onStep?: (event: unknown) => void; onDone?: (summary: unknown) => void}): Controller;
};
const runner = (globalThis as typeof globalThis & {TetherProtocolRunner: RunnerApi}).TetherProtocolRunner;
export const mountProtocolRunner = runner.mountProtocolRunner;
export default mountProtocolRunner;
