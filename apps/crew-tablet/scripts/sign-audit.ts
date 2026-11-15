/** Sign an existing synthetic audit file without publishing its signing key. */
import {createPrivateKey,createPublicKey,sign} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {homedir} from "node:os";
import {join} from "node:path";

const [input,output] = process.argv.slice(2);
if(!input || !output || input===output) throw Error("Usage: node scripts/sign-audit.mjs INPUT.json OUTPUT.signed.json");
const keyPath=process.env.LIGHTMINUTE_SIGNING_KEY || join(process.env.LOCALAPPDATA || homedir(),"LIGHTMINUTE","signing","ed25519-private.pem");
const key=createPrivateKey(await readFile(keyPath));
if(key.asymmetricKeyType!=="ed25519")throw Error("Signing key must use Ed25519");
const payload=await readFile(input);if(payload.length>10_000_000)throw Error("Audit file too large");
JSON.parse(payload.toString("utf8"));
const envelope={algorithm:"Ed25519",publicKey:createPublicKey(key).export({type:"spki",format:"der"}).toString("base64"),payload:payload.toString("base64"),signature:sign(null,payload,key).toString("base64")};
await writeFile(output,JSON.stringify(envelope,null,2)+"\n",{flag:"wx"});
console.log("Signed audit envelope created. Verify the public-key fingerprint independently.");
