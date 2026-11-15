#!/usr/bin/env node
/* Generated from apps/crew-tablet/tests/e2e.ts; edit the TypeScript source. */
/**
 * Browser E2E for the crew tablet: `npm run test:e2e:browser`.
 *
 * Runs against the built `dist/` with the Chrome installed on this machine
 * (`channel: "chrome"`), so nothing is downloaded. Covers the five product
 * views plus the local check-in, the identity rejection for a wrong scenario,
 * a complete PVT-B run, check-in persistence across a reload and a mobile
 * viewport, and writes the final screenshots to `screenshots/`.
 *
 * Only the static build is exercised: the engine API is intentionally absent,
 * which is the documented offline path (static JSON + template cards).
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const appRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const dist = join(appRoot, "dist");
const shots = join(appRoot, "screenshots");
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
};
function serve() {
    const server = createServer((request, response) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        const requested = decodeURIComponent(url.pathname);
        let filePath = join(dist, normalize(requested).replace(/^([/\\])+/, ""));
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
    return new Promise((done) => server.listen(0, "127.0.0.1", () => done(server)));
}
let passed = 0;
const failures = [];
async function test(name, fn) {
    try {
        await fn();
        passed += 1;
        console.log(`  ok   ${name}`);
    }
    catch (error) {
        failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
        console.log(`  FAIL ${name} — ${error instanceof Error ? error.message : error}`);
    }
}
function assert(condition, message = "Assertion failed") {
    if (!condition)
        throw new Error(message);
}
/** Bundled Chromium when installed, otherwise the Chrome already on the machine. */
async function launchBrowser() {
    try {
        return await chromium.launch({ headless: true });
    }
    catch (error) {
        if (!/Executable doesn't exist/i.test(String(error)))
            throw error;
        return chromium.launch({ channel: "chrome", headless: true });
    }
}
/** Sticky chrome would swallow a click when the element lands at the top. */
async function tap(page, selector) {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: "visible", timeout: 8000 });
    await locator.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(120);
    await locator.click();
}
async function open(page, hash) {
    await page.goto(`${page.__base}/#${hash}`, { waitUntil: "load" });
    await page.waitForSelector("#main .view", { timeout: 15000 });
    await page.waitForTimeout(350);
}
const heading = (page) => page.locator("#main h1").first().innerText();
async function main() {
    if (!existsSync(join(dist, "index.html"))) {
        console.error("dist/index.html missing. Run `npm run build` first.");
        process.exit(1);
    }
    mkdirSync(shots, { recursive: true });
    const server = await serve();
    const base = `http://127.0.0.1:${server.address().port}`;
    console.log(`crew-tablet browser e2e · ${base}`);
    const browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.__base = base;
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("console", (message) => {
        if (message.type() === "error" && !message.text().includes("500")) {
            pageErrors.push(message.text());
        }
    });
    try {
        console.log("\nviews");
        await test("Glance renders a scenario with crew levels", async () => {
            await open(page, "scenario=cmo_fever&view=glance");
            const title = await heading(page);
            assert(title.length > 3, `unexpected heading "${title}"`);
            const signals = await page.locator(".signal-row").count();
            assert(signals >= 1, "no signal row rendered");
            await page.screenshot({ path: join(shots, "final-glance.png") });
        });
        await test("Why shows the indicator chart and lenses", async () => {
            await tap(page, '.views__btn:has-text("Why")');
            await page.waitForTimeout(400);
            const title = await heading(page);
            assert(title.length > 3, "Why heading missing");
            assert((await page.locator("#main svg").count()) >= 1, "no chart svg in Why");
            const body = await page.locator("#main").innerText();
            assert(/lens|earth|pattern/i.test(body), "lens verdicts missing");
            await page.screenshot({ path: join(shots, "final-why.png") });
        });
        await test("Act shows a decision card with do-now actions", async () => {
            await tap(page, '.views__btn:has-text("Act")');
            await page.waitForTimeout(400);
            const title = await heading(page);
            assert(title.length > 3, "Act headline missing");
            const body = await page.locator("#main").innerText();
            assert(/do now/i.test(body), "do-now block missing");
            await page.screenshot({ path: join(shots, "final-act.png") });
        });
        await test("Radiation plots every sample on a time axis with provenance", async () => {
            await tap(page, '.views__btn:has-text("Space weather")');
            await page.waitForSelector(".rad-chart__line", { timeout: 8000 });
            const points = await page
                .locator(".rad-chart__line")
                .getAttribute("points")
                .then((value) => (value ?? "").trim().split(/\s+/).filter(Boolean).length);
            assert(points === 286, `expected 286 plotted samples, got ${points}`);
            const body = await page.locator("#main").innerText();
            assert(body.includes("real-public"), "label chip missing");
            assert(/Provenance/i.test(body), "provenance panel missing");
            assert(/>=10 MeV/.test(body), "channel not shown");
            assert(/pfu/.test(body), "units not shown");
            assert(!/SYNTHETIC NOAA/i.test(body), "notice still implies the NOAA data is synthetic");
            assert(/SYNTHETIC CREW/i.test(body), "notice does not say the crew data is synthetic");
            // Timestamp-proportional axis: irregular spacing must survive as-is.
            const xs = await page
                .locator(".rad-chart__line")
                .getAttribute("points")
                .then((value) => (value ?? "").trim().split(/\s+/).slice(0, 60).map((pair) => Number(pair.split(",")[0])));
            const deltas = new Set(xs.slice(1).map((x, i) => Math.round((x - xs[i]) * 10) / 10));
            assert(deltas.size > 1, "x positions are index-even: the axis is not timestamp based");
            await page.screenshot({ path: join(shots, "final-radiation.png") });
        });
        await test("Validation shows methods, calibration and missing data", async () => {
            await tap(page, '.views__btn:has-text("Validation")');
            await page.waitForSelector("#missing-title", { timeout: 8000 });
            const body = await page.locator("#main").innerText();
            assert(/Missi/i.test(body), "missing-data section absent");
            assert(/calibration/i.test(body), "calibration section absent");
            assert(/baseline/i.test(body), "baseline section absent");
            assert(/False alarms/i.test(body), "false-alarm column absent");
            // faPerWeek must be a rate with its unit, never a percentage.
            const rateCells = await page
                .locator("table:has(th:text-is('False alarms')) tbody tr td:nth-child(2)")
                .allInnerTexts();
            assert(rateCells.length > 0, "no false-alarm cells");
            for (const cell of rateCells) {
                assert(/crew-week/.test(cell), `rate cell without unit: "${cell}"`);
                assert(!cell.includes("%"), `rate rendered as a percentage: "${cell}"`);
            }
            const missingRows = await page
                .locator("#missing-title")
                .locator("xpath=ancestor::section")
                .locator("table tbody tr")
                .count();
            assert(missingRows >= 4, `expected missing-data rows, got ${missingRows}`);
            await page.screenshot({ path: join(shots, "final-validation.png") });
        });
        await test("a contradictory or malformed radiation snapshot is not trusted", async () => {
            const fixture = {
                synthetic: false,
                label: "synthetic",
                source: "synthetic fixture (not NOAA)",
                source_url: "https://example.invalid/fixture.json",
                retrieved_at: "2026-11-14T00:00:00Z",
                channel: ">=10 MeV",
                units: "pfu (test fixture)",
                points: [
                    { ts: "2026-11-14T00:00:00Z", flux: 0.5 },
                    { ts: "2026-11-14T00:05:00Z", flux: -1 },
                    { ts: "not-a-date", flux: 0.6 },
                    { ts: "2026-11-14T00:20:00Z", flux: 0.2, s_scale: 0 },
                ],
                current: { ts: "2026-11-14T00:20:00Z", flux: 0.2 },
                s_scale_max: 0,
                thresholds_pfu: { S1: 10, S2: 100, S3: 1000, S4: 10000, S5: 100000 },
                why: "fixture",
                note: "fixture",
            };
            const fixtureContext = await browser.newContext({ viewport: { width: 1180, height: 900 } });
            const fixturePage = await fixtureContext.newPage();
            fixturePage.__base = base;
            await fixturePage.route("**/data/radiation.json", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) }));
            await open(fixturePage, "scenario=cmo_fever&view=radiation");
            await fixturePage.waitForSelector(".rad-chart__line", { timeout: 8000 });
            const plotted = await fixturePage
                .locator(".rad-chart__line")
                .getAttribute("points")
                .then((value) => (value ?? "").trim().split(/\s+/).filter(Boolean).length);
            assert(plotted === 2, `negative flux or bad timestamp was plotted (${plotted} points)`);
            const body = await fixturePage.locator("#main").innerText();
            assert(/label conflict/i.test(body), "contradictory label was not flagged");
            assert(/unverified/.test(body), "contradiction was not downgraded to unverified");
            assert(/unknown/.test(body), "missing s_scale was rendered as a known level");
            assert(/286/.test(body) === false, "fixture still reports the published sample count");
            await fixturePage.screenshot({ path: join(shots, "final-radiation-unverified.png") });
            await fixtureContext.close();
        });
        console.log("\nidentity");
        await test("a missing scenario is rejected instead of falling back to cmo_fever", async () => {
            await open(page, "scenario=does_not_exist&view=glance");
            await page.waitForSelector("#load-error", { timeout: 15000 });
            const body = await page.locator("#main").innerText();
            assert(/could not load|No data source reachable/i.test(body), "no error state");
            assert(!/Crew medical officer: fever-like syndrome/i.test(body), "cmo_fever content rendered for a different scenario");
            await page.screenshot({ path: join(shots, "final-wrong-scenario.png") });
        });
        console.log("\nlocal tools");
        await test("CO2 cannot render a substituted CMO payload or an identity-free payload", async () => {
            for (const kind of ["wrong", "missing", "conflict"]) {
                const isolated = await browser.newContext();
                const probe = await isolated.newPage();
                probe.__base = base;
                const response = await fetch(`${base}/data/scenario-cmo_fever.json`);
                const substituted = await response.json();
                if (kind === "missing") {
                    delete substituted.scenario;
                    delete substituted.name;
                }
                if (kind === "conflict") {
                    substituted.scenario = "co2_creep";
                    substituted.name = "cmo_fever";
                }
                await probe.route("**/data/scenario-co2_creep.json", (route) => route.fulfill({ json: substituted }));
                await open(probe, "scenario=co2_creep&view=glance");
                try {
                    await probe.locator("#load-error").waitFor({ timeout: 8000 });
                }
                catch {
                    const shown = (await probe.locator("#main").innerText()).slice(0, 240).replace(/\s+/g, " ");
                    throw new Error(`${kind}: no error panel, page shows "${shown}"`);
                }
                assert(!/Crew medical officer: fever-like syndrome/.test(await probe.locator("#main").innerText()));
                await isolated.close();
            }
        });
        await test("missing optional radiation and validation files have honest empty states", async () => {
            // This test mocks network responses; a previously installed service worker
            // can serve cached snapshots before Playwright's routes see the request.
            const isolated = await browser.newContext({ serviceWorkers: "block" });
            const probe = await isolated.newPage();
            probe.__base = base;
            await probe.route("**/data/radiation.json", (route) => route.fulfill({ json: {} }));
            await probe.route("**/data/validation.json", (route) => route.fulfill({ json: {} }));
            await open(probe, "scenario=cmo_fever&view=radiation");
            await probe.getByText("No radiation data available", { exact: true }).waitFor();
            await open(probe, "scenario=cmo_fever&view=validation");
            await probe.getByText("Benchmark results not published yet", { exact: true }).waitFor();
            await isolated.close();
        });
        await test("PVT-B completes ten trials and stores the run", async () => {
            await open(page, "scenario=cmo_fever&view=checkin");
            assert(/check-in/i.test(await heading(page)), `wrong view: "${await heading(page)}"`);
            await page.waitForSelector("#pvt-title", { timeout: 8000 });
            await tap(page, 'button:has-text("Start PVT-B")');
            for (let trial = 1; trial <= 10; trial += 1) {
                await page.waitForSelector(".pvt__target", { timeout: 9000 });
                await page.locator(".pvt__target").click();
                await page.waitForFunction((expected) => {
                    const label = document.querySelector(".panel__aside .mono")?.textContent ?? "";
                    return Number(label.split("/")[0]) >= expected;
                }, trial, { timeout: 9000 });
            }
            await page.waitForSelector(".pvt--done", { timeout: 8000 });
            const body = await page.locator("#main").innerText();
            assert(/Median RT/i.test(body), "result tiles missing");
            assert(/False starts/i.test(body), "false-start tile missing");
            const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("tether-pvt-history") ?? "[]"));
            assert(stored.length === 1, `expected 1 stored run, got ${stored.length}`);
            assert(stored[0].trials === 10, `stored run has ${stored[0].trials} trials`);
        });
        await test("a check-in survives a reload and stays local", async () => {
            await page.locator('textarea').fill("Demo note: bad sleep after comms pass.");
            await tap(page, 'button:has-text("Save check-in")');
            await page.waitForSelector("table:has(td:text-is('Demo note: bad sleep after comms pass.'))", {
                timeout: 8000,
            });
            const requests = [];
            page.on("request", (request) => {
                if (request.method() !== "GET")
                    requests.push(`${request.method()} ${request.url()}`);
            });
            await page.reload({ waitUntil: "load" });
            await page.waitForSelector("#main .view", { timeout: 15000 });
            await page.waitForTimeout(500);
            const body = await page.locator("#main").innerText();
            assert(/Demo note: bad sleep after comms pass\./.test(body), "check-in lost after reload");
            assert(requests.length === 0, `check-in posted data: ${requests.join(", ")}`);
            const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("tether-checkin") ?? "[]"));
            assert(stored.length === 1, `expected 1 stored check-in, got ${stored.length}`);
            await page.screenshot({ path: join(shots, "final-checkin.png") });
        });
        await test("personal baseline PDF exports as a readable report", async () => {
            await open(page, "scenario=cmo_fever&crew=A&day=16&ind=rest_hr&view=why");
            const [download] = await Promise.all([
                page.waitForEvent("download"),
                tap(page, 'button:has-text("Export Baseline PDF")'),
            ]);
            const file = await download.path();
            assert(Boolean(file), "download has no local path");
            const bytes = readFileSync(file);
            assert(bytes.subarray(0, 5).toString("ascii") === "%PDF-", "file is not a PDF");
            assert(bytes.length > 40_000, `PDF is unexpectedly small (${bytes.length} bytes)`);
            assert(/Personal_Baseline_Report_CrewA_Day16_rest_hr\.pdf$/.test(download.suggestedFilename()), `unexpected filename ${download.suggestedFilename()}`);
        });
        console.log("\nmobile");
        await test("the tablet layout holds at 390px without horizontal overflow", async () => {
            const mobile = await browser.newContext({
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true,
                deviceScaleFactor: 2,
            });
            const small = await mobile.newPage();
            small.__base = base;
            for (const hash of ["scenario=cmo_fever&view=glance", "scenario=cmo_fever&view=checkin"]) {
                await open(small, hash);
                const overflow = await small.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
                assert(overflow <= 1, `${hash} overflows horizontally by ${overflow}px`);
            }
            await small.screenshot({ path: join(shots, "final-mobile-checkin.png") });
            await mobile.close();
        });
        await test("no page errors were raised", async () => {
            assert(pageErrors.length === 0, pageErrors.join(" | "));
        });
        console.log("\nshots");
        console.log(`  ${shots}`);
    }
    finally {
        await browser.close();
        server.closeAllConnections?.();
        await new Promise((done) => server.close(done));
    }
    console.log(`\n${passed} passed, ${failures.length} failed`);
    if (failures.length > 0) {
        for (const failure of failures)
            console.error(`- ${failure}`);
        process.exitCode = 1;
        return;
    }
    console.log("browser e2e: PASS");
}
main().catch((error) => {
    console.error(`browser e2e crashed: ${error instanceof Error ? error.stack : String(error)}`);
    process.exit(1);
});
