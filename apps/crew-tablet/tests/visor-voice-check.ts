import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
const port = await new Promise<number>((done, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (!address || typeof address === 'string') return reject(new Error('No test port'));
    server.close(() => done(address.port));
  });
});
const base = `http://127.0.0.1:${port}`;
const vite = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  for (let attempt = 0; ; attempt++) {
    if (vite.exitCode !== null) throw new Error('Vite exited before starting');
    try { if ((await fetch(base)).ok) break; } catch { /* waiting for Vite */ }
    if (attempt >= 100) throw new Error('Vite did not start');
    await new Promise(done => setTimeout(done, 100));
  }
  try { browser = await chromium.launch({ headless: true }); }
  catch { browser = await chromium.launch({ channel: 'chrome', headless: true }); }
const page = await browser.newPage();
  await page.addInitScript({ content: `
    window.SpeechRecognition = class {
      start() { window.recognitionLanguage = this.lang; setTimeout(() => { const result = Object.assign([{ transcript: "¿Cuál es mi frecuencia cardíaca?" }], { isFinal: true }); this.onresult?.({ results: [result] }); }, 150); }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    };
    Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => [], cancel: () => {}, speak: utterance => { window.spoken = utterance.text; setTimeout(() => utterance.onend?.({}), 10); } } });
  ` });
  let received = '';
  await page.route('**/api/visor/answer', async route => { received = route.request().postData() ?? ''; await route.fulfill({ json: { answer: 'Tu frecuencia cardíaca es 68 latidos por minuto.', provider: 'groq', model: 'mock-model' } }); });
  await page.goto(`${base}/#scenario=cmo_fever&crew=A&day=16&view=visor`);
  await page.getByRole('heading', { name: 'Visor voice assistant' }).waitFor();
  await page.getByLabel('Recognition language').selectOption('es');
  await page.getByRole('button', { name: 'Enable microphone' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as {recognitionLanguage: string}).recognitionLanguage)).toBe('es-CO');
  await expect(page.getByText('You said:', { exact: false })).toContainText('frecuencia cardíaca');
  await expect(page.getByText('Groq · mock-model')).toBeVisible();
  await expect.poll(() => received).toContain('frecuencia cardíaca');
  await expect.poll(() => received).toContain('"language":"es"');
  await expect.poll(() => page.evaluate(() => (window as unknown as {spoken: string}).spoken)).toContain('frecuencia cardíaca');
  await page.getByRole('button', { name: /Microphone on/ }).click();
  await page.getByLabel('Type a question').fill('What is my heart rate?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect.poll(() => received).toContain('What is my heart rate?');
  await page.unroute('**/api/visor/answer');
  await page.route('**/api/visor/answer', route => route.fulfill({ status: 503, json: { detail: 'AI unavailable' } }));
  await page.getByLabel('Type a question').fill('¿Cuál es mi frecuencia cardíaca?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByText('Deterministic response', { exact: false })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'La frecuencia cardíaca mostrada' })).toBeVisible();
  await page.goto(`${base}/#scenario=case_sans&crew=A&day=16&view=visor`);
  await expect(page.getByText('Assistant unavailable:', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask', exact: true })).toBeDisabled();
  console.log('Voice recognition, provider label, speech playback and typed question: PASS');
} finally { await browser?.close(); vite.kill(); }
