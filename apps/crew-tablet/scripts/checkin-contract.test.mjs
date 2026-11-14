/** Browser regression checks; run against Vite with PLAYWRIGHT_MODULE pointing
 * to an installed Playwright module (or install it separately). No real data. */
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  const url = `${process.env.TETHER_TEST_URL ?? "http://127.0.0.1:5173/"}#view=checkin`;
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.setItem("tether-checkin", "[null,{},42]");
    localStorage.setItem("tether-pvt-history", "[null,{},42]");
  });
  await page.reload();
  await page.getByText("No check-ins on this device yet.").waitFor();
  assert.deepEqual(errors, [], "malformed persisted records must not crash");
  console.log("PASS malformed local records ignored");

  const sleep = page.getByLabel("Sleep last night (hours)");
  await sleep.fill("-10");
  await page.getByRole("button", { name: "Save check-in", exact: true }).click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("tether-checkin")).length), 3);
  await page.getByText(/Use valid demo values/).waitFor();
  await sleep.fill("7.5");
  await page.getByRole("button", { name: "Save check-in", exact: true }).click();
  await page.getByText("Saved on this device.").waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("tether-checkin")).length), 1);
  console.log("PASS invalid sleep rejected; valid synthetic check-in saved");

  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "tether-checkin") throw new Error("simulated storage refusal");
      return write.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Clear local log", exact: true }).click();
  await page.getByText(/The log was not cleared/).waitFor();
  assert.equal(await page.locator("caption", { hasText: "1 local check-ins" }).count(), 1);
  console.log("PASS failed clear preserves displayed and persisted entries");

  await page.reload();
  await page.getByRole("button", { name: "Start PVT-B", exact: true }).waitFor();
  await page.evaluate(() => {
    // Shorten only stimulus delays; real keyboard input and React state remain.
    const original = window.setTimeout;
    window.setTimeout = function (callback, delay, ...args) {
      return original(callback, delay >= 1500 && delay <= 4000 ? 120 : delay, ...args);
    };
  });
  await page.getByRole("button", { name: "Start PVT-B", exact: true }).click();
  await page.getByLabel("Note (optional, 280 characters)").focus();
  await page.keyboard.press("Space");
  assert.equal(await page.getByLabel("Note (optional, 280 characters)").inputValue(), " ");
  await page.getByRole("group", { name: /PVT response area/ }).focus();
  for (let i = 0; i < 10; i += 1) {
    await page.locator(".pvt--stimulus").waitFor();
    await page.keyboard.press("Space");
  }
  await page.getByText("Run complete.").waitFor();
  const run = await page.evaluate(() => JSON.parse(localStorage.getItem("tether-pvt-history"))[0]);
  assert.equal(run.trials, 10);
  assert.equal(run.falseStarts, 0, "typing in the note must not count as a response");
  assert(Number.isFinite(run.medianMs));
  assert.deepEqual(errors, []);
  console.log("PASS ten keyboard trials, editable-input guard and saved PVT result");
  await page.getByRole("button", { name: "Run again", exact: true }).click();
  for (let i = 0; i < 10; i += 1) {
    await page.locator(".pvt--stimulus").waitFor();
    await page.locator(".pvt__target").click();
  }
  await page.getByText("Run complete.").waitFor();
  const pointerRun = await page.evaluate(() => JSON.parse(localStorage.getItem("tether-pvt-history"))[0]);
  assert.equal(pointerRun.trials, 10);
  assert.equal(pointerRun.falseStarts, 0, "one stimulus click must not count twice");
  console.log("PASS pointer trials are not double counted");
} finally {
  await browser.close();
}
