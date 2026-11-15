import { SCENARIO_PUBLIC_KEY } from "./scenarioKey";
type Manifest = {algorithm:string;publicKey:string;signatures:Record<string,string>};
const bytes = (base64:string) => Uint8Array.from(atob(base64), char=>char.charCodeAt(0));

/** Checks exact response bytes, before parsing or displaying a scenario. */
export async function verifySignedJson<T>(path:string,base:string,timeoutMs:number):Promise<T> {
  if (!crypto.subtle) throw new Error("Signature verification unavailable on this device");
  const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const [manifestResponse,dataResponse]=await Promise.all([
      fetch(`${base}data/signatures.json`,{signal:controller.signal}),fetch(`${base}${path}`,{signal:controller.signal}),
    ]);
    if (!manifestResponse.ok || !dataResponse.ok) throw new Error("Signed scenario unavailable");
    const manifest=await manifestResponse.json() as Manifest;
    if(manifest.algorithm!=="Ed25519" || manifest.publicKey!==SCENARIO_PUBLIC_KEY || !manifest.signatures?.[path]) throw new Error("Scenario signature or trusted key missing");
    const key=await crypto.subtle.importKey("spki",bytes(SCENARIO_PUBLIC_KEY),{name:"Ed25519"},false,["verify"]);
    const data=await dataResponse.arrayBuffer();
    if(!await crypto.subtle.verify("Ed25519",key,bytes(manifest.signatures[path]),data)) throw new Error("Scenario signature invalid");
    return JSON.parse(new TextDecoder().decode(data)) as T;
  } finally {window.clearTimeout(timer);}
}
