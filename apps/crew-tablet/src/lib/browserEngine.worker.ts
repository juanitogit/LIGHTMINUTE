const engine = import.meta.glob("../../../../services/engine/tether_engine/**/*.py", {query:"?raw",import:"default",eager:true}) as Record<string,string>;
const kb = import.meta.glob("../../../../kb/*.json", {query:"?raw",import:"default",eager:true}) as Record<string,string>;
const RUNTIME = new URL("./pyodide/", self.location.href).href;

async function prepareRuntime() {
  const manifest = __LIGHTMINUTE_ENGINE_MANIFEST__;
  const cache = await caches.open(manifest.cache);
  let completed = 0;
  const progress = (bytes: number) => self.postMessage({progress:`Preparing Python: ${(bytes / 1048576).toFixed(1)} / ${(manifest.total / 1048576).toFixed(1)} MiB`});
  progress(0);
  for (const file of manifest.files) {
    const url = new URL(file.name, RUNTIME).href;
    if (await cache.match(url)) { completed += file.size; progress(completed); continue; }
    const response = await fetch(url);
    if (!response.ok || !response.body) throw new Error(`Could not download ${file.name}. Check the connection and retry.`);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      chunks.push(value); length += value.byteLength; progress(completed + length);
    }
    const data = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {data.set(chunk, offset); offset += chunk.byteLength;}
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data))).map(byte => byte.toString(16).padStart(2,"0")).join("");
    if (length !== file.size || digest !== file.sha256) throw new Error(`Downloaded ${file.name} failed its integrity check.`);
    await cache.put(url, new Response(data, {headers: {"Content-Type": response.headers.get("Content-Type") || "application/octet-stream"}}));
    completed += length;
    progress(completed);
  }
}

self.onmessage = async (event:MessageEvent<{scenario:string}>) => {
  try {
    await prepareRuntime();
    self.postMessage({progress:"Loading Python runtime…"});
    const {loadPyodide} = await import(/* @vite-ignore */ `${RUNTIME}pyodide.mjs`);
    const py = await loadPyodide({indexURL:RUNTIME});
    self.postMessage({progress:"Loading NumPy and SciPy…"});
    await py.loadPackage(["numpy","scipy"]);
    self.postMessage({progress:"Running the synthetic scenario…"});
    for (const [path,content] of Object.entries({...engine,...kb})) {
      const relative=path.replace(/^\.\.\/\.\.\/\.\.\/\.\.\//,"");
      if (!relative.startsWith("services/engine/tether_engine/") && !relative.startsWith("kb/")) throw new Error("Invalid engine source path");
      const target=`/project/${relative}`;
      py.FS.mkdirTree(target.slice(0,target.lastIndexOf("/")));
      py.FS.writeFile(target,content,{encoding:"utf8"});
    }
    py.globals.set("scenario_name",event.data.scenario);
    const result=await py.runPythonAsync(`import json, sys\nsys.path.insert(0, '/project/services/engine')\nfrom tether_engine.pipeline import run_scenario\njson.dumps(run_scenario(scenario_name, seed=0, days=24, variant='strong'), allow_nan=False)`);
    self.postMessage({ok:true,data:JSON.parse(result)});
  } catch(error) {self.postMessage({ok:false,error:error instanceof Error?error.message:String(error)});}
};
