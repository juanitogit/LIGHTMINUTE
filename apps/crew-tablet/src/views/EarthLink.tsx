import { useEffect, useRef, useState } from "react";
import type { LoadedScenario } from "../lib/types";
import { localLogin, localSend, localState } from "../lib/missionLocal";

type Role = "crew" | "medical_officer" | "flight_surgeon";
type Session = {token:string;role:Role;crew:string;local?:boolean};
type LinkMessage = {id:string;crew:string;direction:string;text:string;report:Record<string,unknown>;sent:number;arrival:number;remaining_s:number;delivered:boolean};
type State = {server_time:number;messages:LinkMessage[];protocol_runs: {id:string;protocol:string;completed:boolean;created:number}[]};
const base = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/,"");
const sessionKey = "lightminute-mission-session";
function stored():Session|null {try{return JSON.parse(localStorage.getItem(sessionKey)??"null") as Session|null;}catch{return null;}}

export function EarthLink({scenario,crewId,dayNumber}:{scenario:LoadedScenario;crewId:string;dayNumber:number}) {
  const [session,setSession]=useState<Session|null>(stored);
  const [role,setRole]=useState<Role>("crew");
  const [crew,setCrew]=useState(crewId);
  const [pin,setPin]=useState("");
  const [profile,setProfile]=useState("mars");
  const [text,setText]=useState("");
  const [symptoms,setSymptoms]=useState(false);
  const [behavioral,setBehavioral]=useState(false);
  const [vitals,setVitals]=useState(true);
  const [data,setData]=useState<State|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const activeToken=useRef(session?.token);
  activeToken.current=session?.token;
  async function request(path:string,method="GET",body?:unknown,auth=session) {
    const res=await fetch(`${base}/api/mission/${path}`,{method,headers:{"Content-Type":"application/json",...(auth?{Authorization:`Bearer ${auth.token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const result=await res.json().catch(()=>({detail:"Local mission service unavailable"}));
    if(!res.ok)throw new Error(typeof result.detail==="string"?result.detail:"The mission service could not process this request.");
    return result;
  }
  async function refresh(){const token=session?.token;if(session?.local){setData(localState(session));setError("");return;}try{const next=await request("state") as State;if(activeToken.current!==token)return;setData(next);setError("");}catch(e){if(activeToken.current===token)setError(e instanceof Error?e.message:"Connection failed");}}
  useEffect(()=>{if(!session)return;void refresh();const timer=setInterval(()=>void refresh(),1000);return()=>clearInterval(timer);},[session]);
  async function login(){setBusy(true);try{
    let result:Session;
    try{
      const payload=await request("session","POST",{role,crew,pin},null) as Partial<Session>;
      // A static host answers /api with the SPA's HTML: never store that as a session.
      if(typeof payload.token!=="string")throw new Error("The mission service did not return a session");
      result=payload as Session;
    }catch(e){
      const message=e instanceof Error?e.message:"Sign-in failed";
      // A server that answered with its own rejection is authoritative; anything
      // else means there is no reachable API and the browser queue takes over.
      if(message==="Incorrect demo PIN")throw e;
      result=localLogin(role,crew,pin) as unknown as Session;
      setNotice("Local demo session in this browser: the queue and the consent filter are simulated on this device, with no mission server and no real delivery.");
    }
    if(!result.local)setNotice("Demo session started. Use synthetic information only.");
    localStorage.setItem(sessionKey,JSON.stringify(result));setSession(result);setPin("");setError("");
  }catch(e){setError(e instanceof Error?e.message:"Sign-in failed");}finally{setBusy(false);}}
  async function logout(){activeToken.current=undefined;setSession(null);setData(null);setText("");localStorage.removeItem(sessionKey);try{await request("session","DELETE");}catch{/* local sign-out remains possible offline */}}
  async function send(){setBusy(true);try{
    const target=session?.role==="crew"?session.crew:crew;
    const member=scenario.doc.days.find(d=>d.day===dayNumber)?.crew[target];
    const readings=member?.indicators??{};
    const select=(keys:string[])=>Object.fromEntries(keys.filter(key=>readings[key]).map(key=>[key,readings[key]!.value]));
    const report={vitals:select(["rest_hr","temp_c"]),symptoms:select(["headache_score"]),behavioral:select(["sleep_h","pvt_ms"])};
    const consent={vitals,symptoms,behavioral};
    if(session?.local){localSend(session,{crew:target,text,profile,day:dayNumber,report,consent});}
    else await request("messages","POST",{crew:target,text,profile,day:dayNumber,report,consent});
    setText("");setNotice("Saved to the local mission queue. Delivery follows the selected one-way delay.");await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Send failed");}finally{setBusy(false);}}
  return <div className="view earth-link"><header className="viewhead"><div><p className="micro">PERSISTENT MISSION COMMUNICATIONS</p><h1>Earth link</h1><p className="viewhead__sub">Reports and replies travel with the mission delay. Synthetic local demonstration.</p></div></header>
    <p className="muted small">Shared demo PIN: 2026. {session?.local?"This browser queue enforces the role and consent rules locally; the local API is offline, so no server checks them and nothing leaves this device.":"Roles are enforced by this local API, but choosing a role with a shared PIN is not production identity verification."} Do not enter personal health data.</p>
    {!session?<section className="panel" aria-labelledby="link-login"><h2 id="link-login">Start a demo session</h2><form onSubmit={e=>{e.preventDefault();void login();}} className="stack">
      <label className="field">Role<select value={role} onChange={e=>setRole(e.target.value as Role)}><option value="crew">Crew member — own records</option><option value="medical_officer">Medical officer — all onboard records</option><option value="flight_surgeon">Flight surgeon — delivered reports only</option></select></label>
      <label className="field">Crew identity<select value={crew} onChange={e=>setCrew(e.target.value)}>{["A","B","C","D"].map(c=><option key={c}>{c}</option>)}</select></label>
      <label className="field">Demo PIN<input type="password" autoComplete="off" value={pin} onChange={e=>setPin(e.target.value)} required/></label><button className="btn" disabled={busy} type="submit">Start session</button>
    </form></section>:<>
      <section className="panel"><div className="panel__head"><h2>{session.role.replaceAll("_"," ")}{session.role==="crew"?` / Crew ${session.crew}`:""}</h2><div style={{display:"flex",gap:"10px",alignItems:"center"}}>{session.local?<span className="small muted">Local browser queue · no server</span>:null}<button className="btn" onClick={()=>void logout()}>Sign out</button></div></div>
      <form className="stack" onSubmit={e=>{e.preventDefault();void send();}}>
        {session.role!=="crew"?<label className="field">Crew recipient<select value={crew} onChange={e=>setCrew(e.target.value)}>{["A","B","C","D"].map(c=><option key={c}>{c}</option>)}</select></label>:null}
        <label className="field">Mission profile<select value={profile} onChange={e=>setProfile(e.target.value)}><option value="iss">Space station</option><option value="moon">Moon surface</option><option value="mars">Mars transit</option></select></label>
        <label className="field">{session.role==="flight_surgeon"?"Reply to crew":"Synthetic message to Earth"}<textarea rows={3} maxLength={400} value={text} required onChange={e=>setText(e.target.value)}/></label>
        {session.role!=="flight_surgeon"?<fieldset><legend>Consent — fields allowed into this report</legend><label><input type="checkbox" checked={vitals} onChange={e=>setVitals(e.target.checked)}/> Vitals</label><label><input type="checkbox" checked={symptoms} onChange={e=>setSymptoms(e.target.checked)}/> Symptom summary</label><label><input type="checkbox" checked={behavioral} onChange={e=>setBehavioral(e.target.checked)}/> Behavioural text (off by default)</label><p className="small muted">Withheld fields are removed {session.local?"in this browser":"by the server"} before storage. The message text above is sent only when Behavioural text is on; otherwise Earth sees a withheld notice. Vitals are sent as numbers only.</p></fieldset>:null}
        <button type="submit" className="btn" disabled={busy||!text.trim()}>Queue {session.role==="flight_surgeon"?"reply":"report"}</button>
      </form></section>
      <section className="panel" aria-labelledby="link-messages"><h2 id="link-messages">Messages</h2>{data?.messages.length?data.messages.map(m=><article key={m.id} style={{padding:"18px 0",borderBottom:"1px solid var(--line)"}}><div className="panel__head"><strong>Crew {m.crew} · {m.direction==="ground"?"To Earth":"To crew"}</strong><span className="small muted">{m.delivered?"Delivered":`${Math.ceil(m.remaining_s)} s to delivery`}</span></div><p>{m.text}</p>{Object.keys(m.report).length?<details><summary>Consented report</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(m.report,null,2)}</pre></details>:null}</article>):<p className="muted">No messages available to this role yet. Ground cannot see inbound reports before delivery.</p>}</section>
      <section className="panel"><h2>Saved onboard protocol runs</h2>{data?.protocol_runs.length?data.protocol_runs.map(r=><p key={r.id}>{r.protocol} · {r.completed?"complete":"stopped / in progress"}</p>):<p className="muted">No runs visible to this role. Ground receives protocol summaries only when the crew sends them.</p>}</section>
    </>}
    {notice?<p role="status">{notice}</p>:null}{error?<p className="callout" role="alert">{error}. The persistent Earth link requires the local API; no delivery or privacy enforcement is claimed while disconnected.</p>:null}
  </div>;
}
