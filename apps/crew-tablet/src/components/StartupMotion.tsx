import { useEffect, useState } from "react";
import { Brand } from "./Brand";

/** Decorative HyperFrames render; the application underneath stays usable. */
export function StartupMotion() {
  const [visible, setVisible] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 1800);
    return () => window.clearTimeout(timer);
  }, [visible]);
  if (!visible) return null;
  return <div className="startup-motion" aria-hidden="true">
    <div className="startup-motion__mark">
      <video className="startup-motion__orbit" autoPlay muted playsInline preload="auto" tabIndex={-1}>
        <source src={`${import.meta.env.BASE_URL}assets/motion/startup.webm`} type="video/webm" />
      </video>
      <Brand />
    </div>
  </div>;
}
