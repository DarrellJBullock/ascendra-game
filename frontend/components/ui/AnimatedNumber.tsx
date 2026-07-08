"use client";

// Phase 4 — count-up animated number. Tweens from the previous value to the new
// one whenever it changes (e.g. after Advance Week), formatting each frame.
// Respects prefers-reduced-motion.

import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({
  value,
  format,
  durationMs = 650,
  className,
}: {
  value: number;
  format: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <span className={className}>{format(display)}</span>;
}
