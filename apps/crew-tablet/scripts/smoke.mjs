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

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(app, "../..");
// Prefer the repository virtualenv so the engine check runs without a global install.
const venvPython = resolve(repo, ".venv/Scripts/python.exe");
const python = process.env.PYTHON ?? (existsSync(venvPython) ? venvPython : "python");
const output = resolve(repo, "docs/qa");
const screenshots = resolve(repo, "docs/screenshots");
const missionDatabase=resolve(tmpdir(),`lightminute-e2e-${process.pid}.sqlite`);
await mkdir(output, { recursive: true });
await mkdir(screenshots, { recursive: true });
const results = [], errors = [];
let failure = null;
let apiOnline = false;
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (pathname.startsWith("/api/")) {
    if (!apiOnline) { res.writeHead(503).end(); return; }
    try {
      let body = ""; for await (const chunk of req) body += chunk;
      const upstream = await fetch(`http://127.0.0.1:18081${req.url}`, {method:req.method, headers:{"Content-Type":"application/json",...(req.headers.authorization?{Authorization:req.headers.authorization}:{})}, ...(body ? {body} : {})});
      res.writeHead(upstream.status, {"Content-Type":"application/json"}); res.end(await upstream.text());
    } catch { res.writeHead(503).end(); }
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
  if (!file.startsWith(dir + sep) || rel.split("/").some((p) => p.startsWith("."))) {res.writeHead(403).end();return;}
  try { const data = await readFile(file); res.writeHead(200, {"Content-Type":mime[extname(file)] ?? "application/octet-stream"}); res.end(data); }
  catch {res.writeHead(404).end();}
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
// Use the Chrome installed on this machine instead of downloading a browser.
const browser = await chromium.launch({channel:"chrome", headless:true});
let api;
const record = (name, detail = "passed") => {results.push({name, detail});console.log("PASS", name);};
const context = await browser.newContext({ viewport:{width:1440,height:1000}, reducedMotion:"reduce" });
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const goto = async (view = "glance", scenario = "cmo_fever", day = 16) => {
  await page.goto(`${base}/#scenario=${scenario}&crew=A&day=${day}&view=${view}`);
  await page.locator(".view h1").waitFor();
};
const capture = async (name) => {
  // Wait for layout and scroll restoration after same-document hash navigation.
  await page.evaluate(async () => {
    scrollTo(0,0);
    await document.fonts.ready;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  });
  await page.screenshot({path:resolve(screenshots, `${name}.png`),fullPage: name !== "07-mobile"});
};
try {
  await goto(); await page.locator(".signal-row").first().waitFor();
  assert.equal(await page.title(), "LIGHTMINUTE — crew tablet");
  assert.equal(await page.locator(".signal-row").count(), 6);
  assert.equal(await page.locator(".crew-row").count(), 4);
  assert.match(await page.locator(".statusbar").innerText(), /offline/);
  record("Static fallback, six indicators, four crew and LIGHTMINUTE branding");
  await expect(page.locator(".human-viewer")).toHaveAttribute("data-model-status","ready",{timeout:30000});
  assert.equal(await page.locator(".human-canvas").count(),1);
  const position = await page.locator(".human-landmark").first().getAttribute("style");
  await page.getByRole("button",{name:"Rotate model right",exact:true}).click();
  assert.notEqual(await page.locator(".human-landmark").first().getAttribute("style"),position);
  await page.getByRole("button",{name:"Front view",exact:true}).click();
  await page.getByRole("combobox",{name:"Reference body",exact:true}).selectOption("female");
  await expect(page.locator(".human-viewer")).toHaveAttribute("data-model-status","ready",{timeout:30000});
  await page.getByRole("combobox",{name:"Body systems",exact:true}).selectOption("blood");
  await expect(page.locator(".human-viewer")).toHaveAttribute("data-model-status","ready",{timeout:30000});
  const beforeZoom=await page.locator(".human-landmark").first().getAttribute("style");
  await page.getByRole("button",{name:"Zoom anatomy in",exact:true}).click();
  assert.notEqual(await page.locator(".human-landmark").first().getAttribute("style"),beforeZoom);
  await page.getByRole("combobox",{name:"Reference body",exact:true}).selectOption("male");
  await page.getByRole("combobox",{name:"Body systems",exact:true}).selectOption("all");
  await expect(page.locator(".human-viewer")).toHaveAttribute("data-model-status","ready",{timeout:30000});
  record("CC BY reference anatomy renders; male/female, systems, rotation, zoom and reset respond");
  await capture("01-overview");

  const noGpu = await browser.newContext();
  await noGpu.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type,...args) {
      if (String(type).startsWith("webgl")) return null;
      return original.call(this,type,...args);
    };
  });
  const noGpuPage = await noGpu.newPage();
  await noGpuPage.goto(`${base}/#scenario=cmo_fever&day=16`);
  await expect(noGpuPage.locator(".human-viewer")).toHaveAttribute("data-model-status","unavailable",{timeout:30000});
  assert.equal(await noGpuPage.locator(".signal-row").count(),6);
  assert.equal(await noGpuPage.locator(".bodymap").count(),0);
  await noGpu.close();
  record("No-WebGL devices retain all six readings and a clear 3D unavailable state");

  await page.getByRole("button", {name:"Resting heart rate: 68.5. Open personal baseline",exact:true}).click();
  await page.locator(".lenses").waitFor();
  assert.match(await page.locator(".why").innerText(), /68.5/);
  assert.match(await page.locator(".why").innerText(), /Hidden in range/i);
  record("Signal drilldown preserves the engine value and three-lens disagreement");
  await capture("02-personal-baseline");

  await page.getByRole("button", {name:"Actions",exact:true}).click();
  await page.locator(".checklist").waitFor();
  for (const box of await page.locator(".checklist input").all()) await box.check();
  assert.match(await page.locator(".act__steps").innerText(), /All steps checked/);
  await page.getByRole("button", {name:"Simulate send to ground",exact:true}).click();
  assert.equal(await page.getByRole("button", {name:"Sent (simulated)",exact:true}).isDisabled(), true);
  await page.locator(".act__side select").selectOption("fever_like_syndrome");
  await page.locator(".protocol-host .tr").waitFor();
  assert.equal(await page.locator(".protocol-host .tr__badge").evaluate(el=>getComputedStyle(el).borderRadius),"0px");
  assert.equal(await page.locator(".citations li").first().evaluate(el=>getComputedStyle(el).borderRadius),"0px");
  await capture("03-decision-card");
  const runner = page.locator(".protocol-host");
  assert.match(await runner.innerText(), /demo.wording/i);
  await runner.getByRole("button",{name:"Can't do this",exact:true}).click();
  await runner.getByRole("button",{name:"Skip this step",exact:true}).click();
  await runner.getByRole("button",{name:"Undo",exact:true}).click();
  for (let i=0;i<9;i++) await runner.getByRole("button",{name:i===8?"Done and finish":"Done",exact:true}).click();
  await expect(runner).toContainText("Run again");
  record("Action checklist, simulated send and cited protocol runner");
  await page.locator(".viewhead .crew-choice").filter({hasText:"B"}).click();
  assert.equal(await page.getByRole("button", {name:"Simulate send to ground",exact:true}).count(), 1);
  assert.equal(await page.locator(".act__side select").inputValue(), "");
  assert.equal(await page.locator(".checklist input:checked").count(), 0);
  record("Crew switch resets message simulation, protocol and checklist context");

  await goto("today");
  const note=page.getByRole("textbox",{name:"Demonstration check-in note",exact:true});
  await expect(page.getByRole("button",{name:"Save check-in",exact:true})).toBeDisabled();
  await note.fill("Synthetic integration check-in");
  await page.getByLabel("I confirm that this note",{exact:false}).check();
  await page.getByRole("button",{name:"Save check-in",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  await page.reload();
  await expect(note).toHaveValue("Synthetic integration check-in");
  await goto("today","cmo_fever",17);
  await expect(note).toHaveValue("");
  record("Local check-in persists across reload and stays scoped to mission day");
  await goto("trends");
  assert.equal(await page.locator("fieldset input:checked").count(),3);
  assert(await page.locator("fieldset input:disabled").count()>0);
  await goto("handbook");
  await page.getByRole("textbox").fill("What is my heart rate?");
  await page.getByRole("button",{name:"Ask",exact:true}).click();
  await expect(page.locator("main")).toContainText("68.5");
  await page.getByRole("textbox").fill("Tell me about unicorns");
  await page.getByRole("button",{name:"Ask",exact:true}).click();
  await expect(page.locator("main")).toContainText("Not available in the onboard record");
  await goto("signals");
  await page.getByRole("button",{name:"Hematocrit crew · Altered gravity No data",exact:true}).click();
  await expect(page.locator("main")).toContainText("No connected data source");
  record("Three-signal trend limit, grounded offline handbook and explicit missing signal sources");

  await goto("radiation"); await page.locator(".rad-chart").waitFor();
  assert.match(await page.locator("main").innerText(), /real-public/);
  assert.match(await page.locator("main").innerText(), /14 Nov 2026 14:38 UTC/);
  assert.equal(await page.locator(".rad-chart svg").count(), 1);
  assert.equal(await page.locator(".rad-chart__line").count(), 1);
  await capture("04-space-weather"); record("NOAA historical snapshot, real-public label, timestamp and flux plot");

  await goto("validation"); await page.locator("table.data-table").first().waitFor();
  assert.equal(await page.locator("table.data-table:has(th:text-is('False alarms')) tbody tr").count(), 8);
  await capture("05-evidence"); record("Both benchmark cohorts, all four methods and published calibration");

  for (const scenario of ["cmo_fever","sep_sleep_loss","co2_creep"]) {
    for (const day of [1,16,24]) {
      const doc = JSON.parse(await readFile(resolve(app, `public/data/scenario-${scenario}.json`),"utf8"));
      await goto("glance",scenario,day); await page.locator(".signal-row").first().waitFor();
      assert.equal(await page.locator(".signal-row").count(),doc.indicators.length);
      assert.equal(await page.locator(".crew-row").count(),Object.keys(doc.days.find(d=>d.day===day).crew).length);
    }
  }
  record("All three scenarios at start, day 16 and day 24");

  for (const width of [375,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    for (const view of ["glance","why","act","radiation","validation","checkin","today","trends","handbook","signals","earth"]) {
      await goto(view);
      await page.locator(view === "radiation" ? ".rad-chart" : view === "validation" ? "table.data-table" : view === "glance" ? ".signal-row" : view === "act" ? ".checklist" : view === "why" ? ".lenses" : ".view h1").first().waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1),`Horizontal overflow: ${width}px ${view}`);
      const framed = await page.locator("main .panel, main .tile, main .lens, .inline-label, .status-label").evaluateAll(elements=>elements.filter(el=>{
        const s=getComputedStyle(el);
        return parseFloat(s.borderRadius)>0 || (parseFloat(s.borderLeftWidth)>0 && parseFloat(s.borderRightWidth)>0 && parseFloat(s.borderTopWidth)>0 && parseFloat(s.borderBottomWidth)>0);
      }).map(el=>el.className));
      assert.deepEqual(framed,[],`Content frames or capsule labels: ${width}px ${view}`);
    }
  }
  await page.setViewportSize({width:375,height:812}); await goto();
  await page.locator(".signal-row").first().waitFor(); await capture("07-mobile");
  record("Ten views without page overflow at 375, 768, 1024 and 1440px");
  await page.setViewportSize({width:1440,height:1000});
  assert.equal(await page.locator("html").getAttribute("data-theme"),"light");
  await capture("08-light-theme");
  await page.getByRole("button", {name:"Switch to dark theme",exact:true}).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"),"dark");
  await capture("10-dark-theme");
  await page.reload(); await page.locator(".signal-row").first().waitFor();
  assert.equal(await page.locator("html").getAttribute("data-theme"),"dark");
  await page.getByRole("button", {name:"Switch to light theme",exact:true}).click();
  await page.getByRole("button", {name:"Present",exact:true}).click();
  assert.equal(await page.locator(".sidebar").isVisible(),false);
  await page.getByRole("button", {name:"Present",exact:true}).click();
  record("Light/dark persistence and presentation mode");

  await page.goto(`${base}/apps/ground-console/`);await page.locator("#crew-list .crew-card").first().waitFor();
  assert.equal(await page.locator("#crew-list .crew-card").count(),4);
  await page.locator("#day").fill("16");
  await capture("06-ground-console");
  await page.locator("#scenario").selectOption("co2_creep");
  await expect(page.locator("#source-line")).toContainText("co2_creep");
  await page.getByLabel("Behavioural free text",{exact:false}).uncheck();
  await page.getByRole("button",{name:"Tamper with entry 2",exact:true}).click();
  await page.getByRole("button",{name:"Re-verify",exact:true}).click();
  await expect(page.locator("#audit-status")).toContainText(/tamper|broken|invalid/i);
  record("Ground console, real scenario selection and private behavioural default");

  await page.goto(`file:///${resolve(repo,"apps/ground-console/index.html").replaceAll("\\","/")}`);
  await page.locator("#crew-list .crew-card").first().waitFor();
  assert.equal(await page.locator("#crew-list .crew-card").count(),4);
  await page.goto(`file:///${resolve(repo,"packages/protocol-runner/demo.html").replaceAll("\\","/")}`);
  await page.locator(".tr").waitFor();
  record("Double-click ground console and protocol demo using file://");

  if (process.env.LIGHTMINUTE_SKIP_API !== "1") {
  api = spawn(python,["-m","uvicorn","tether_engine.api.main:app","--host","127.0.0.1","--port","18081"],{cwd:repo,env:{...process.env,PYTHONPATH:resolve(repo,"services/engine"),LLM_PROVIDER:"none",LIGHTMINUTE_MISSION_DB:missionDatabase},windowsHide:true,stdio:"ignore"});
  for (let i=0;i<100;i++) {try {if((await fetch("http://127.0.0.1:18081/api/health")).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
  apiOnline = true;
  const onlineContext = await browser.newContext({viewport:{width:1440,height:1000}});
  const onlinePage = await onlineContext.newPage();
  await onlinePage.goto(`${base}/#scenario=cmo_fever&crew=A&day=16&view=act`);
  await onlinePage.locator(".checklist").waitFor();
  await onlinePage.getByText("Engine connected",{exact:true}).waitFor();
  assert.match(await onlinePage.locator(".statusbar").innerText(), /online/);
  assert.match(await onlinePage.locator(".act").innerText(), /protocol template/);
  await onlinePage.goto(`${base}/#scenario=cmo_fever&crew=A&day=16&view=earth`);
  await onlinePage.getByLabel("Demo PIN",{exact:true}).fill("2026");
  await onlinePage.getByRole("button",{name:"Start session",exact:true}).click();
  await onlinePage.getByLabel("Synthetic message to Earth",{exact:true}).fill("Synthetic E2E report");
  await onlinePage.getByRole("button",{name:"Queue report",exact:true}).click();
  await expect(onlinePage.locator("main")).toContainText("Synthetic E2E report");
  await onlinePage.getByText("Consented report",{exact:true}).click();
  const shared=await onlinePage.locator(".earth-link pre").innerText();
  assert.match(shared,/rest_hr/);
  assert.doesNotMatch(shared,/headache_score|sleep_h|pvt_ms|symptoms|behavioral/);
  await onlinePage.reload();
  await expect(onlinePage.locator("main")).toContainText("Synthetic E2E report");
  await onlinePage.getByRole("button",{name:"Sign out",exact:true}).click();
  await expect(onlinePage.getByRole("button",{name:"Start session",exact:true})).toBeVisible();
  record("Earth-link demo login, authenticated queue, persisted report and logout");
  await onlineContext.close();record("Production UI with real local API and LLM_PROVIDER=none");
  }
  assert.deepEqual(errors,[],"Uncaught browser errors");
} catch (error) {
  failure = {message:error.message,stack:error.stack};
  throw error;
} finally {
  await writeFile(resolve(output,"browser-results.json"),JSON.stringify({status:failure ? "failed" : "passed",executed_at:new Date().toISOString(),checks:results,uncaught_errors:errors,failure},null,2)+"\n");
  api?.kill();await browser.close();server.close();
  await rm(missionDatabase,{force:true,maxRetries:5,retryDelay:100});
}
console.log(`${results.length} browser integration groups passed. Screenshots: docs/screenshots/`);
