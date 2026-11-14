import { useEffect, useMemo, useRef, useState } from "react";
import { BandChart } from "../components/BandChart";
import { LevelBadge, Panel } from "../components/primitives";
import { fmt, unitLabel } from "../lib/format";
import { indicatorMeta } from "../lib/meta";
import type { LoadedScenario, CrewDay } from "../lib/types";
import { prepareWorkspaceImage, readWorkspaceRecord, saveWorkspaceRecord, workspaceRecordId, type WorkspaceImage, type WorkspaceRecord } from "../lib/workspaceStore";

export interface MissionWorkspaceProps {
  scenario: LoadedScenario;
  crewId: string;
  dayNumber: number;
  mode: "today" | "trends" | "handbook";
}

interface HandbookAnswer { question: string; title: string; lines: string[]; citations: string[] }

/** Answers select existing engine facts only. No model calls or clinical inference. */
export function answerMissionHandbook(question: string, member: CrewDay, day: number): HandbookAnswer {
  const q = question.trim().toLowerCase();
  const answer: HandbookAnswer = {question, title:"Not available in the onboard record", lines:["I do not have a verified answer to that question in this mission snapshot. Use the onboard protocol and trained crew support for questions beyond these records."], citations:[]};
  const words: Record<string, string[]> = {rest_hr:["heart","pulse","hr"],temp_c:["temperature","temp","fever"],sleep_h:["sleep","rest period"],pvt_ms:["reaction","pvt","vigilance"],co2_ppm:["co2","co₂","carbon"],headache_score:["headache"]};
  const keys = Object.keys(member.indicators).filter(key => q.includes(key.replaceAll("_"," ")) || (words[key] ?? []).some(word => new RegExp(`\\b${word}\\b`,"i").test(q)));
  if (keys.length) {
    answer.title = "Readings in this snapshot";
    answer.lines = keys.flatMap(key => {
      const value=member.indicators[key]; if(!value)return [];
      const meta=indicatorMeta(key);
      return [`${meta.label}: ${fmt(value.value,meta.decimals)} ${unitLabel(value.unit)} on mission day ${day}.`,
        `Personal lens: ${value.lens.personal.replaceAll("_"," ")}. Earth lens: ${value.lens.earth.replaceAll("_"," ")}. Space lens: ${value.lens.space.replaceAll("_"," ")}.`,
        value.ci95 ? `The exported 95% personal band is ${fmt(value.ci95[0],meta.decimals)}–${fmt(value.ci95[1],meta.decimals)} ${unitLabel(value.unit)}.` : "No personal interval is exported for this reading."];
    });
    answer.citations=[...member.card.citations];
  } else if (/\b(action|next|do|steps|help)\b/.test(q)) {
    answer.title="Current engine action steps";answer.lines=[...member.card.do_now];answer.citations=[...member.card.citations];
  } else if (/\b(ground|earth|delay|reply|message)\b/.test(q)) {
    answer.title="Ground routing in this snapshot";answer.lines=[`Simulated expected round trip: ${Math.round(member.routing.expected_reply_s)} seconds.`,member.routing.note ?? "No additional routing note is exported.",`Prepared ground summary: ${member.card.ground_message}`];answer.citations=[...member.card.citations];
  } else if (/\b(why|changed|pattern|summary)\b/.test(q)) {
    answer.title=member.card.headline;answer.lines=[member.card.what_changed,member.card.why_it_matters];answer.citations=[...member.card.citations];
  } else if (/\b(escalate|emergency|worse)\b/.test(q)) {
    answer.title="Escalation conditions from the current card";answer.lines=[...member.card.escalate_if];answer.citations=[...member.card.citations];
  }
  return answer;
}

