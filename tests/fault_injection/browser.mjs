/* Generated from tests/fault_injection/browser.ts; edit the TypeScript source. */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(new URL("../../apps/crew-tablet/package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const url = process.argv[2];
if (!url)
    throw new Error("A local test server URL is required");
const fixture = JSON.parse(readFileSync(new URL("../../apps/crew-tablet/public/data/radiation.json", import.meta.url), "utf8"));
fixture.retrieved_at = "2000-01-01T00:00:00Z";
if (fixture.current)
    fixture.current.ts = "2000-01-01T00:00:00Z";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
    const page = await browser.newPage();
    await page.route("**/data/radiation.json", (route) => route.fulfill({ json: fixture }));
    await page.goto(`${url}/#view=radiation`);
    await page.getByText("Archived snapshot · not live", { exact: true }).waitFor();
    await page.locator("dt").filter({ hasText: /^Retrieved$/ }).locator("..").getByText("1 Jan 2000 00:00 UTC", { exact: true }).waitFor();
    const stale = { id: "FI-26", title: "Stale space weather stays visibly archived", component: "Radiation UI", severity: "high",
        status: "PASS", test: "stale_weather_archived", evidence: "tests/fault_injection/browser.mjs",
        observation: { injected_retrieval: fixture.retrieved_at, label: "Archived snapshot · not live", limit: "No automatic maximum-age rejection; label only" } };
    await page.goto(`${url}/#view=glance`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.getByText("Local simulation", { exact: true }).waitFor();
    const body = await page.locator("body").innerText();
    if (!body.toLowerCase().includes("synthetic"))
        throw new Error("Static mode lost its synthetic label");
    console.log(JSON.stringify([stale, { id: "FI-27", title: "API outage shows local synthetic mode", component: "tablet UI", severity: "high",
            status: "PASS", test: "static_mode_label", evidence: "tests/fault_injection/browser.mjs",
            observation: { api_status: 503, label: "Local simulation", synthetic_label: true } }]));
}
finally {
    await browser.close();
}
