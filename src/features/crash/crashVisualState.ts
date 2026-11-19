import type { CrashRound } from '../../api/types';

/*
 * The small, explicit bridge between React and Phaser. React writes server round state here;
 * the Phaser scene only reads it on each frame. Kept free of Phaser so it can be unit tested.
 */

export type CrashPhase = 'idle' | 'running' | 'crashed' | 'cashed_out';

export interface CrashVisualState {
  phase: CrashPhase;
  growthPerMs: number;
  /** performance.now() value at which the running round's elapsed time was 0. */
  localStartMs: number;
  /** Last server-reported elapsed time. Drawn instead of a smooth clock under reduced motion. */
  polledElapsedMs: number;
  /** Revealed only after the round ends. */
  crashX100: number | null;
  cashoutX100: number | null;
  reducedMotion: boolean;
}

export interface RequestTiming {
  /** performance.now() when the response arrived. */
  receivedAt: number;
  rttMs: number;
}

// Backend default. Replaced by the server's value on the first response.
const DEFAULT_GROWTH_PER_MS = 0.00006;

export function createIdleVisualState(reducedMotion: boolean): CrashVisualState {
  return {
    phase: 'idle',
    growthPerMs: DEFAULT_GROWTH_PER_MS,
    localStartMs: 0,
    polledElapsedMs: 0,
    crashX100: null,
    cashoutX100: null,
    reducedMotion,
  };
}

export function syncVisualState(
  visual: CrashVisualState,
  round: CrashRound,
  timing: RequestTiming | undefined,
  now: number,
): void {
  visual.growthPerMs = round.curve?.growthPerMs ?? visual.growthPerMs;

  if (round.status === 'RUNNING') {
    // The server measured elapsedMs about half a round trip before the response arrived.
    const elapsed = round.elapsedMs + (timing ? timing.rttMs / 2 : 0);
    visual.phase = 'running';
    visual.localStartMs = (timing?.receivedAt ?? now) - elapsed;
    visual.polledElapsedMs = elapsed;
    visual.crashX100 = null;
    visual.cashoutX100 = null;
    return;
  }

  visual.phase = round.status === 'CRASHED' ? 'crashed' : 'cashed_out';
  visual.crashX100 = round.crashMultiplierX100;
  visual.cashoutX100 = round.cashoutMultiplierX100;
}

export async function timed<T>(
  request: () => Promise<T>,
): Promise<{ value: T; timing: RequestTiming }> {
  const sentAt = performance.now();
  const value = await request();
  const receivedAt = performance.now();
  return { value, timing: { receivedAt, rttMs: receivedAt - sentAt } };
}

/** Reads details.roundId from a ROUND_IN_PROGRESS error. */
export function readRoundId(details: unknown): string | null {
  if (typeof details !== 'object' || details === null) return null;
  const roundId = (details as { roundId?: unknown }).roundId;
  return typeof roundId === 'string' ? roundId : null;
}

/** Reads details.round from a ROUND_CRASHED error. */
export function readCrashRound(details: unknown): CrashRound | null {
  if (typeof details !== 'object' || details === null) return null;
  const round = (details as { round?: unknown }).round;
  if (typeof round !== 'object' || round === null) return null;
  return typeof (round as { roundId?: unknown }).roundId === 'string' ? (round as CrashRound) : null;
}