export function MissionWorkspace({scenario,crewId,dayNumber,mode}:MissionWorkspaceProps) {
  const member=scenario.doc.days.find(d=>d.day===dayNumber)?.crew[crewId];
  const name=scenario.doc.name??scenario.doc.scenario??"mission";
  const contextRef=useRef(workspaceRecordId(name,crewId,dayNumber));
  contextRef.current=workspaceRecordId(name,crewId,dayNumber);
  const [record,setRecord]=useState<WorkspaceRecord|undefined>();
  const [draft,setDraft]=useState("");
  const [image,setImage]=useState<WorkspaceImage|undefined>();
  const [checked,setChecked]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [confirmed,setConfirmed]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [selected,setSelected]=useState<string[]>([]);
  const [question,setQuestion]=useState("");
  const [answers,setAnswers]=useState<HandbookAnswer[]>([]);
  const indicators=useMemo(()=>scenario.doc.indicators??Object.keys(member?.indicators??{}),[scenario.doc,member]);
  const tasks=member?.card.do_now??[];
  const taskKeys=tasks.map((text,index)=>`${index}:${text}`);
  useEffect(()=>{
    let active=true;setBusy(false);setLoaded(false);setRecord(undefined);setDraft("");setImage(undefined);setChecked([]);setConfirmed(false);setNotice("");setError("");setAnswers([]);setQuestion("");
    readWorkspaceRecord(name,crewId,dayNumber).then(value=>{if(!active)return;setRecord(value);setDraft(value?.note??"");setImage(value?.image);setChecked(value?.completed??[]);setLoaded(true);}).catch(e=>{if(active){setError(e instanceof Error?e.message:"Could not read the check-in.");setLoaded(true);}});
    return()=>{active=false;};
  },[name,crewId,dayNumber]);
  useEffect(()=>{setSelected(indicators.slice(0,3));},[indicators]);
  if(!member)return <div className="view"><h1>No crew snapshot available</h1></div>;

  const persist=async(completed=checked)=>{
    const next:WorkspaceRecord={id:workspaceRecordId(name,crewId,dayNumber),scenario:name,crew:crewId,day:dayNumber,note:draft.trim(),completed,savedAt:new Date().toISOString(),synthetic:true,...(image?{image}:{})};
    const savingContext=contextRef.current;
    setBusy(true);setError("");setNotice("");
    try{await saveWorkspaceRecord(next);if(contextRef.current!==savingContext)return;setRecord(next);setNotice("Saved on this device. No information was sent to Earth.");}
    catch(e){if(contextRef.current===savingContext)setError(e instanceof Error?e.message:"The check-in could not be saved.");}
    finally{if(contextRef.current===savingContext)setBusy(false);}
  };

  return <div className="view mission-workspace">
    <header className="viewhead"><div><p className="micro">SYNTHETIC MISSION / CREW {crewId} / DAY {dayNumber}</p><h1>{mode==="today"?"Today":mode==="trends"?"Trends since launch":"Onboard handbook"}</h1><p className="viewhead__sub">{mode==="today"?"Measurements, current action steps and a local demonstration check-in.":mode==="trends"?"Choose up to three signals. Every point and personal interval comes from the deterministic engine.":"Works without a connection or language model. Answers are limited to the selected engine snapshot and its citations."}</p></div><LevelBadge level={member.level}/></header>
    {mode==="today"?<>
      <Panel title={`Current steps · ${taskKeys.filter(k=>checked.includes(k)).length}/${tasks.length}`} labelledBy="today-steps"><ul className="checklist">{tasks.map((task,index)=><li key={taskKeys[index]}><label className={`check ${checked.includes(taskKeys[index]??"")?"is-done":""}`}><input type="checkbox" disabled={!loaded||busy} checked={checked.includes(taskKeys[index]??"")} onChange={e=>setChecked(old=>e.target.checked?[...old,taskKeys[index]??""]:old.filter(k=>k!==taskKeys[index]))}/><span className="check__text">{task}</span></label></li>)}</ul><p className="muted small">These are the current Decision Card steps, not a newly invented examination schedule. Save the check-in to retain their completion.</p></Panel>
      <Panel title="Measurements in the current record" labelledBy="today-measurements"><div className="table-wrap"><table className="data-table"><thead><tr><th>Signal</th><th>Reading</th><th>Recorded</th><th>Personal verdict</th></tr></thead><tbody>{indicators.map(key=>{const r=member.indicators[key],meta=indicatorMeta(key);return <tr key={key}><td>{meta.label}</td><td>{r?`${fmt(r.value,meta.decimals)} ${unitLabel(r.unit)}`:"No reading"}</td><td>{r?`Mission day ${dayNumber}`:"Not available this day"}</td><td>{r?.lens.personal.replaceAll("_"," ")??"Re-measure according to the onboard protocol"}</td></tr>;})}</tbody></table></div><p className="small muted">Snapshot provenance: {scenario.originLabel}. Acquisition timestamps and future exam due dates are not exported; freshness beyond the mission day is unknown.</p></Panel>
      <Panel title="Demonstration check-in" labelledBy="checkin-title"><form onSubmit={e=>{e.preventDefault();if(confirmed)void persist();}}>
        <p className="small muted">Use invented notes and synthetic demonstration images only. Do not enter real personal health information.</p>
        <label className="field"><span>Note for this crew member</span><textarea aria-label="Demonstration check-in note" rows={4} maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)} style={{width:"100%",font:"inherit",color:"var(--ink)",background:"transparent",border:"1px solid var(--line)",padding:12}}/></label>
        <label className="field" style={{marginTop:18}}><span>Attach a synthetic image</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;const imageContext=contextRef.current;setBusy(true);setError("");try{const prepared=await prepareWorkspaceImage(file);if(contextRef.current!==imageContext)return;setImage(prepared);setNotice("Image prepared. Save the check-in to keep it.");}catch(failure){if(contextRef.current===imageContext)setError(failure instanceof Error?failure.message:"Image could not be prepared.");}finally{if(contextRef.current===imageContext)setBusy(false);e.target.value="";}}}/></label>
        {image?<figure style={{marginTop:18}}><img src={image.dataUrl} alt={`Synthetic demonstration attachment for crew ${crewId}, day ${dayNumber}`} width={image.width} height={image.height} style={{maxWidth:"100%",width:320,height:"auto"}}/><figcaption className="small muted">Stored locally with this check-in. Not interpreted, diagnosed or automatically sent to Earth. Re-encoding removes original image metadata.</figcaption><button type="button" className="text-action" onClick={()=>setImage(undefined)}>Remove attachment</button></figure>:null}
        <label className="check" style={{marginTop:16}}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I confirm that this note and attachment are synthetic demonstration data.</span></label>
        <button type="submit" className="btn btn--primary" disabled={!loaded||busy||!confirmed}>{busy?"Saving…":"Save check-in"}</button>
      </form>{record?<p className="small muted">Last saved {new Date(record.savedAt).toLocaleString()}. This browser-local journal is not a secure multi-user medical record.</p>:null}</Panel>
      {notice?<p role="status" className="small">{notice}</p>:null}{error?<p role="alert" className="callout callout--warn">{error}</p>:null}
    </>:null}
    {mode==="trends"?<>
      <fieldset style={{border:0,padding:0,margin:"0 0 24px"}}><legend className="small">Choose up to three signals</legend><div style={{display:"flex",flexWrap:"wrap",gap:"8px 24px",marginTop:10}}>{indicators.map(key=><label key={key} style={{display:"inline-flex",alignItems:"center",gap:8,minHeight:44}}><input type="checkbox" checked={selected.includes(key)} disabled={!selected.includes(key)&&selected.length===3} onChange={e=>setSelected(old=>e.target.checked?[...old,key]:old.filter(k=>k!==key))}/>{indicatorMeta(key).label}</label>)}</div></fieldset>
      {selected.length===0?<p className="muted">Choose a signal to show its mission history.</p>:null}
      {selected.map(key=>{const meta=indicatorMeta(key),r=member.indicators[key];const points=scenario.doc.days.filter(d=>d.day<=dayNumber).map(d=>({day:d.day,reading:d.crew[crewId]?.indicators[key]}));const preflight=scenario.doc.days.find(d=>d.crew[crewId]?.indicators[key])?.crew[crewId]?.indicators[key]?.value;return <Panel key={key} title={meta.label} labelledBy={`trend-${key}`} aside={<span className="small muted">Day 1 through {dayNumber}</span>}><BandChart points={points} selectedDay={dayNumber} meta={{...meta,unit:r?.unit??meta.unit}}/><p className="small muted">First available mission reading: {fmt(preflight,meta.decimals)} {unitLabel(r?.unit??meta.unit)}. This is an in-mission reference, not an invented pre-flight measurement.</p><p className="small">Current: {r?`${fmt(r.value,meta.decimals)} ${unitLabel(r.unit)}`:"No reading today"}</p></Panel>;})}
    </>:null}
    {mode==="handbook"?<>
      <div className="chips" role="group" aria-label="Suggested handbook questions">{["What changed?","What should I do next?","What is my heart rate?","How long until Earth replies?"].map(text=><button type="button" key={text} className="text-action" onClick={()=>setAnswers(old=>[...old,answerMissionHandbook(text,member,dayNumber)])}>{text}</button>)}</div>
      <form onSubmit={e=>{e.preventDefault();if(!question.trim())return;setAnswers(old=>[...old,answerMissionHandbook(question,member,dayNumber)]);setQuestion("");}} style={{display:"flex",gap:12,alignItems:"end",margin:"15px 0 28px"}}><label className="field" style={{flex:1}}><span>Ask about this snapshot</span><input aria-label="Handbook question" value={question} maxLength={500} onChange={e=>setQuestion(e.target.value)} style={{font:"inherit",background:"transparent",color:"var(--ink)",border:0,borderBottom:"1px solid var(--line)",minHeight:44}}/></label><button type="submit" className="btn btn--primary" disabled={!question.trim()}>Ask</button></form>
      <div aria-live="polite">{answers.map((answer,index)=><Panel key={index} title={answer.title} labelledBy={`answer-${index}`}><p className="small muted">You asked: {answer.question}</p>{answer.lines.map((line,i)=><p key={i}>{line}</p>)}{answer.citations.length?<p className="small muted">Engine card citations: {answer.citations.join(" · ")}. Reading provenance: {scenario.originLabel}.</p>:<p className="small muted">No matching cited record was found. Nothing was generated or inferred.</p>}</Panel>)}</div>
    </>:null}
    <p className="small muted" style={{marginTop:25}}>Synthetic crew exercise. Not a medical device. Notes and images remain on this device; no remote access control or clinical interpretation is implied.</p>
  </div>;
}
