/* Generated from apps/crew-tablet/scripts/smoke.ts; edit the TypeScript source. */
/** Real-browser integration checks against the production build. No external services. */
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(app, "../..");
// Prefer the repository virtualenv so the engine check runs without a global install.
const venvPython = resolve(repo, ".venv/Scripts/python.exe");
const python = process.env.PYTHON ?? (existsSync(venvPython) ? venvPython : "python");
const output = resolve(repo, "docs/qa");
const screenshots = resolve(repo, "docs/screenshots");
const missionDatabase = resolve(tmpdir(), `lightminute-e2e-${process.pid}.sqlite`);
await mkdir(output, { recursive: true });
await mkdir(screenshots, { recursive: true });
const results = [], errors = [];
let failure = null;
let apiOnline = false;
let tamperStatic = false;
let runtimeRequests = 0;
const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".webm": "video/webm" };
const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    // Cloudflare Pages redirects /index.html to /; cached navigations must use /.
    if (pathname === "/index.html") {
        res.writeHead(308, { Location: "/" }).end();
        return;
    }
    if (pathname.startsWith("/assets/pyodide/"))
        runtimeRequests++;
    if (pathname.startsWith("/api/")) {
        if (!apiOnline) {
            res.writeHead(503).end();
            return;
        }
        try {
            let body = "";
            for await (const chunk of req)
                body += chunk;
            const upstream = await fetch(`http://127.0.0.1:18081${req.url}`, { method: req.method, headers: { "Content-Type": "application/json", ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) }, ...(body ? { body } : {}) });
            res.writeHead(upstream.status, { "Content-Type": "application/json" });
            res.end(await upstream.text());
        }
        catch {
            res.writeHead(503).end();
        }
        return;
    }
    const mappings = [
        ["/apps/ground-console/", resolve(repo, "apps/ground-console")],
        ["/apps/crew-tablet/public/", resolve(app, "public")],
        ["/packages/protocol-runner/", resolve(repo, "packages/protocol-runner")],
        ["/", resolve(app, "dist")],
    ];
    const [prefix, dir] = mappings.find(([prefix]) => pathname.startsWith(prefix));
    const rel = pathname.slice(prefix.length) || "index.html";
    const file = resolve(dir, rel.endsWith("/") ? `${rel}index.html` : rel);
    if (!file.startsWith(dir + sep) || rel.split("/").some((p) => p.startsWith("."))) {
        res.writeHead(403).end();
        return;
    }
    try {
        const data = await readFile(file);
        res.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream" });
        res.end(tamperStatic && (pathname === "/data/scenario-cmo_fever.json" || pathname === "/demo-data.json") ? Buffer.concat([data, Buffer.from(" ")]) : data);
    }
    catch {
        res.writeHead(404).end();
    }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
