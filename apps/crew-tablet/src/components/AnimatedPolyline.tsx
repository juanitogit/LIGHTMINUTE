import { useLayoutEffect, useRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

type Point = [number, number];

function parsePoints(value: string): Point[] {
  return value.trim().split(/\s+/).filter(Boolean).map(pair => {
    const [x, y] = pair.split(",").map(Number);
    return [x ?? NaN, y ?? NaN];
  });
}

function sample(points: Point[], index: number, count: number): Point {
  if (points.length === 1) return points[0]!;
  const position = count === 1 ? 0 : index * (points.length - 1) / (count - 1);
  const left = Math.floor(position), right = Math.min(points.length - 1, left + 1);
  const weight = position - left, a = points[left]!, b = points[right]!;
  return [a[0] + (b[0] - a[0]) * weight, a[1] + (b[1] - a[1]) * weight];
}

/** Preserve the visible line and retarget it if another update interrupts motion. */
export function AnimatedPolyline({ points, ...props }: Omit<ComponentPropsWithoutRef<"polyline">, "points"> & { points: string }) {
  const initial = useRef(points);
  const element = useRef<SVGPolylineElement>(null);

  useLayoutEffect(() => {
    const line = element.current;
    if (!line) return;
    const current = line.getAttribute("points") ?? "";
    if (current === points) return;
    const from = parsePoints(current), to = parsePoints(points);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        !from.length || !to.length || [...from, ...to].some(point => point.some(value => !Number.isFinite(value)))) {
      line.setAttribute("points", points);
      return;
    }
    const count = Math.max(from.length, to.length);
    const start = performance.now();
    let frame = 0;
    const update = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 300));
      const eased = 1 - (1 - t) ** 3;
      if (t === 1) { line.setAttribute("points", points); return; }
      const interpolated = Array.from({length: count}, (_, index) => {
        const a = sample(from, index, count), b = sample(to, index, count);
        return `${a[0] + (b[0] - a[0]) * eased},${a[1] + (b[1] - a[1]) * eased}`;
      }).join(" ");
      line.setAttribute("points", interpolated);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [points]);

  return <polyline {...props} ref={element} points={initial.current} />;
}
