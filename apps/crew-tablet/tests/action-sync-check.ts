// Start Vite on 127.0.0.1:5182, then run `npx tsx tests/action-sync-check.ts`.
import { chromium } from 'playwright';
const browser = await chromium.launch({channel:'chrome',headless:true});
const page = await browser.newPage();
try {
  const base='http://127.0.0.1:5182/#scenario=cmo_fever&crew=A&day=16&view=';
  await page.goto(base+'act');
  const box=page.locator('.act__steps input[type=checkbox]').first();
  await box.waitFor(); await box.click();
  await page.waitForFunction(() => document.querySelector('.act__steps input[type=checkbox]')?.checked);
  await page.goto(base+'today');
  const today=page.locator('.mission-workspace .checklist input[type=checkbox]').first();
  await today.waitFor(); await page.waitForFunction(() => [...document.querySelectorAll('.mission-workspace input[type=checkbox]')].some(e => e.checked));
  if (!(await today.isChecked())) throw new Error('Action missing from Today');
  await page.reload(); await today.waitFor(); await page.waitForTimeout(500);
  if (!(await today.isChecked())) throw new Error('Action missing after reload');
  console.log('action sync and reload: PASS');
} finally {await browser.close();}
