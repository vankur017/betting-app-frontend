import type { DiceDirection, DiceRound } from '../../api/types';

/*
 * The bridge between React and Phaser for Dice. React writes the bet and the server's roll
 * here; the scene only reads it each frame. Kept free of Phaser so it can be unit tested.
 */

/** How long the marker takes to slide to the roll. A new roll can start at any time. */
export const ROLL_MS = 700;

/** Track geometry, shared with the page so its drag input sits exactly on the track. */
export const TRACK_PADDING = 28;
/** Vertical position of the track, as a share of the canvas height. */
export const TRACK_Y_RATIO = 0.7;

export interface DiceRollAnimation {
  roundId: string;
  /** Where the marker starts: wherever it was, or the middle of the track. */
  from: number;
  /** The server's roll, in hundredths. */
  to: number;
  won: boolean;
  /** performance.now() when the animation started. */
  startedAt: number;
  durationMs: number;
}

export interface DiceVisualState {
  rollSpan: number;
  target: number;
  direction: DiceDirection;
  roll: DiceRollAnimation | null;
  reducedMotion: boolean;
}

export function createDiceVisualState(reducedMotion: boolean): DiceVisualState {
  return { rollSpan: 10000, target: 5000, direction: 'under', roll: null, reducedMotion };
}

/** Shows the bet being set up. Clears the last roll only when the bet actually changes. */
export function setBet(
  visual: DiceVisualState,
  target: number,
  direction: DiceDirection,
  rollSpan: number,
): void {
  if (visual.target === target && visual.direction === direction && visual.rollSpan === rollSpan) {
    return;
  }
  visual.target = target;
  visual.direction = direction;
  visual.rollSpan = rollSpan;
  visual.roll = null;
}

/** 0 when the roll starts, 1 once the marker has stopped. */
export function rollProgress(roll: DiceRollAnimation, now: number): number {
  if (roll.durationMs <= 0) return 1;
  return Math.min(1, Math.max(0, (now - roll.startedAt) / roll.durationMs));
}

/** Marker position at `progress`, easing out so it slows down as it reaches the roll. */
export function markerValue(roll: DiceRollAnimation, progress: number): number {
  const eased = 1 - (1 - progress) ** 3;
  return roll.from + (roll.to - roll.from) * eased;
}

/** Starts replaying the server's roll and returns how long the animation lasts. */
export function startRoll(visual: DiceVisualState, round: DiceRound, now: number): number {
  visual.target = round.target;
  visual.direction = round.direction;
  // Start from wherever the marker is now, even mid-slide, so quick re-rolls look continuous.
  const from = visual.roll
    ? markerValue(visual.roll, rollProgress(visual.roll, now))
    : Math.floor(visual.rollSpan / 2);
  // Under reduced motion the marker appears at the roll straight away; nothing is hidden.
  const durationMs = visual.reducedMotion ? 0 : ROLL_MS;
  visual.roll = {
    roundId: round.roundId,
    from,
    to: round.roll,
    won: round.won,
    startedAt: now,
    durationMs,
  };
  return durationMs;
}
