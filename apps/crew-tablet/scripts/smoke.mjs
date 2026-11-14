#!/usr/bin/env node
/**
 * `npm run test:e2e` — smoke test for the built crew tablet.
 *
 * Serves `dist/` from a throwaway local server and checks the things the demo
 * actually depends on:
 *   1. the SPA shell and its hashed JS/CSS bundle are served and non-empty;
 *   2. the scenario index and every published scenario file parse and carry the
 *      decision-card contract the UI renders (level, headline, do_now);
 *   3. the radiation snapshot carries provenance (label, source, points, units);
 *   4. the validation report carries design, methods, calibration, missing-data,
 *      baseline and limitations sections;
 *   5. the built CSS still contains the Radiation and check-in styles.
 *
 * No dependencies, no browser: this is a contract + wiring check, not a visual
 * test. Run `npm run build` first (or let this script tell you to).
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const dist = join(appRoot, "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const LEVELS = new Set(["info", "watch", "act", "escalate"]);

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    const detail = fn();
    passed += 1;
    console.log(`  ok   ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.log(`  FAIL ${name} — ${message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function serve() {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname);
    let filePath = join(dist, normalize(requested).replace(/^([/\\])+/, ""));

    // Keep the server inside dist and fall back to the SPA shell for routes.
    if (!filePath.startsWith(dist + sep) && filePath !== dist) {
      response.writeHead(403).end("forbidden");
      return;
    }
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(dist, "index.html");
    }
    if (!existsSync(filePath)) {
      response.writeHead(404).end("not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
      Connection: "close",
    });
    createReadStream(filePath).pipe(response);
  });
  return new Promise((resolveServer) => {
    server.listen(0, "127.0.0.1", () => resolveServer(server));
  });
}

async function get(base, path) {
  const response = await fetch(`${base}${path}`);
  const body = await response.text();
  return { status: response.status, type: response.headers.get("content-type") ?? "", body };
}

async function getJson(base, path) {
  const result = await get(base, path);
  assert(result.status === 200, `HTTP ${result.status} for ${path}`);
  try {
    return JSON.parse(result.body);
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }
}

async function main() {
  if (!existsSync(join(dist, "index.html"))) {
    console.error(
      "dist/index.html not found. Run `npm run build` in apps/crew-tablet before `npm run test:e2e`.",
    );
    process.exit(1);
  }

  const server = await serve();
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  console.log(`crew-tablet smoke · ${base} · dist=${dist}`);

  try {
    console.log("\nshell");
    const index = await get(base, "/");
    check("index.html is served", () => {
      assert(index.status === 200, `HTTP ${index.status}`);
      assert(index.type.includes("text/html"), `unexpected type ${index.type}`);
      assert(index.body.includes('id="root"'), "missing #root mount point");
      return `${index.body.length} bytes`;
    });

    const scriptMatch = /<script[^>]+src="([^"]+\.js)"/.exec(index.body);
    const styleMatch = /<link[^>]+href="([^"]+\.css)"/.exec(index.body);
    check("bundle is referenced", () => {
      assert(scriptMatch, "no module script in index.html");
      assert(styleMatch, "no stylesheet link in index.html");
      return `${scriptMatch[1]} · ${styleMatch[1]}`;
    });

    if (scriptMatch) {
      const bundle = await get(base, scriptMatch[1].replace(/^\./, ""));
      check("JS bundle is served", () => {
        assert(bundle.status === 200, `HTTP ${bundle.status}`);
        assert(bundle.body.length > 1000, `suspiciously small (${bundle.body.length} bytes)`);
        return `${(bundle.body.length / 1024).toFixed(0)} kB`;
      });
    }

    if (styleMatch) {
      const css = await get(base, styleMatch[1].replace(/^\./, ""));
      check("CSS is served with the new panels", () => {
        assert(css.status === 200, `HTTP ${css.status}`);
        assert(css.body.includes(".sstrip"), "radiation S-scale styles missing from build");
        assert(css.body.includes(".pvt"), "PVT styles missing from build");
        assert(css.body.includes(".checkin"), "check-in styles missing from build");
        return `${(css.body.length / 1024).toFixed(0)} kB`;
      });
    }

    console.log("\nscenario data");
    const indexDoc = await getJson(base, "/data/scenario-index.json");
    const scenarios = Array.isArray(indexDoc) ? indexDoc : indexDoc.scenarios;
    check("scenario index lists scenarios", () => {
      assert(Array.isArray(scenarios) && scenarios.length > 0, "no scenarios in index");
      return scenarios.map((item) => item.name).join(", ");
    });

    const available = scenarios.filter((item) => item && item.name && item.available !== false);
    for (const scenario of available) {
      const doc = await getJson(base, `/data/scenario-${encodeURIComponent(scenario.name)}.json`);
      check(`scenario ${scenario.name} matches the card contract`, () => {
        assert(Array.isArray(doc.days) && doc.days.length > 0, "no days");
        const day = doc.days[0];
        assert(day.crew && Object.keys(day.crew).length > 0, "no crew");
        const member = day.crew[Object.keys(day.crew)[0]];
        const card = member?.card;
        assert(card && typeof card.headline === "string", "card.headline missing");
        assert(LEVELS.has(card.level), `unknown level ${card.level}`);
        assert(Array.isArray(card.do_now) && card.do_now.length > 0, "card.do_now empty");
        assert(member.routing && typeof member.routing.send_now === "boolean", "routing missing");
        return `${doc.days.length} days · level ${card.level}`;
      });
    }

    console.log("\nradiation");
    const radiation = await getJson(base, "/data/radiation.json");
    check("radiation snapshot carries provenance and points", () => {
      assert(typeof radiation.label === "string", "label missing");
      assert(typeof radiation.source === "string", "source missing");
      assert(typeof radiation.source_url === "string", "source_url missing");
      assert(typeof radiation.retrieved_at === "string", "retrieved_at missing");
      assert(typeof radiation.units === "string", "units missing");
      assert(Array.isArray(radiation.points) && radiation.points.length > 0, "points empty");
      const point = radiation.points[0];
      assert(typeof point.ts === "string" && typeof point.flux === "number", "bad point shape");
      assert(radiation.current && typeof radiation.current.flux === "number", "current missing");
      assert(radiation.thresholds_pfu && radiation.thresholds_pfu.S1 > 0, "thresholds missing");
      assert(typeof radiation.note === "string", "note missing");
      return `${radiation.label} · ${radiation.points.length} points · ${radiation.channel}`;
    });

    check("radiation samples satisfy the pfu / >=10 MeV contract", () => {
      assert(/pfu/i.test(radiation.units ?? ""), "units are not pfu");
      assert(/10\s*MeV/i.test(radiation.channel ?? ""), `unexpected channel ${radiation.channel}`);
      const badFlux = radiation.points.filter((p) => typeof p.flux !== "number" || !(p.flux >= 0));
      assert(badFlux.length === 0, `${badFlux.length} samples with negative or non-numeric flux`);
      const badTs = radiation.points.filter((p) => Number.isNaN(Date.parse(p.ts)));
      assert(badTs.length === 0, `${badTs.length} samples with an unparseable timestamp`);
      const withS = radiation.points.filter((p) => typeof p.s_scale === "number").length;
      // A missing s_scale is allowed; inventing S0 for it is a UI bug, not data.
      assert(withS <= radiation.points.length, "s_scale count exceeds sample count");
      return `${withS}/${radiation.points.length} samples carry s_scale`;
    });

    console.log("\nvalidation");
    const validation = await getJson(base, "/data/validation.json");
    check("validation report has every section the page renders", () => {
      assert(validation.design && typeof validation.design === "object", "design missing");
      assert(
        typeof validation.design.false_alarm_budget_per_crew_week === "number",
        "false-alarm budget missing",
      );
      assert(Array.isArray(validation.scenarios) && validation.scenarios.length > 0, "no scenarios");
      const methods = validation.scenarios[0].methods;
      assert(Array.isArray(methods) && methods.length >= 2, "no methods to compare");
      const method = methods[0];
      assert(typeof method.id === "string" && typeof method.fa_per_week === "number", "bad method");
      assert(typeof method.recall?.moderate === "number", "method recall missing");
      assert(validation.calibration && typeof validation.calibration.overall_coverage === "number", "calibration missing");
      assert(Array.isArray(validation.missing_data) && validation.missing_data.length > 0, "missing_data empty");
      assert(Array.isArray(validation.baseline_length) && validation.baseline_length.length > 0, "baseline_length empty");
      assert(Array.isArray(validation.limitations) && validation.limitations.length > 0, "limitations empty");
      return `${validation.scenarios.length} scenarios · ${methods.length} methods`;
    });

    check("validation numbers stay inside their bounds", () => {
      const numbers = [];
      for (const scenario of validation.scenarios) {
        for (const method of scenario.methods) {
          numbers.push(method.recall.mild, method.recall.moderate, method.recall.strong);
        }
      }
      numbers.push(validation.calibration.overall_coverage);
      for (const value of numbers) {
        assert(typeof value === "number" && value >= 0 && value <= 1, `out-of-range rate ${value}`);
      }
      return `${numbers.length} rates in [0,1]`;
    });
  } finally {
    // Undici keeps sockets alive; without this, close() hangs and Node aborts
    // with a libuv assertion on Windows.
    server.closeAllConnections?.();
    await new Promise((done) => server.close(done));
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log("smoke: PASS");
}

main().catch((error) => {
  console.error(`smoke crashed: ${error instanceof Error ? error.stack : String(error)}`);
  process.exit(1);
});
