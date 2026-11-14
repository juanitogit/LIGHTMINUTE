import type { ReactNode } from "react";
import { LEVEL_COPY } from "../lib/meta";
import type { Level } from "../lib/types";
import { Icon } from "./Icon";

/** Status = icon + text + colour, never colour alone. */
export function LevelBadge({ level, compact = false }: { level: Level; compact?: boolean }) {
  const copy = LEVEL_COPY[level] ?? LEVEL_COPY.info;
  return (
    <span className={`status-label status-label--${level}`}>
      <Icon name={level} size={compact ? 14 : 16} />
      <span>{compact ? copy.short : copy.label}</span>
    </span>
  );
}

export function Chip({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "warn" | "accent" | "quiet";
  title?: string;
}) {
  return (
    <span className={`inline-label inline-label--${tone}`} title={title}>
      {children}
    </span>
  );
}

export function Panel({
  title,
  aside,
  children,
  className = "",
  labelledBy,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section
      className={`panel ${className}`.trim()}
      aria-labelledby={labelledBy}
    >
      {title ? (
        <header className="panel__head">
          <h2 className="micro" id={labelledBy}>
            {title}
          </h2>
          {aside ? <div className="panel__aside">{aside}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {children ? <div className="empty__body">{children}</div> : null}
    </div>
  );
}

export function DataNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`data-notice ${compact ? "data-notice--compact" : ""}`.trim()}>
      <Chip tone="warn">SYNTHETIC DATA</Chip>
      <Chip tone="quiet">not a medical device</Chip>
    </div>
  );
}
