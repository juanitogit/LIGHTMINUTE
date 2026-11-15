import type { ReactNode } from "react";

type IconName =
  | "overview"
  | "pulse"
  | "orbit"
  | "chart"
  | "earth"
  | "info"
  | "watch"
  | "act"
  | "escalate"
  | "play"
  | "pause"
  | "sun"
  | "moon"
  | "visor"
  | "check"
  | "arrow"
  | "copy"
  | "send"
  | "clock"
  | "close"
  | "chevron";


const PATHS: Record<IconName, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  pulse: <><path d="M2 12h5l3-8 4 16 3-8h5" /></>,
  orbit: <><circle cx="12" cy="12" r="4" /><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-40 12 12)" /><path d="m17 4 1-2" /></>,
  chart: <><path d="M4 3v17h17M8 15l4-5 4 2 5-7" /></>,
  earth: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 6.5h14M5 17.5h14" /></>,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.2 2.6 2.6L16 9.2" />
    </>
  ),
  watch: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3 1.8" />
    </>
  ),
  act: (
    <>
      <path d="M12 3.2 22 20.4H2z" />
      <path d="M12 9.5v5" />
      <circle cx="12" cy="17.4" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  escalate: (
    <>
      <path d="M8.2 2.4h7.6l6 6v7.6l-6 6H8.2l-6-6V8.4z" />
      <path d="M12 7.4v5.6" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  play: <path d="M8 5.2v13.6L19 12z" />,
  pause: (
    <>
      <path d="M9 5.5v13" />
      <path d="M15 5.5v13" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  visor: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="4" />
      <path d="M6 9h12M7 13h10" />
      <circle cx="12" cy="11" r="2.5" fill="currentColor" stroke="none" opacity="0.3" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="12" rx="2" />
      <path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </>
  ),
  send: <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-8-8-4z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m6 9 6 6 6-6" />,
};

export function Icon({
  name,
  size = 18,
  className,
  title,
}: {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
