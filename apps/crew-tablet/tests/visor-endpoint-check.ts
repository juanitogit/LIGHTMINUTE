import { strict as assert } from 'node:assert';
import { onRequestPost } from '../functions/api/visor/answer';
const context = { page: 'visor', scenario: 'synthetic', body: 'mars', crew: 'A', day: 1, max_day: 24, level: 'info', heart_rate_bpm: 65 };
const request = () => new Request('https://example.test/api/visor/answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'How is my heart rate?', language: 'en', context }) });
const absent = await onRequestPost({ request: request(), env: {} });
assert.equal(absent.status, 503);
const original = globalThis.fetch;
let sent = '';
try {
  globalThis.fetch = async (_input, init) => {
    sent = String(init?.body ?? '');
    return Response.json({ choices: [{ message: { content: 'Heart rate is 65 bpm.' } }] });
  };
  const response = await onRequestPost({ request: request(), env: { GROQ_API_KEY: 'test-only' } });
  const data = await response.json() as { provider: string; answer: string };
  assert.equal(data.provider, 'groq');
  assert.equal(data.answer, 'Heart rate is 65 bpm.');
  assert.match(sent, /heart rate/);
  assert.doesNotMatch(JSON.stringify(data), /test-only/);
  console.log('Visor endpoint, provider and missing key: PASS');
} finally { globalThis.fetch = original; }
