/** Verify committed synthetic data signatures without access to the private key. */
import {createPublicKey,verify} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const app=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const manifest=JSON.parse(await readFile(join(app,"public/data/signatures.json"),"utf8")) as {algorithm:string;publicKey:string;signatures:Record<string,string>};
if(manifest.algorithm!=="Ed25519")throw Error("Wrong signature algorithm");
const keySource=await readFile(join(app,"src/lib/scenarioKey.ts"),"utf8");
if(!keySource.includes(JSON.stringify(manifest.publicKey)))throw Error("Public key does not match bundled verifier");
const key=createPublicKey({key:Buffer.from(manifest.publicKey,"base64"),format:"der",type:"spki"});
const names=(await readdir(join(app,"public/data"))).filter(x=>/^scenario-.*\.json$/.test(x)).map(x=>`data/${x}`);
names.push("demo-data.json");
for(const name of names){const sig=manifest.signatures?.[name];if(!sig || !verify(null,await readFile(join(app,"public",name)),key,Buffer.from(sig,"base64")))throw Error(`Invalid signature: ${name}`);}
console.log(`Verified ${names.length} signed synthetic scenario files.`);
