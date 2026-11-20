import { useCallback, useMemo, useState } from 'react';
import { env } from '../../config/env';
import { parseCoins, toCoinInput } from '../../lib/money';
import { adjustedStake, stakeProblem, type StakeLimits } from './stake';

const STORAGE_PREFIX = 'mintline:stake:';

function readStoredStake(game: string, fallback: string): string {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + game) ?? fallback;
  } catch {
    return fallback;
  }
}

function storeStake(game: string, value: string): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + game, value);
  } catch {
    // Storage can be unavailable (private mode). Remembering the stake is only a convenience.
  }
}

export interface StakeController {
  input: string;
  error: string | null;
  /** Parsed stake in minor units, or null while the input is not a valid amount. */
  value: number | null;
  setInput: (value: string) => void;
  setError: (message: string | null) => void;
  setAmount: (minorUnits: number) => void;
  adjust: (change: 'half' | 'double') => void;
  setMax: () => void;
  /** Checks the stake against the limits and balance. Shows the problem and returns null if invalid. */
  validate: () => number | null;
}

/**
 * Bet amount state shared by every game page. Remembers the last stake per game. All checks are
 * for instant feedback only; the server re-validates every stake against its own limits and
 * the real balance.
 */
export function useStake(
  game: string,
  limits: StakeLimits | undefined,
  balance: number | undefined,
): StakeController {
  const [input, setInputState] = useState(() =>
    readStoredStake(game, toCoinInput(10 * 10 ** env.coinDecimals)),
  );
  const [error, setError] = useState<string | null>(null);
  const parsed = useMemo(() => parseCoins(input), [input]);
  const value = parsed.ok ? parsed.value : null;

  const setInput = useCallback(
    (next: string) => {
      setInputState(next);
      setError(null);
      storeStake(game, next);
    },
    [game],
  );

  const setAmount = useCallback((minorUnits: number) => setInput(toCoinInput(minorUnits)), [setInput]);

  const adjust = useCallback(
    (change: 'half' | 'double') => {
      if (value === null) return;
      const next = adjustedStake(value, change, limits);
      if (next !== null) setAmount(next);
    },
    [value, limits, setAmount],
  );

  const setMax = useCallback(() => {
    const caps = [limits?.maxStake, balance].filter((cap): cap is number => cap !== undefined);
    if (caps.length === 0) return;
    let next = Math.min(...caps);
    if (limits?.minStake !== undefined) next = Math.max(next, limits.minStake);
    setAmount(next);
  }, [limits, balance, setAmount]);

  const validate = useCallback(() => {
    if (!parsed.ok) {
      setError(parsed.error);
      return null;
    }
    const problem = stakeProblem(parsed.value, limits, balance);
    if (problem) {
      setError(problem);
      return null;
    }
    setError(null);
    return parsed.value;
  }, [parsed, limits, balance]);

  return { input, error, value, setInput, setError, setAmount, adjust, setMax, validate };
}
