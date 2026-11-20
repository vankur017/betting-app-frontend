import { useCallback, useRef, useState } from 'react';

/**
 * One game request at a time. `busy` names the request in flight (for spinners and labels);
 * a ref guard also drops repeat clicks that land before React re-renders, so a double click
 * can never send two requests.
 */
export function useInFlight<K extends string>() {
  const [busy, setBusy] = useState<K | null>(null);
  const current = useRef<K | null>(null);

  const run = useCallback(async (kind: K, task: () => Promise<void>) => {
    if (current.current !== null) return;
    current.current = kind;
    setBusy(kind);
    try {
      await task();
    } finally {
      current.current = null;
      setBusy(null);
    }
  }, []);

  return { busy, run };
}
