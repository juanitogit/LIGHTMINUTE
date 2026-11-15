import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
const port = await new Promise<number>((done, reject) => { const s = createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const address = s.address(); if (!address || typeof address === 'string') return reject(new Error('No port')); s.close(() => done(address.port)); }); });
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {stdio: 'ignore'});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  for (let n = 0; ; n++) { try { if ((await fetch(base)).ok) break; } catch {} if (server.exitCode !== null || n > 100) throw new Error('Vite did not start'); await new Promise(r => setTimeout(r, 100)); }
  try { browser = await chromium.launch({headless:true}); } catch { browser = await chromium.launch({channel:'chrome',headless:true}); }
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/#scenario=case_apollo8&view=glance`);
  const scenario = page.locator('.scenariobar select').first();
  await expect(scenario).toHaveValue('case_apollo8');
  await expect(page.locator('.case-context h2')).toContainText('Apollo 8');
  await expect(page.locator('.signal-row').first()).toContainText('Watch · simulated');
  await expect(page.locator('.signal-row').first()).not.toContainText('No reading today');
  await expect(page.getByRole('navigation',{name:'Views'}).getByText(/Casos Reales NASA/i)).toHaveCount(0);
  await page.getByText('Historical sources', {exact:true}).click();
  await expect(page.locator('.case-context__sources li').first()).toBeVisible();
  await page.getByText('Historical sources', {exact:true}).click();
  await page.screenshot({path:join(tmpdir(),'lightminute-case-integration.png')});
  for (const [name, mission] of Object.entries({case_sans:'ISS Expedition 20',case_jugular:'ISS Expedition 56/57',case_apollo7:'Apollo 7',case_apollo8:'Apollo 8',case_bone_loss:'ISS / Mir',case_confinement:'Salyut / Mir'})) {
    await scenario.selectOption(name);
    await expect(scenario).toHaveValue(name);
    await expect(page.locator('.case-context')).toBeVisible();
    await expect(page.locator('.case-context')).toContainText('SYNTHETIC SCENARIO');
    await expect(page.locator('.case-context h2')).toContainText(mission);
  }
  await scenario.selectOption('case_apollo8');
  const action = page.getByRole('button',{name:/Explore simulated alert/});
  if (await action.count()) { await action.click(); await expect(page).toHaveURL(/view=why/); }
  await page.goto(`${base}/#scenario=case_apollo8&view=cases`);
  await expect(page.locator('.case-context h2')).toContainText('Apollo 8');
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Switch to dark theme'}).click();
  await expect(page.locator('.case-context')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) throw new Error('Horizontal overflow at 390px');
  if (errors.length) throw new Error(errors.join('; '));
  console.log('Six cases, sources, legacy link, navigation and mobile theme: PASS');
} finally { await browser?.close(); server.kill(); }
