const engine = import.meta.glob("../../../../services/engine/tether_engine/**/*.py", {query:"?raw",import:"default",eager:true}) as Record<string,string>;
const kb = import.meta.glob("../../../../kb/*.json", {query:"?raw",import:"default",eager:true}) as Record<string,string>;
const RUNTIME = new URL("./pyodide/", self.location.href).href;

self.onmessage = async (event:MessageEvent<{scenario:string}>) => {
  try {
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
