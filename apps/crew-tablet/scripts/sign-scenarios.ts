/** Sign synthetic demo files. Private signing key stays outside the repository. */
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultDir = join(process.env.LOCALAPPDATA || homedir(), "LIGHTMINUTE", "signing");
const keyPath = process.env.LIGHTMINUTE_SIGNING_KEY || join(defaultDir, "ed25519-private.pem");
await mkdir(dirname(keyPath), {recursive:true});
let key;
try { key = createPrivateKey(await readFile(keyPath)); }
catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT" || !process.argv.includes("--init")) throw error;
  const pair = generateKeyPairSync("ed25519"); key = pair.privateKey;
  await writeFile(keyPath, key.export({type:"pkcs8",format:"pem"}), {mode:0o600,flag:"wx"});
}
if (key.asymmetricKeyType !== "ed25519") throw Error("Signing key must use Ed25519");
const publicKey = createPublicKey(key).export({type:"spki",format:"der"}).toString("base64");
await writeFile(join(app,"src/lib/scenarioKey.ts"),`// Generated public verification key; private key is never included.\nexport const SCENARIO_PUBLIC_KEY = ${JSON.stringify(publicKey)};\n`);
const data = join(app,"public/data");
const filenames = (await readdir(data)).filter(name=>/^scenario-.*\.json$/.test(name)).sort();
const signatures: Record<string,string> = {};
async function canonicalBytes(path: string) {
  const original=await readFile(path); const normal=Buffer.from(original.toString("utf8").replaceAll("\r\n","\n"),"utf8");
  JSON.parse(normal.toString("utf8"));
  if(!normal.equals(original))await writeFile(path,normal);
  return normal;
}
for (const name of filenames) signatures[`data/${name}`] = sign(null,await canonicalBytes(join(data,name)),key).toString("base64");
signatures["demo-data.json"] = sign(null,await canonicalBytes(join(app,"public/demo-data.json")),key).toString("base64");
await writeFile(join(data,"signatures.json"),JSON.stringify({algorithm:"Ed25519",publicKey,signatures},null,2)+"\n");
console.log(`Signed ${Object.keys(signatures).length} files. Signing key remains outside the repository.`);
