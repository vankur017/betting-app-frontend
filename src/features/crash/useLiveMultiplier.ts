import { useEffect, useState } from 'react';
import { multiplierAt } from '../../lib/crash';
import type { CrashVisualState } from './crashVisualState';

/**
 * The multiplier the graph is showing for the running round, refreshed ten times a second for
 * labels such as "Cash out 15.20 VC". Display only: the server's clock decides every cash-out.
 */
export function useLiveMultiplier(visual: CrashVisualState, running: boolean): number {
  const [x100, setX100] = useState(100);

  useEffect(() => {
    if (!running) return;
    const read = () => {
      const elapsed = visual.reducedMotion
        ? visual.polledElapsedMs
        : performance.now() - visual.localStartMs;
      setX100(multiplierAt(elapsed, visual.growthPerMs));
    };
    read();
    const timer = window.setInterval(read, 100);
    return () => window.clearInterval(timer);
  }, [visual, running]);

  return x100;
}
