import type { PlinkoRound } from '../../api/types';
import { dropDurationMs, isConsistentPath } from '../../lib/plinko';

/*
 * The bridge between React and Phaser for Plinko. React writes the board and the server's
 * result here; the scene only reads it each frame. Kept free of Phaser so it can be unit tested.
 */

export interface PlinkoDrop {
  roundId: string;
  path: number[];
  bucket: number;
  /** performance.now() when the animation started. */
  startedAt: number;
  /** 0 means "show it in the bucket straight away" (only when the path is unusable). */
  durationMs: number;
}

export interface PlinkoVisualState {
  rows: number;
  /** Bucket multipliers for the board on screen, from the server's settings. */
  multipliersX100: number[];
  drop: PlinkoDrop | null;
  /** Drops the hop and the landing lift. The fall itself is always shown: it is the result. */
  reducedMotion: boolean;
}

export function createPlinkoVisualState(reducedMotion: boolean, rows = 12): PlinkoVisualState {
  return { rows, multipliersX100: [], drop: null, reducedMotion };
}

/** Shows a board. Clears the last landed ball only when the board actually changes. */
export function setBoard(visual: PlinkoVisualState, rows: number, multipliersX100: number[]): void {
  const same =
    visual.rows === rows &&
    visual.multipliersX100.length === multipliersX100.length &&
    visual.multipliersX100.every((m, i) => m === multipliersX100[i]);
  if (same) return;
  visual.rows = rows;
  visual.multipliersX100 = [...multipliersX100];
  visual.drop = null;
}

/**
 * Starts replaying the server's result and returns how long the animation lasts, so the page
 * can reveal the result when the ball lands.
 */
export function startDrop(
  visual: PlinkoVisualState,
  round: PlinkoRound,
  multipliersX100: number[],
  now: number,
): number {
  setBoard(visual, round.rows, multipliersX100);
  const usable = isConsistentPath(round.path, round.rows, round.bucket);
  // Animate even under reduced motion: the player started this drop and the fall is how they
  // see the outcome. The scene removes the decorative bounce instead.
  const durationMs = usable ? dropDurationMs(round.rows) : 0;
  visual.drop = {
    roundId: round.roundId,
    // A bad path still lands in the server's bucket; it just isn't animated.
    path: usable ? [...round.path] : [],
    bucket: round.bucket,
    startedAt: now,
    durationMs,
  };
  return durationMs;
}

/** 0 when the ball is dropped, 1 once it is in its bucket. */
export function dropProgress(drop: PlinkoDrop, now: number): number {
  if (drop.durationMs <= 0) return 1;
  return Math.min(1, Math.max(0, (now - drop.startedAt) / drop.durationMs));
}
