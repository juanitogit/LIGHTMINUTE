import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
function earlyThemePlugin() {
  return {
    name: "lightminute-early-theme",
    transformIndexHtml(html: string) {
      const marker = "<!-- LIGHTMINUTE_EARLY_THEME -->";
      if (!html.includes(marker)) throw new Error("Missing early-theme placeholder");
      const source = readFileSync(resolve(here, "src/earlyTheme.ts"), "utf8");
      const js = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.None}}).outputText;
      return html.replace(marker, `<script>${js.replace(/<\/script/gi, "<\\/script")}</script>`);
    },
  };
}
const runtimeDir = resolve(here, "node_modules/pyodide");
const runtimeNames = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "pyodide-lock.json", "python_stdlib.zip"];
const lock = JSON.parse(readFileSync(join(runtimeDir, "pyodide-lock.json"), "utf8")) as {packages:Record<string,{file_name:string;sha256:string}>};
const engineAssets = [...runtimeNames.map(name => ({name, path:join(runtimeDir, name)})), ...["numpy", "scipy"].map(name => {
  const pkg = lock.packages[name];
  if (!pkg) throw new Error(`Missing Pyodide package metadata: ${name}`);
  return {name:pkg.file_name, path:resolve(here, "public/assets/pyodide", pkg.file_name)};
})].map(({name,path}) => {
  const bytes = readFileSync(path);
  return {name, size:bytes.byteLength, sha256:createHash("sha256").update(bytes).digest("hex")};
});
const engineVersion = createHash("sha256").update(JSON.stringify(engineAssets)).digest("hex").slice(0,16);
const engineManifest = {cache:`lightminute-engine-${engineVersion}`, files:engineAssets, total:engineAssets.reduce((sum, file) => sum + file.size, 0)};

function offlineBundle() {
  return {
    name: "lightminute-offline-bundle",
    apply: "build" as const,
    closeBundle() {
      const root = resolve(here, "dist");
      const runtime = runtimeDir;
      const target = join(root, "assets/pyodide");
      mkdirSync(target, {recursive:true});
      const packageLock = JSON.parse(readFileSync(join(runtime,"pyodide-lock.json"),"utf8")) as {packages:Record<string,{file_name:string;sha256:string}>};
      for (const name of ["numpy","scipy"]) {
        const pkg=packageLock.packages[name];
        if(!pkg)throw new Error(`Missing Pyodide package metadata: ${name}`);
        const wheel=join(target,pkg.file_name);
        if(!existsSync(wheel) || createHash("sha256").update(readFileSync(wheel)).digest("hex")!==pkg.sha256) throw new Error(`Missing or invalid Pyodide wheel: ${name}`);
      }
      for (const name of ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "pyodide-lock.json", "python_stdlib.zip"]) {
        copyFileSync(join(runtime,name),join(target,name));
      }
      const files: string[] = [];
      function walk(dir: string, prefix = "") {
        for (const entry of readdirSync(dir, {withFileTypes: true})) {
          const name = prefix + entry.name;
          if (entry.isDirectory()) walk(join(dir, entry.name), name + "/");
          else if (entry.isFile() && name !== "sw.js") files.push(name);
        }
      }
      walk(root); files.sort();
      for (const file of files) {
        if (statSync(join(root, file)).size > 25 * 1024 * 1024) throw new Error(`Cloudflare Pages asset exceeds 25 MiB: ${file}`);
      }
      const digest = createHash("sha256");
      digest.update("navigation-root-v2");
      for (const file of files) { digest.update(file); digest.update(readFileSync(join(root, file))); }
      const version = digest.digest("hex").slice(0, 16);
      const serviceWorker = `const CACHE=${JSON.stringify("lightminute-static-" + version)};
const ENGINE_CACHE=${JSON.stringify(engineManifest.cache)};
const ASSETS=${JSON.stringify(files.filter(file => !file.startsWith("assets/pyodide/") && !/\.(glb|bin)$/i.test(file)).map(file => file === "index.html" ? "./" : "./" + file))};
// Large scientific packages and 3D models are downloaded only when requested.
self.addEventListener("install", event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  let next = 0;
  await Promise.all(Array.from({length: 3}, async () => {
    while (next < ASSETS.length) await cache.add(ASSETS[next++]);
  }));
})()));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith("lightminute-static-") && key !== CACHE) || (key.startsWith("lightminute-engine-") && key !== ENGINE_CACHE)).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match("./"))));
  } else {
    event.respondWith(caches.match(request, {ignoreSearch: true}).then(async hit => {
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok && /\\.(glb|bin)$/i.test(url.pathname)) {
        const cache = await caches.open(CACHE);
        event.waitUntil(cache.put(request, response.clone()));
      }
      return response;
    }));
  }
});\n`;
      writeFileSync(join(root, "sw.js"), serviceWorker);
    },
  };
}
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
  define: {__LIGHTMINUTE_ENGINE_MANIFEST__: JSON.stringify(engineManifest)},
  plugins: [earlyThemePlugin(), react(), protocolRunnerPlugin(), offlineBundle()],
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
  worker: {format:"es"},
  build: { target: "es2022", outDir: "dist", sourcemap: false },
});
