import { useCallback, useEffect, useRef, useState } from 'react';

interface Entry<T> {
  timer: number;
  item: T;
}

/**
 * Holds results the server has already settled until their animation finishes (a Plinko ball
 * landing, a Dice marker stopping), then hands each one to `onReveal`. Several can be pending at
 * once. `flush` reveals everything now. Anything still pending on unmount is revealed too (with
 * `live` false), so the wallet is always refreshed.
 */
export function useRevealQueue<T>(onReveal: (item: T, live: boolean) => void) {
  const entries = useRef(new Map<number, Entry<T>>());
  const nextId = useRef(1);
  const [pending, setPending] = useState(0);
  const onRevealRef = useRef(onReveal);

  useEffect(() => {
    onRevealRef.current = onReveal;
  });

  const reveal = useCallback((id: number) => {
    const entry = entries.current.get(id);
    if (!entry) return;
    window.clearTimeout(entry.timer);
    entries.current.delete(id);
    setPending(entries.current.size);
    onRevealRef.current(entry.item, true);
  }, []);

  const schedule = useCallback(
    (item: T, delayMs: number) => {
      const id = nextId.current++;
      const timer = window.setTimeout(() => reveal(id), Math.max(0, delayMs));
      entries.current.set(id, { timer, item });
      setPending(entries.current.size);
    },
    [reveal],
  );

  const flush = useCallback(() => {
    for (const id of [...entries.current.keys()]) reveal(id);
  }, [reveal]);

  useEffect(() => {
    const map = entries.current;
    return () => {
      for (const { timer, item } of map.values()) {
        window.clearTimeout(timer);
        // Not live: the page is closing, so skip sounds and animations.
        onRevealRef.current(item, false);
      }
      map.clear();
    };
  }, []);

  return { pending, schedule, flush };
}
