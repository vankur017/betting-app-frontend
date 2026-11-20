import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Tweens towards `target` (an integer, e.g. coin minor units) over `durationMs`, easing out.
 * Jumps straight to the new value under reduced motion.
 */
export function useAnimatedNumber(target: number, durationMs = 600): number {
  const reducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    if (reducedMotion || !Number.isFinite(target) || !Number.isFinite(from)) {
      current.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const next = Math.round(from + (target - from) * (1 - (1 - t) ** 3));
      current.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reducedMotion]);

  return value;
}
