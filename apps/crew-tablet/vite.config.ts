import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { googleAuthPlugin } from "./server/vite-auth";

const here = dirname(fileURLToPath(import.meta.url));
const protocolRunnerPath = resolve(here, "../../packages/protocol-runner/index.js");
const protocolStylesPath = resolve(here, "../../packages/protocol-runner/style.css");
const protocolsDir = resolve(here, "../../kb/protocols");
const thresholdsPath = resolve(here, "../../kb/thresholds.json");
const uiKitPath = resolve(here, "../../packages/ui-kit");

/**
 * A4 owns packages/protocol-runner and may land after this app.
 * Exposing it through a virtual module keeps `npm run build` green whether or
 * not the file exists, and lets Act feature-detect it at runtime.
 */
const VIRTUAL_ID = "virtual:lightminute-protocol-runner";
const RESOLVED_ID = "\0" + VIRTUAL_ID;
const PROTOCOLS_ID = "virtual:lightminute-protocols";
const RESOLVED_PROTOCOLS_ID = "\0" + PROTOCOLS_ID;
const PROTOCOL_CSS_ID = "virtual:lightminute-protocol-css";
const RESOLVED_PROTOCOL_CSS_ID = "\0" + PROTOCOL_CSS_ID;
const THRESHOLDS_ID = "virtual:lightminute-thresholds";
const RESOLVED_THRESHOLDS_ID = "\0" + THRESHOLDS_ID;

/**
 * The cited Earth rules live in A1's kb/thresholds.json, which is not served to
 * the app. Inline them so the Why chart can draw the Earth line without copying
 * numbers into the UI. Missing file -> empty map, never a build failure.
 */
function readThresholds(): Record<string, unknown> {
  try {
    const raw = JSON.parse(readFileSync(thresholdsPath, "utf8")) as unknown;
    if (!Array.isArray(raw)) return {};
    const out: Record<string, unknown> = {};
    for (const entry of raw) {
      if (entry && typeof entry === "object" && "indicator" in entry) {
        const indicator = (entry as { indicator?: unknown }).indicator;
        if (typeof indicator === "string") out[indicator] = entry;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Protocols are inlined so the runner works offline and from a static build. */
function readProtocols(): Record<string, unknown> {
  if (!existsSync(protocolsDir)) return {};
  const out: Record<string, unknown> = {};
  for (const file of readdirSync(protocolsDir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(readFileSync(join(protocolsDir, file), "utf8")) as {
        id?: string;
      };
      out[raw.id ?? file.replace(/\.json$/, "")] = raw;
    } catch {
      // A malformed protocol must never break the tablet build.
    }
  }
  return out;
}

function readProtocolStyles(): string {
  try {
    return readFileSync(protocolStylesPath, "utf8");
  } catch {
    return "";
  }
}

function protocolRunnerPlugin() {
  return {
    name: "lightminute-protocol-runner",
    resolveId(id: string) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      if (id === PROTOCOLS_ID) return RESOLVED_PROTOCOLS_ID;
      if (id === PROTOCOL_CSS_ID) return RESOLVED_PROTOCOL_CSS_ID;
      if (id === THRESHOLDS_ID) return RESOLVED_THRESHOLDS_ID;
      return null;
    },
    load(id: string) {
      if (id === RESOLVED_PROTOCOLS_ID) {
        return `export const protocols = ${JSON.stringify(readProtocols())};\n`;
      }
      if (id === RESOLVED_PROTOCOL_CSS_ID) {
        return `const css = ${JSON.stringify(readProtocolStyles())};\nexport default css;\n`;
      }
      if (id === RESOLVED_THRESHOLDS_ID) {
        return `export const thresholds = ${JSON.stringify(readThresholds())};\n`;
      }
      if (id !== RESOLVED_ID) return null;
      if (!existsSync(protocolRunnerPath)) {
        return "export const mountProtocolRunner = null;\nexport default null;\n";
      }
      return (
        'export * from "@protocol-runner";\n' +
        'import * as runner from "@protocol-runner";\n' +
        "export default runner;\n"
      );
    },
  };
}

// The engine API runs on :8000 (uvicorn). Proxying keeps the app same-origin in
// dev/preview; a static host simply 404s and the app falls back to public JSON.
const apiProxy = {
  "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
};

export default defineConfig({
  base: "./",
  plugins: [react(), protocolRunnerPlugin(), googleAuthPlugin(resolve(here, "../.."))],
  resolve: {
    alias: {
      "@ui-kit": uiKitPath,
      "@protocol-runner": protocolRunnerPath,
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [resolve(here, "../..")] },
    proxy: apiProxy,
  },
  preview: { port: 4173, proxy: apiProxy },
  build: { target: "es2022", outDir: "dist", sourcemap: false },
});
