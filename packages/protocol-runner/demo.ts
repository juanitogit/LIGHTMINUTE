/** Classic-script demo also works when opened directly with file://. */
(() => {
  type StepEvent = {tsMs:number;stepIndex:number;status:string};
  type Summary = {completed:boolean;totalMs:number;steps:{status:string}[]};
  type Runner = {mountProtocolRunner:(host:HTMLElement,options:{protocol:unknown;onStep:(event:StepEvent)=>void;onDone:(summary:Summary)=>void})=>unknown};
  const {mountProtocolRunner} = (globalThis as typeof globalThis & {TetherProtocolRunner:Runner}).TetherProtocolRunner;
  const list = document.querySelector<HTMLUListElement>("#log");
  const script = document.querySelector<HTMLElement>("#fever-protocol");
  const host = document.querySelector<HTMLElement>("#runner");
  if (!list || !script || !host) throw Error("Protocol demo markup is incomplete");
  const protocol: unknown = JSON.parse(script.textContent ?? "");
  const row = (text: string) => {const li=document.createElement("li");li.textContent=text;list.append(li);};
  mountProtocolRunner(host, {
    protocol,
    onStep: payload => {
      row(`${new Date(payload.tsMs).toLocaleTimeString()} · step ${payload.stepIndex + 1} · ${payload.status}`);
      console.log("onStep", payload);
    },
    onDone: summary => {
      const cannot = summary.steps.filter(step => step.status === "cannot").length;
      row(`finished · completed=${summary.completed} · ${cannot} not possible · ${Math.round(summary.totalMs / 1000)}s`);
      console.log("onDone", summary);
    },
  });
})();
