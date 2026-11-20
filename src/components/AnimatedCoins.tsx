import { useEffect, useRef, useState } from 'react';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { cx } from '../lib/cx';
import { formatCoins } from '../lib/money';

/**
 * A coin amount that counts to its new value and briefly turns green (up) or red (down),
 * so balance changes are noticed. The screen-reader text is the final value only.
 */
export function AnimatedCoins({ value, className }: { value: number; className?: string }) {
  const shown = useAnimatedNumber(value);
  const previous = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (value === previous.current) return;
    setFlash(value > previous.current ? 'up' : 'down');
    previous.current = value;
    const timer = window.setTimeout(() => setFlash(null), 900);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <span
      className={cx(
        'tabular-nums transition-colors duration-300',
        flash === 'up' && 'text-mint-300',
        flash === 'down' && 'text-rose-300',
        className,
      )}
    >
      <span aria-hidden="true">{formatCoins(shown)}</span>
      <span className="sr-only">{formatCoins(value)}</span>
    </span>
  );
}
