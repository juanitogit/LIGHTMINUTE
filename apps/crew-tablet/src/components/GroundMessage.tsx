import { useEffect, useState } from "react";
import { fmtClock, fmtDelay } from "../lib/format";
import type { Routing } from "../lib/types";
import { Icon } from "./Icon";

export function GroundMessage({
  message,
  routing,
}: {
  message: string;
  routing: Routing;
}) {
  const [requested, setRequested] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [copied, setCopied] = useState(false);

  const budget = routing?.message_budget_chars ?? 140;
  const overBudget = message.length > budget;

  useEffect(() => {
    if (!requested) return;
    setRemaining(Math.max(0, Math.round(routing?.expected_reply_s ?? 0)));
  }, [requested, routing?.expected_reply_s]);

  useEffect(() => {
    if (!requested || remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [requested, remaining]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="ground">
      <p className="ground__message">{message}</p>

      <ul className="ground__meta">
        <li>
          <Icon name="clock" size={14} /> reply window {fmtDelay(routing?.expected_reply_s)}
        </li>
        <li>priority {routing?.priority ?? "—"}</li>
        <li className={overBudget ? "over-budget" : undefined}>
          {message.length}/{budget} chars
        </li>
      </ul>

      {routing?.send_now ? (
        <p className="callout callout--warn">
          Send now: ground cannot answer inside the window. Keep acting onboard.
        </p>
      ) : null}
      {routing?.act_onboard_first && !routing?.send_now ? (
        <p className="callout">Act onboard first, then send the update.</p>
      ) : null}
      {routing?.note ? <p className="muted small">{routing.note}</p> : null}

      <div className="ground__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setRequested(true)}
          disabled={requested && remaining > 0}
        >
          <Icon name="send" size={16} /> {requested ? "Sent (simulated)" : "Send to ground"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={copy}>
          <Icon name="copy" size={16} /> {copied ? "Copied" : "Copy"}
        </button>
        {requested ? (
          <button type="button" className="btn btn--ghost" onClick={() => setRequested(false)}>
            Reset
          </button>
        ) : null}
      </div>

      {requested ? (
        <div className={`countdown ${remaining > 0 ? "" : "countdown--done"}`}>
          <span aria-hidden="true">
            {remaining > 0
              ? `Earth reply in ${fmtClock(remaining)}`
              : "Reply window open · simulated"}
          </span>
          <p className="sr-only" role="status">
            {remaining > 0
              ? `Message queued. Simulated reply expected in ${fmtDelay(remaining)}.`
              : "Simulated reply window is open. No message leaves the tablet."}
          </p>
          <div className="countdown__track" aria-hidden="true">
            <span
              style={{
                width: `${
                  routing?.expected_reply_s
                    ? Math.max(0, Math.min(100, (1 - remaining / routing.expected_reply_s) * 100))
                    : 100
                }%`,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
