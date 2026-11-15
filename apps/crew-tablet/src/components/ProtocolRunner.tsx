import { useEffect, useRef, useState } from "react";
import protocolCss from "virtual:lightminute-protocol-css";
import { protocols } from "virtual:lightminute-protocols";
import { Panel } from "./primitives";

type MountFn = (
  el: HTMLElement,
  opts: {
    protocolId: string;
    protocol?: unknown;
    onStep?: (step: unknown) => void;
    onDone?: (summary: unknown) => void;
  },
) => { destroy?: () => void } | void;

type RunnerModule = {
  mountProtocolRunner?: MountFn;
  default?: { mountProtocolRunner?: MountFn } | null;
};

const PROTOCOL_STYLE_ID = "lightminute-protocol-runner-style";

function stepLabel(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  const index = typeof record.stepIndex === "number" ? record.stepIndex + 1 : null;
  const status = typeof record.status === "string" ? record.status : "";
  if (index === null) return status;
  return `Step ${index} · ${status}`;
}

/**
 * A4 owns packages/protocol-runner and kb/protocols. Vite inlines both behind
 * virtual modules, so this panel works offline and disappears cleanly when A4's
 * package is absent. The card above never depends on it.
 */
export function ProtocolRunner({ protocolId, crewId }: { protocolId?: string | undefined; crewId?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<{ destroy?: () => void } | null>(null);
  const [selected, setSelected] = useState(protocolId ?? "");
  const [state, setState] = useState<"idle" | "ready" | "error">("idle");
  const [note, setNote] = useState("");

  const entries = Object.entries(protocols);
  const triggers = (selected ? protocols[selected]?.trigger_patterns : undefined) ?? [];

  useEffect(() => {
    if (protocolId) setSelected(protocolId);
  }, [protocolId]);

  useEffect(() => {
    if (!protocolCss) return;
    if (document.getElementById(PROTOCOL_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = PROTOCOL_STYLE_ID;
    style.textContent = protocolCss;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!selected || !host) return;
    const protocol = protocols[selected];
    if (!protocol) return;
    let alive = true;

    (async () => {
      try {
        const mod = (await import("virtual:lightminute-protocol-runner")) as RunnerModule;
        const mount = mod.mountProtocolRunner ?? mod.default?.mountProtocolRunner;
        if (!alive || typeof mount !== "function") {
          if (alive) setState("error");
          return;
        }
        controllerRef.current =
          mount(host, {
            protocolId: selected,
            protocol,
            onStep: (payload) => {
              if (alive) setNote(stepLabel(payload));
            },
            onDone: (summary) => {
              if (alive) setNote("Protocol complete");
              try {
                const session = JSON.parse(localStorage.getItem("lightminute-mission-session") ?? "null");
                const result = summary && typeof summary === "object" ? summary as Record<string,unknown> : {};
                const record = {crew:crewId ?? session?.crew ?? "A",protocol_id:selected,steps:Array.isArray(result.steps)?result.steps:[],completed:result.completed===true};
                const previous = JSON.parse(localStorage.getItem("lightminute-protocol-history") ?? "[]");
                localStorage.setItem("lightminute-protocol-history",JSON.stringify([...previous,{...record,recorded_at:new Date().toISOString()}].slice(-50)));
                if (session?.token) void fetch(`${import.meta.env.VITE_API_BASE ?? ""}/api/mission/protocol-runs`, {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.token}`},body:JSON.stringify(record)})
                  .then(r=>{if(!r.ok)throw Error("Mission log unavailable");})
                  .catch(()=>{if(alive)setNote("Protocol complete. Saved on this device; server log unavailable.");});
              } catch { if(alive)setNote("Protocol complete; persistent storage unavailable."); }
            },
          }) ?? null;
        if (alive) setState("ready");
      } catch {
        if (alive) setState("error");
      }
    })();

    return () => {
      alive = false;
      try {
        controllerRef.current?.destroy?.();
      } catch {
        /* A4's controller owns its DOM */
      }
      controllerRef.current = null;
      if (host) host.replaceChildren();
    };
  }, [selected, crewId]);

  // Without A4's package and protocol data there is nothing to show.
  if (entries.length === 0 && !protocolId) return null;
  if (!protocolCss) return null;

  return (
    <Panel
      title="Onboard protocol"
      aside={<span className="mono small">Guided steps</span>}
      labelledBy="protocol-title"
    >
      <label className="field">
        <span className="micro">Protocol</span>
        <span className="select">
          <select
            value={selected}
            onChange={(event) => {
              setState("idle");
              setNote("");
              setSelected(event.target.value);
            }}
          >
            <option value="">No protocol</option>
            {entries.map(([id, doc]) => (
              <option key={id} value={id}>
                {doc.title ?? id}
              </option>
            ))}
          </select>
        </span>
      </label>

      {triggers.length > 0 ? (
        <details className="protocol-triggers">
          <summary>When this protocol applies</summary>
          <ul className="plain-list">
            {triggers.map((trigger) => (
              <li key={trigger}>{trigger}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div ref={hostRef} className="protocol-host" hidden={!selected} />

      {!selected ? (
        <p className="muted small" style={{ marginTop: 8 }}>
          No protocol was selected by this scenario. Review the available protocols and their
          applicability before starting one; do not assume a specific protocol was recommended.
        </p>
      ) : null}

      {state === "error" ? (
        <p className="callout callout--warn">
          The protocol runner could not load. The card above still works offline.
        </p>
      ) : null}

      {note ? (
        <p className="muted small" role="status" style={{ marginTop: 8 }}>
          {note}
        </p>
      ) : null}
    </Panel>
  );
}
