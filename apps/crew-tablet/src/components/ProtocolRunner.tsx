import { useEffect, useRef, useState } from "react";
import protocolCss from "virtual:tether-protocol-css";
import { protocols } from "virtual:tether-protocols";
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

const PROTOCOL_STYLE_ID = "tether-protocol-runner-style";

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
export function ProtocolRunner({ protocolId }: { protocolId?: string | undefined }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<{ destroy?: () => void } | null>(null);
  const [selected, setSelected] = useState(protocolId ?? "");
  const [state, setState] = useState<"idle" | "ready" | "error">("idle");
  const [note, setNote] = useState("");

  const entries = Object.entries(protocols);

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
        const mod = (await import("virtual:tether-protocol-runner")) as RunnerModule;
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
            onDone: () => {
              if (alive) setNote("Protocol complete");
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
  }, [selected]);

  // Without A4's package and protocol data there is nothing to show.
  if (entries.length === 0 && !protocolId) return null;
  if (!protocolCss) return null;

  return (
    <Panel
      title="Onboard protocol"
      aside={<span className="mono small">optional · A4</span>}
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

      <div ref={hostRef} className="protocol-host" hidden={!selected} />

      {!selected ? (
        <p className="muted small" style={{ marginTop: 8 }}>
          The decision card is complete on its own. Open a protocol only when the card calls for
          one.
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
