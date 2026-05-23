"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Compteur animé qui démarre quand le composant entre dans la viewport.
 */
export function AnimatedCounter({
  value,
  suffix = "",
  duration = 1500,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const t0 = performance.now();
            const tick = () => {
              const elapsed = performance.now() - t0;
              const progress = Math.min(1, elapsed / duration);
              const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
              setCount(Math.round(value * eased));
              if (progress < 1) requestAnimationFrame(tick);
              else setCount(value);
            };
            requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}
