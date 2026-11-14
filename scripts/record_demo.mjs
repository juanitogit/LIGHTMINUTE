/** Local-only rehearsal and a silent 60-second draft. Start API:8000 and Vite:5173 first. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '../apps/crew-tablet/node_modules/playwright/index.mjs';

const base=process.env.TETHER_TEST_URL ?? 'http://127.0.0.1:5173/';
const health=await (await fetch('http://127.0.0.1:8000/api/health')).json();
assert.equal(health.llm_provider,'none','Rehearsal must never use paid/live LLM calls');
for(const name of ['cmo_fever','sep_sleep_loss','co2_creep']) {
 const doc=await (await fetch(`http://127.0.0.1:8000/api/scenario/${name}`)).json();
 assert.equal(doc.source,'engine');assert.equal(doc.days.length,24);
 const res=await fetch('http://127.0.0.1:8000/api/card',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario:name,crew:'A',day:16})});
 assert.equal(res.status,200);const result=await res.json();
 assert.equal(result.card_source,'template');assert.equal(result.card.level,doc.days[15].crew.A.level);
 console.log(`PASS API ${name}: engine + template card`);
}
const output=resolve('pitch/demo-assets');await mkdir(output,{recursive:true});
await mkdir(resolve('tmp/video'),{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:resolve('tmp/video'),size:{width:1280,height:900}}});
const page=await context.newPage();const video=page.video();const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const scenes=[
 ['cmo_fever','glance',8,'TETHER: personal baselines for Earth-independent crews. Synthetic demo.'],
 ['cmo_fever','why',16,'A reading can be inside the Earth range and unusual for this person.'],
 ['cmo_fever','act',16,'The engine fixes numbers, urgency and actions. The LLM is optional.'],
 ['co2_creep','glance',16,'A shared crew pattern prompts checking the cabin context.'],
 ['cmo_fever','radiation',16,'Real-public NOAA snapshot. Hazard context, not operational dosimetry.'],
 ['cmo_fever','validation',16,'Synthetic comparative evidence with published limitations. Not clinical validation.'],
];
let subtitle='';const time=s=>`00:${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')},000`;
try {
 for(let i=0;i<scenes.length;i++) {
  const [scenario,view,day,caption]=scenes[i];const start=Date.now();
  await page.goto(`${base}#scenario=${scenario}&crew=A&day=${day}&view=${view}`);
  await page.locator(`#main .view`).waitFor();
  if(view==='radiation') await page.locator('.rad-chart__line').waitFor();
  if(view==='validation') {
   await page.locator('#calibration-title').waitFor();
   await page.locator('#calibration-title').evaluate(el=>el.scrollIntoView({block:'center'}));
  }
  await page.screenshot({path:resolve(output,`demo-${i+1}-${view}.png`)});
  subtitle+=`${i+1}\n${time(i*10)} --> ${time((i+1)*10)}\n${caption}\n\n`;
  console.log(`Scene ${i+1}: ${view}`);
  await page.waitForTimeout(Math.max(0,10000-(Date.now()-start)));
 }
 assert.deepEqual(errors,[]);
} finally {await context.close();await browser.close();}
await writeFile(resolve(output,'captions.srt'),subtitle);
await writeFile(resolve('tmp/raw-video-path.txt'),await video.path());
console.log('PASS online browser rehearsal; raw video ready for ffmpeg');
