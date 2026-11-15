import { useEffect, useRef, useState } from "react";

type RecognitionEvent = {results: ArrayLike<ArrayLike<{transcript:string}>>};
type Recognition = {lang:string; continuous:boolean; interimResults:boolean; onresult:((event:RecognitionEvent)=>void)|null; onerror:((event:{error:string})=>void)|null; onend:(()=>void)|null; start:()=>void; stop:()=>void; abort:()=>void};
type RecognitionConstructor = new () => Recognition;

export function VoiceNote({onText}:{onText:(text:string)=>void}) {
  const active=useRef<Recognition|null>(null);
  const [listening,setListening]=useState(false);
  const [status,setStatus]=useState("");
  const host=window as unknown as {SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor};
  const Speech=host.SpeechRecognition ?? host.webkitSpeechRecognition;
  useEffect(()=>()=>{const rec=active.current;active.current=null;if(rec){rec.onresult=null;rec.onerror=null;rec.onend=null;rec.abort();}},[]);
  if (!Speech) return <p className="small muted">Voice dictation is unavailable in this browser. Type your synthetic note instead.</p>;
  function start() {
    try {
      const rec=new Speech!(); active.current=rec; rec.lang=navigator.language; rec.continuous=false; rec.interimResults=false;
      rec.onresult=e=>{const text=Array.from(e.results).map(r=>r[0]?.transcript??"").join(" ").trim();if(text)onText(text);};
      rec.onerror=e=>setStatus(`Dictation stopped: ${e.error}. You can type the note.`);
      rec.onend=()=>{setListening(false);active.current=null;setStatus(current=>current.startsWith("Listening")?"Dictation finished.":current);};
      setListening(true);setStatus("Listening for a synthetic note…");rec.start();
    } catch {setListening(false);setStatus("Dictation could not start. You can type the note.");}
  }
  return <div><p className="small muted">Dictate synthetic demonstration text only. Your browser may send microphone audio to its speech provider.</p>
    <button type="button" className="btn" onClick={()=>listening?active.current?.stop():start()}>{listening?"Stop dictation":"Dictate note"}</button>
    {status?<p className="small" role="status">{status}</p>:null}
  </div>;
}
