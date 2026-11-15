/* Generated from packages/protocol-runner/demo.ts; edit the TypeScript source. */
(function () {
/** Classic-script demo also works when opened directly with file://. */
(() => {
    const { mountProtocolRunner } = globalThis.TetherProtocolRunner;
    const list = document.querySelector("#log");
    const script = document.querySelector("#fever-protocol");
    const host = document.querySelector("#runner");
    if (!list || !script || !host)
        throw Error("Protocol demo markup is incomplete");
    const protocol = JSON.parse(script.textContent ?? "");
    const row = (text) => { const li = document.createElement("li"); li.textContent = text; list.append(li); };
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
})();