// Prefer the bundled Playwright build (CI installs it); fall back to the Chrome
// that is already on this machine so nothing has to be downloaded locally.
const launchBrowser = async () => {
    try {
        return await chromium.launch({ headless: true });
    }
    catch (error) {
        if (!/Executable doesn't exist/i.test(String(error)))
            throw error;
        return chromium.launch({ channel: "chrome", headless: true });
    }
};
const browser = await launchBrowser();
let api;
const record = (name, detail = "passed") => { results.push({ name, detail }); console.log("PASS", name); };
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
const page = await context.newPage();
if (process.env.LIGHTMINUTE_TEST_BROWSER_ENGINE === "1")
    await page.addInitScript(() => {
        const NativeWorker = window.Worker;
        window.Worker = class extends NativeWorker {
            constructor(url, options) { super(url, options); this.addEventListener("message", event => { if (event.data?.ok)
                window.__lightminuteEngineResult = event.data.data; }); }
        };
    });
page.on("pageerror", (e) => errors.push(e.message));
const goto = async (view = "glance", scenario = "cmo_fever", day = 16) => {
    await page.goto(`${base}/#scenario=${scenario}&crew=A&day=${day}&view=${view}`);
    await page.locator(".view h1").waitFor();
};
const capture = async (name) => {
    // Wait for layout and scroll restoration after same-document hash navigation.
    await page.evaluate(async () => {
        scrollTo(0, 0);
        await document.fonts.ready;
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    await page.screenshot({ path: resolve(screenshots, `${name}.png`), fullPage: name !== "07-mobile" });
};
try {
    const offlineContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    await offlineContext.addInitScript(() => {
        window.__engineProgress = [];
        const NativeWorker = window.Worker;
        window.Worker = class extends NativeWorker {
            constructor(url, options) {
                super(url, options);
                this.addEventListener("message", event => {
                    if (typeof event.data?.progress === "string")
                        window.__engineProgress.push(event.data.progress);
                });
            }
        };
    });
    const offlinePage = await offlineContext.newPage();
    await offlinePage.goto(`${base}/#scenario=cmo_fever&crew=A&day=16&view=glance`);
    await offlinePage.evaluate(async () => { await navigator.serviceWorker.ready; });
    await offlinePage.reload();
    await offlinePage.locator(".signal-row").first().waitFor();
    assert.equal(runtimeRequests, 0, "Pyodide must not download during first visit or service-worker installation");
    if (process.env.LIGHTMINUTE_TEST_BROWSER_ENGINE === "1") {
        await offlinePage.getByRole("button", { name: "Run engine on this device" }).click();
        await expect(offlinePage.getByRole("button", { name: "Run engine on this device" })).toBeEnabled({ timeout: 180000 });
        if (await offlinePage.locator(".engine-local-control [role=alert]").count())
            throw Error(await offlinePage.locator(".engine-local-control [role=alert]").innerText());
        assert((await offlinePage.evaluate(() => window.__engineProgress)).some(progress => /^Preparing Python: .* MiB/.test(progress)), "The engine worker must report download progress in MiB");
        assert(runtimeRequests > 0, "Pyodide download must start after the user requests the engine");
    }
    await offlineContext.setOffline(true);
    await offlinePage.reload();
    await expect(offlinePage.locator(".signal-row")).toHaveCount(6);
    await expect(offlinePage.locator(".statusbar")).toContainText(/offline/i);
    if (process.env.LIGHTMINUTE_TEST_BROWSER_ENGINE === "1") {
        await offlinePage.getByRole("button", { name: "Run engine on this device" }).click();
        await expect(offlinePage.getByRole("button", { name: "Run engine on this device" })).toBeEnabled({ timeout: 180000 });
        if (await offlinePage.locator(".engine-local-control [role=alert]").count())
            throw Error(await offlinePage.locator(".engine-local-control [role=alert]").innerText());
        await expect(offlinePage.locator(".statusbar")).toContainText("on-device Python engine", { timeout: 10000 });
        record("Python engine generates a synthetic scenario with the network disabled");
    }
    await offlineContext.close();
    record("Installed service worker loads cached synthetic scenario after network loss");
    const motionContext = await browser.newContext({ viewport: { width: 1024, height: 900 }, reducedMotion: "no-preference" });
    const motionPage = await motionContext.newPage();
    await motionPage.addInitScript(() => {
        const observer = new MutationObserver(() => {
            const splash = document.querySelector(".startup-motion");
            if (!splash)
                return;
            window.__startupPointerEvents = getComputedStyle(splash).pointerEvents;
            observer.disconnect();
        });
        observer.observe(document, { childList: true, subtree: true });
    });
    await motionPage.goto(`${base}/#scenario=cmo_fever&crew=A&day=16&view=glance`, { waitUntil: "domcontentloaded" });
    await motionPage.waitForFunction(() => window.__startupPointerEvents !== undefined);
    assert.equal(await motionPage.evaluate(() => window.__startupPointerEvents), "none");
    await expect(motionPage.locator(".startup-motion")).toHaveCount(0, { timeout: 8000 });
    const motionLine = motionPage.locator(".signal-spark .chart-continuous").first();
    await motionLine.waitFor();
    assert.equal(await motionLine.evaluate(el => getComputedStyle(el).animationName), "none");
    await motionLine.evaluate(el => el.setAttribute("data-persistent-line", "yes"));
    const oldPoints = await motionLine.getAttribute("points");
    assert.ok(oldPoints !== null);
    await motionPage.locator(".crew-row").nth(1).click();
    await expect(motionLine).not.toHaveAttribute("points", oldPoints);
    await expect(motionLine).toHaveAttribute("data-persistent-line", "yes");
    await motionPage.locator(".crew-row").first().click();
    await expect(motionLine).toHaveAttribute("points", oldPoints);
    await expect(motionLine).toHaveAttribute("data-persistent-line", "yes");
    await motionContext.close();
    record("Startup clears without blocking input and chart transitions preserve the line across rapid changes");
    const voiceContext = await browser.newContext();
    await voiceContext.addInitScript(() => {
        Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: class {
                onresult;
                onend;
                start() { this.onresult({ results: [[{ transcript: "Synthetic voice note" }]] }); this.onend(); }
                stop() { }
                abort() { }
            } });
    });
    const voicePage = await voiceContext.newPage();
    await voicePage.goto(`${base}/#scenario=cmo_fever&crew=A&day=16&view=today`);
    await voicePage.getByRole("button", { name: "Dictate note", exact: true }).click();
    await expect(voicePage.getByRole("textbox", { name: "Demonstration check-in note" })).toHaveValue("Synthetic voice note");
    await voiceContext.close();
    record("Voice-note control inserts a synthetic transcript with a mocked browser recognizer");
    const sensorContext = await browser.newContext();
    await sensorContext.addInitScript(() => {
        const characteristic = new EventTarget();
        characteristic.startNotifications = async () => { setTimeout(() => { characteristic.value = new DataView(Uint8Array.from([0, 72]).buffer); characteristic.dispatchEvent(new Event("characteristicvaluechanged")); }, 30); return characteristic; };
        characteristic.stopNotifications = async () => characteristic;
        const device = new EventTarget();
        device.name = "Mock sensor";
        device.gatt = { connected: true, connect: async () => ({ getPrimaryService: async () => ({ getCharacteristic: async () => characteristic }) }), disconnect: () => { device.gatt.connected = false; device.dispatchEvent(new Event("gattserverdisconnected")); } };
        Object.defineProperty(navigator, "bluetooth", { value: { requestDevice: async () => device }, configurable: true });
    });
    const sensorPage = await sensorContext.newPage();
    await sensorPage.goto(`${base}/#scenario=cmo_fever&crew=A&day=16&view=today`);
    await sensorPage.getByRole("button", { name: "Connect Bluetooth device" }).click();
    await expect(sensorPage.getByRole("status").filter({ hasText: "72 beats/min" })).toBeVisible();
    await sensorPage.getByRole("button", { name: "Disconnect device" }).click();
    await expect(sensorPage.getByRole("status").filter({ hasText: "Disconnected" })).toBeVisible();
    await sensorContext.close();
    record("Bluetooth mock connects, decodes a notification and disconnects");
    tamperStatic = true;
    const tamperContext = await browser.newContext({ serviceWorkers: "block" });
    const tamperPage = await tamperContext.newPage();
    await tamperPage.goto(`${base}/#scenario=cmo_fever&crew=A&day=16&view=glance`);
    await expect(tamperPage.getByText("Scenario signature invalid", { exact: false })).toBeVisible();
    assert.equal(await tamperPage.locator(".signal-row").count(), 0);
    await tamperContext.close();
    tamperStatic = false;
    record("Ed25519 verification rejects modified synthetic scenario bytes");
    const auditContext = await browser.newContext();
    const auditPage = await auditContext.newPage();
    await auditPage.goto(`${base}/verify-audit.html`);
    const pair = generateKeyPairSync("ed25519"), pub = pair.publicKey.export({ type: "spki", format: "der" });
    const auditPayload = Buffer.from('{"synthetic":true,"entries":[]}');
    const envelope = { algorithm: "Ed25519", publicKey: pub.toString("base64"), payload: auditPayload.toString("base64"), signature: sign(null, auditPayload, pair.privateKey).toString("base64") };
    await auditPage.locator("#file").setInputFiles({ name: "audit.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(envelope)) });
    await auditPage.locator("#fingerprint").fill(createHash("sha256").update(pub).digest("hex"));
    await auditPage.getByRole("button", { name: "Verify signature" }).click();
    await expect(auditPage.getByRole("status")).toContainText("Fingerprint matches");
    envelope.payload = Buffer.from('{"synthetic":true,"entries":[1]}').toString("base64");
    await auditPage.locator("#file").setInputFiles({ name: "audit-tampered.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(envelope)) });
    await auditPage.getByRole("button", { name: "Verify signature" }).click();
    await expect(auditPage.getByRole("status")).toContainText("Signature invalid");
    await auditContext.close();
    record("Audit signature verification detects tampering and checks an independently supplied key fingerprint");
    const sourcesContext = await browser.newContext({ serviceWorkers: "block" });
    const sourcesPage = await sourcesContext.newPage();
    const sourceErrors = [];
    sourcesPage.on("pageerror", error => sourceErrors.push(error.message));
    await sourcesPage.route("**/data/*.json", route => route.fulfill({ status: 404, body: "unavailable" }));
    await sourcesPage.goto(`${base}/#scenario=cmo_fever&crew=A&day=16&view=glance`);
    await sourcesPage.getByRole("button", { name: "Data sources", exact: true }).click();
    await expect(sourcesPage.getByRole("heading", { name: "Data sources", exact: true })).toBeVisible();
    await expect(sourcesPage.getByText(/Data are courtesy of the NASA Open Science Data Repository/)).toBeVisible();
    await expect(sourcesPage.getByRole("link", { name: /SpaceX Inspiration4 Blood Serum/ })).toHaveAttribute("href", "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575");
    assert.deepEqual(sourceErrors, []);
    await sourcesContext.close();
    record("Data sources and NASA OSDR acknowledgement work with snapshots and API unavailable");
    await goto();
    await page.locator(".signal-row").first().waitFor();
    assert.equal(await page.locator(".startup-motion").count(), 0, "Reduced motion must skip startup video");
    assert.equal(await page.locator(".signal-spark .chart-continuous").first().evaluate(el => getComputedStyle(el).animationName), "none");
    assert.equal(await page.getByText("MISSION LM-01").count(), 0);
    assert.equal(await page.title(), "LIGHTMINUTE — crew tablet");
    assert.equal(await page.locator(".signal-row").count(), 6);
    assert.equal(await page.locator(".crew-row").count(), 4);
    assert.equal(await page.getByRole("button", { name: /sign in with google/i }).count(), 0);
    assert.match(await page.locator(".statusbar").innerText(), /offline/);
    record("Static fallback, six indicators, four crew and LIGHTMINUTE branding");
    if (process.env.LIGHTMINUTE_TEST_BROWSER_ENGINE === "1") {
        await page.getByRole("button", { name: "Run engine on this device" }).click();
        await expect(page.getByRole("button", { name: "Run engine on this device" })).toBeEnabled({ timeout: 180000 });
        if (await page.locator(".engine-local-control [role=alert]").count())
            throw Error(await page.locator(".engine-local-control [role=alert]").innerText());
        await expect(page.locator(".statusbar")).toContainText("on-device Python engine", { timeout: 180000 });
        assert.equal(await page.locator(".signal-row").count(), 6);
        const actual = await page.evaluate(() => window.__lightminuteEngineResult);
        const expected = JSON.parse(await readFile(resolve(app, "public/data/scenario-cmo_fever.json"), "utf8"));
        for (let i = 0; i < expected.days.length; i++)
            for (const crew of Object.keys(expected.days[i].crew)) {
                const a = actual.days[i].crew[crew], b = expected.days[i].crew[crew];
                assert.equal(a.level, b.level, `Level day ${i + 1} crew ${crew}`);
                for (const key of Object.keys(b.indicators)) {
                    assert(a.indicators[key], `Missing ${key} day ${i + 1} crew ${crew}`);
                    for (const field of ["value", "baseline", "z"])
                        assert(Math.abs(a.indicators[key][field] - b.indicators[key][field]) < 0.011, `${field} ${key} day ${i + 1} crew ${crew}`);
                    for (const index of [0, 1])
                        assert(Math.abs(a.indicators[key].ci95[index] - b.indicators[key].ci95[index]) < 0.011, `ci95 ${key} day ${i + 1} crew ${crew}`);
                    assert(Math.abs(a.indicators[key].p - b.indicators[key].p) < 1e-6, `probability ${key} day ${i + 1} crew ${crew}`);
                    assert.deepEqual(a.indicators[key].lens, b.indicators[key].lens, `lens ${key} day ${i + 1} crew ${crew}`);
                    assert.equal(a.indicators[key].change_pending, b.indicators[key].change_pending, `pending ${key} day ${i + 1} crew ${crew}`);
                    assert.equal(a.indicators[key].unresolved_change, b.indicators[key].unresolved_change, `unresolved ${key} day ${i + 1} crew ${crew}`);
                }
            }
        record("Real Python engine generates a synthetic scenario in a browser worker");
    }
    await expect(page.locator(".human-viewer")).toHaveAttribute("data-model-status", "ready", { timeout: 30000 });
    assert.equal(await page.locator(".human-canvas").count(), 1);
    const fixture = JSON.parse(await readFile(resolve(app, "public/data/scenario-cmo_fever.json"), "utf8"));
    await expect(page.locator(".human-viewer")).toHaveAttribute("data-heart-bpm", String(fixture.days[15].crew.A.indicators.rest_hr.value));
    await page.locator(".crew-row").nth(1).click();
    await expect(page.locator(".human-viewer")).toHaveAttribute("data-heart-bpm", String(fixture.days[15].crew.B.indicators.rest_hr.value));
    await page.locator(".crew-row").first().click();
    await expect(page.locator(".human-viewer")).toHaveAttribute("data-heart-bpm", String(fixture.days[15].crew.A.indicators.rest_hr.value));
    await page.getByRole("slider", { name: /Mission day/ }).fill("17");
    await expect(page.locator(".human-viewer")).toHaveAttribute("data-heart-bpm", String(fixture.days[16].crew.A.indicators.rest_hr.value));
    await page.getByRole("slider", { name: /Mission day/ }).fill("16");
    await expect(page.locator(".human-viewer")).toHaveAttribute("data-heart-bpm", String(fixture.days[15].crew.A.indicators.rest_hr.value));
    const pinTop = await page.locator(".human-landmark").first().evaluate(el => parseFloat(el.style.top));
    assert(pinTop >= 0 && pinTop <= 100, "Body landmark must start inside the 3D viewport");
    record("Heart animation uses the selected crew's synthetic heart rate; anatomy landmarks stay in view");
    const position = await page.locator(".human-landmark").first().getAttribute("style");
    await page.getByRole("button", { name: "Rotate model right", exact: true }).click();
    assert.notEqual(await page.locator(".human-landmark").first().getAttribute("style"), position);
    await page.getByRole("button", { name: "Front view", exact: true }).click();
    await page.getByRole("combobox", { name: "Reference body", exact: true }).selectOption("female");
    await expect(page.locator(".human-viewer")).toHaveAttribute("data-model-status", "ready", { timeout: 30000 });
    await page.getByRole("combobox", { name: "Body systems", exact: true }).selectOption("blood");
    await expect(page.locator(".human-viewer")).toHaveAttribute("data-model-status", "ready", { timeout: 30000 });
    const beforeZoom = await page.locator(".human-landmark").first().getAttribute("style");
    await page.getByRole("button", { name: "Zoom anatomy in", exact: true }).click();
    assert.notEqual(await page.locator(".human-landmark").first().getAttribute("style"), beforeZoom);
    await page.getByRole("combobox", { name: "Reference body", exact: true }).selectOption("male");
    await page.getByRole("combobox", { name: "Body systems", exact: true }).selectOption("all");
    await expect(page.locator(".human-viewer")).toHaveAttribute("data-model-status", "ready", { timeout: 30000 });
    record("CC BY reference anatomy renders; male/female, systems, rotation, zoom and reset respond");
    const anatomyContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    const anatomyPage = await anatomyContext.newPage();
    const anatomyErrors = [];
    anatomyPage.on("pageerror", error => anatomyErrors.push(error.message));
    await anatomyPage.goto(`${base}/#scenario=cmo_fever&crew=A&day=16&view=glance`);
    await expect(anatomyPage.locator(".human-viewer")).toHaveAttribute("data-model-status", "ready", { timeout: 30000 });
    for (const build of ["male", "female"]) {
        await anatomyPage.getByRole("combobox", { name: "Reference body" }).selectOption(build);
        const canvas = anatomyPage.locator(".human-canvas");
        await expect(canvas).toHaveAttribute("data-supplemental-vessels", String(build === "female"));
        await expect(canvas).toHaveAttribute("data-supplemental-spine", String(build === "female"));
        await expect(canvas).toHaveAttribute("data-registered-lungs", String(build === "male"));
        const box = await canvas.boundingBox();
        assert(box, "Anatomy canvas must have dimensions");
        for (const y of [.28, .34, .4, .46, .52, .58, .64, .7]) {
            for (const x of [.45, .48, .5, .52, .55]) {
                await canvas.click({ position: { x: box.width * x, y: box.height * y }, force: true });
                if (await anatomyPage.locator(".organ-stats-panel").count())
                    break;
            }
            if (await anatomyPage.locator(".organ-stats-panel").count())
                break;
        }
        await expect(anatomyPage.locator(".organ-stats-panel")).toBeVisible();
        const nav = anatomyPage.getByRole("navigation", { name: "Quick select organ" });
        const model = anatomyPage.locator(".organ-hologram");
        for (const [label, organ, geometry, kind] of [
            ["Lungs", build === "male" ? "right lung" : "lungs", "lungs", "geometry"],
            ["Eyes", "left eyeball", "left eyeball", "illustration"],
            ["Vessels", "blood vessels", "blood vessels", "geometry"],
            ["Spine", "vertebral column", "vertebral column", "geometry"],
            ["Heart", "heart", "heart", "geometry"],
        ]) {
            await nav.getByRole("button", { name: label, exact: true }).click();
            await expect(model).toHaveAttribute("data-organ", organ);
            await expect(model).toHaveAttribute("data-geometry", geometry);
            await expect(model).toHaveAttribute("data-asset", kind);
        }
        const wire = anatomyPage.getByRole("button", { name: "Toggle wireframe mode" });
        await wire.click();
        await expect(wire).toHaveAttribute("aria-pressed", "true");
        await wire.click();
        await expect(wire).toHaveAttribute("aria-pressed", "false");
        if (build === "female") {
            await expect(anatomyPage.getByText(/peripheral vessels and spine include scaled male-source/)).toBeVisible();
            await nav.getByRole("button", { name: "Uterus", exact: true }).click();
            await expect(model).toHaveAttribute("data-asset", "glb", { timeout: 30000 });
            await expect(model.locator(".organ-hologram__loader")).toHaveCount(0, { timeout: 30000 });
            await expect(model).toHaveAttribute("data-asset", "glb");
            await expect(anatomyPage.getByText("Trajectory unavailable")).toBeVisible();
            await expect(anatomyPage.getByText("Vascular Compliance Ratio")).toHaveCount(0);
        }
        await anatomyPage.locator(".organ-stats-panel__close-btn").click();
    }
    assert.deepEqual(anatomyErrors, []);
    await anatomyContext.close();
    record("Both reference bodies select the right organs; female supplementary vessels and spine are disclosed");
    await page.getByRole("button", { name: "Front view", exact: true }).click();
    await page.waitForTimeout(700); // Allow the camera reset to finish before the reference capture.
    await capture("01-overview");
    const noGpu = await browser.newContext();
    await noGpu.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value: function (type, ...args) {
                if (String(type).startsWith("webgl"))
                    return null;
                return Reflect.apply(original, this, [type, ...args]);
            } });
    });
    const noGpuPage = await noGpu.newPage();
    await noGpuPage.goto(`${base}/#scenario=cmo_fever&day=16`);
    await expect(noGpuPage.locator(".human-viewer")).toHaveAttribute("data-model-status", "unavailable", { timeout: 30000 });
    assert.equal(await noGpuPage.locator(".signal-row").count(), 6);
    assert.equal(await noGpuPage.locator(".bodymap").count(), 0);
    await noGpu.close();
    record("No-WebGL devices retain all six readings and a clear 3D unavailable state");
    await page.getByRole("button", { name: "Resting heart rate: 68.5. Open personal baseline", exact: true }).click();
    await page.locator(".lenses").waitFor();
    assert.match(await page.locator(".why").innerText(), /68.5/);
    assert.match(await page.locator(".why").innerText(), /Hidden in range/i);
    record("Signal drilldown preserves the engine value and three-lens disagreement");
    await capture("02-personal-baseline");
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.locator(".checklist").waitFor();
    for (const box of await page.locator(".checklist input").all())
        await box.check();
    assert.match(await page.locator(".act__steps").innerText(), /All steps checked/);
    await page.getByRole("button", { name: "Simulate send to ground", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Sent (simulated)", exact: true }).isDisabled(), true);
    await page.locator(".act__side select").selectOption("fever_like_syndrome");
    await page.locator(".protocol-host .tr").waitFor();
    assert.equal(await page.locator(".protocol-host .tr__badge").evaluate(el => getComputedStyle(el).borderRadius), "0px");
    assert.equal(await page.locator(".citations li").first().evaluate(el => getComputedStyle(el).borderRadius), "0px");
    await capture("03-decision-card");
    const runner = page.locator(".protocol-host");
    assert.match(await runner.innerText(), /demo.wording/i);
    await runner.getByRole("button", { name: "Can't do this", exact: true }).click();
    await runner.getByRole("button", { name: "Skip this step", exact: true }).click();
    await runner.getByRole("button", { name: "Undo", exact: true }).click();
    for (let i = 0; i < 9; i++)
        await runner.getByRole("button", { name: i === 8 ? "Done and finish" : "Done", exact: true }).click();
    await expect(runner).toContainText("Run again");
    record("Action checklist, simulated send and cited protocol runner");
    await page.locator(".viewhead .crew-choice").filter({ hasText: "B" }).click();
    assert.equal(await page.getByRole("button", { name: "Simulate send to ground", exact: true }).count(), 1);
    assert.equal(await page.locator(".act__side select").inputValue(), "");
    assert.equal(await page.locator(".checklist input:checked").count(), 0);
    record("Crew switch resets message simulation, protocol and checklist context");
    await goto("today");
    const note = page.getByRole("textbox", { name: "Demonstration check-in note", exact: true });
    await expect(page.getByRole("button", { name: "Save check-in", exact: true })).toBeDisabled();
    await note.fill("Synthetic integration check-in");
    await page.getByLabel("I confirm that this note", { exact: false }).check();
    await page.getByRole("button", { name: "Save check-in", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved on this device" })).toBeVisible();
    await page.reload();
    await expect(note).toHaveValue("Synthetic integration check-in");
    await goto("today", "cmo_fever", 17);
    await expect(note).toHaveValue("");
    record("Local check-in persists across reload and stays scoped to mission day");
    await goto("trends");
    assert.equal(await page.locator("fieldset input:checked").count(), 3);
    assert(await page.locator("fieldset input:disabled").count() > 0);
    await goto("handbook");
    await page.getByRole("textbox").fill("What is my heart rate?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.locator("main")).toContainText("68.5");
    await page.getByRole("textbox").fill("Tell me about unicorns");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.locator("main")).toContainText("Not available in the onboard record");
    await goto("signals");
    await page.getByRole("button", { name: "Hematocrit crew · Altered gravity No data", exact: true }).click();
    await expect(page.locator("main")).toContainText("No connected data source");
    record("Three-signal trend limit, grounded offline handbook and explicit missing signal sources");
    await goto("radiation");
    await page.locator(".rad-chart").waitFor();
    assert.match(await page.locator("main").innerText(), /real-public/);
    assert.match(await page.locator("main").innerText(), /14 Nov 2026 14:38 UTC/);
    assert.equal(await page.locator(".rad-chart svg").count(), 1);
    assert.equal(await page.locator(".rad-chart__line").count(), 1);
    await page.locator(".donki-panel").waitFor();
    const donki = await page.locator(".donki-panel").innerText();
    assert.match(donki, /NASA DONKI/);
    assert.match(donki, /real-public/);
    assert.match(donki, /not individual dose/);
    await capture("04-space-weather");
    record("NOAA historical snapshot + NASA DONKI events, real-public labels, timestamps and flux plot");
    await goto("validation");
    await page.locator("table.data-table").first().waitFor();
    assert.equal(await page.locator("table.data-table:has(th:text-is('False alarms')) tbody tr").count(), 8);
    await capture("05-evidence");
    record("Both benchmark cohorts, all four methods and published calibration");
    for (const scenario of ["cmo_fever", "sep_sleep_loss", "co2_creep"]) {
        for (const day of [1, 16, 24]) {
            const doc = JSON.parse(await readFile(resolve(app, `public/data/scenario-${scenario}.json`), "utf8"));
            await goto("glance", scenario, day);
            await page.locator(".signal-row").first().waitFor();
            assert.equal(await page.locator(".signal-row").count(), doc.indicators.length);
            assert.equal(await page.locator(".crew-row").count(), Object.keys(doc.days.find((d) => d.day === day).crew).length);
        }
    }
    record("All three scenarios at start, day 16 and day 24");
    for (const width of [375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const view of ["glance", "why", "act", "radiation", "validation", "checkin", "today", "trends", "handbook", "signals", "earth"]) {
            await goto(view);
            await page.locator(view === "radiation" ? ".rad-chart" : view === "validation" ? "table.data-table" : view === "glance" ? ".signal-row" : view === "act" ? ".checklist" : view === "why" ? ".lenses" : ".view h1").first().waitFor();
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow: ${width}px ${view}`);
            const framed = await page.locator("main .panel, main .tile, main .lens, .inline-label, .status-label").evaluateAll(elements => elements.filter(el => {
                const s = getComputedStyle(el);
                return parseFloat(s.borderRadius) > 0 || (parseFloat(s.borderLeftWidth) > 0 && parseFloat(s.borderRightWidth) > 0 && parseFloat(s.borderTopWidth) > 0 && parseFloat(s.borderBottomWidth) > 0);
            }).map(el => el.className));
            assert.deepEqual(framed, [], `Content frames or capsule labels: ${width}px ${view}`);
        }
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await goto();
    await page.locator(".signal-row").first().waitFor();
    await capture("07-mobile");
    record("Ten views without page overflow at 375, 768, 1024 and 1440px");
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
    await capture("08-light-theme");
    await page.getByRole("button", { name: "Switch to dark theme", exact: true }).click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await capture("10-dark-theme");
    await page.reload();
    await page.locator(".signal-row").first().waitFor();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.getByRole("button", { name: "Switch to light theme", exact: true }).click();
    await page.getByRole("button", { name: "Present", exact: true }).click();
    assert.equal(await page.locator(".sidebar").isVisible(), false);
    await page.getByRole("button", { name: "Present", exact: true }).click();
    record("Light/dark persistence and presentation mode");
    await page.goto(`${base}/apps/ground-console/`);
    await page.locator("#crew-list .crew-card").first().waitFor();
    assert.equal(await page.locator("#crew-list .crew-card").count(), 4);
    await page.locator("#day").fill("16");
    await capture("06-ground-console");
    await page.locator("#scenario").selectOption("co2_creep");
    await expect(page.locator("#source-line")).toContainText("co2_creep");
    await page.getByLabel("Behavioural free text", { exact: false }).uncheck();
    await page.getByRole("button", { name: "Tamper with entry 2", exact: true }).click();
    await page.getByRole("button", { name: "Re-verify", exact: true }).click();
    await expect(page.locator("#audit-status")).toContainText(/tamper|broken|invalid/i);
    record("Ground console, real scenario selection and private behavioural default");
    await page.goto(`file:///${resolve(repo, "apps/ground-console/index.html").replaceAll("\\", "/")}`);
    await page.locator("#crew-list .crew-card").first().waitFor();
    assert.equal(await page.locator("#crew-list .crew-card").count(), 4);
    await page.goto(`file:///${resolve(repo, "packages/protocol-runner/demo.html").replaceAll("\\", "/")}`);
    await page.locator(".tr").waitFor();
    record("Double-click ground console and protocol demo using file://");
    if (process.env.LIGHTMINUTE_SKIP_API !== "1") {
        api = spawn(python, ["-m", "uvicorn", "tether_engine.api.main:app", "--host", "127.0.0.1", "--port", "18081"], { cwd: repo, env: { ...process.env, PYTHONPATH: resolve(repo, "services/engine"), LLM_PROVIDER: "none", LIGHTMINUTE_MISSION_DB: missionDatabase }, windowsHide: true, stdio: "ignore" });
        for (let i = 0; i < 100; i++) {
            try {
                if ((await fetch("http://127.0.0.1:18081/api/health")).ok)
                    break;
            }
            catch { }
            await new Promise(r => setTimeout(r, 100));
        }
        apiOnline = true;
        const onlineContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        const onlinePage = await onlineContext.newPage();
        await onlinePage.goto(`${base}/#scenario=cmo_fever&crew=A&day=16&view=act`);
        await onlinePage.locator(".checklist").waitFor();
        await onlinePage.getByText("Engine connected", { exact: true }).waitFor();
        assert.match(await onlinePage.locator(".statusbar").innerText(), /online/);
        await expect(onlinePage.locator(".act")).toContainText(/protocol template/, { timeout: 30000 });
        await onlinePage.goto(`${base}/#scenario=cmo_fever&crew=A&day=16&view=earth`);
        await onlinePage.getByLabel("Demo PIN", { exact: true }).fill("2026");
        await onlinePage.getByRole("button", { name: "Start session", exact: true }).click();
        await onlinePage.getByLabel("Synthetic message to Earth", { exact: true }).fill("Synthetic E2E report");
        await onlinePage.getByRole("button", { name: "Queue report", exact: true }).click();
        await expect(onlinePage.locator("main")).toContainText("Message text withheld: behavioral-text consent is off");
        await onlinePage.getByText("Consented report", { exact: true }).click();
        const shared = await onlinePage.locator(".earth-link pre").innerText();
        assert.match(shared, /rest_hr/);
        assert.doesNotMatch(shared, /headache_score|sleep_h|pvt_ms|symptoms|behavioral/);
        await onlinePage.reload();
        await expect(onlinePage.locator("main")).toContainText("Message text withheld: behavioral-text consent is off");
        await onlinePage.getByRole("button", { name: "Sign out", exact: true }).click();
        await expect(onlinePage.getByRole("button", { name: "Start session", exact: true })).toBeVisible();
        record("Earth-link demo login, authenticated queue, persisted report and logout");
        await onlineContext.close();
        record("Production UI with real local API and LLM_PROVIDER=none");
    }
    assert.deepEqual(errors, [], "Uncaught browser errors");
}
catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    failure = { message: cause.message, stack: cause.stack, url: page.url(), main: await page.locator("main").innerText().catch(() => "") };
    throw error;
}
finally {
    await writeFile(resolve(output, "browser-results.json"), JSON.stringify({ status: failure ? "failed" : "passed", executed_at: new Date().toISOString(), checks: results, uncaught_errors: errors, failure }, null, 2) + "\n");
    api?.kill();
    await browser.close();
    server.close();
    await rm(missionDatabase, { force: true, maxRetries: 5, retryDelay: 100 });
}
console.log(`${results.length} browser integration groups passed. Screenshots: docs/screenshots/`);
