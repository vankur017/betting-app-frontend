import type { DiceDirection, DiceSettings } from '../api/types';

/*
 * Display-only Dice helpers, mirroring backend/src/games/dice/dice.rules.js. They only preview
 * a bet; the server alone rolls, checks the result and calculates the return.
 * Rolls and targets are integers in hundredths: 5000 = 50.00.
 */

export const DICE_DIRECTIONS: readonly DiceDirection[] = ['under', 'over'];

/** Reads dice.settings from GET /api/games, or null if anything is missing or malformed. */
export function readDiceSettings(value: unknown): DiceSettings | null {
  if (typeof value !== 'object' || value === null) return null;
  const { rollSpan, minWinCount, maxWinCount, houseEdgeBps } = value as Record<string, unknown>;
  if (![rollSpan, minWinCount, maxWinCount, houseEdgeBps].every((n) => Number.isSafeInteger(n))) {
    return null;
  }
  const settings = { rollSpan, minWinCount, maxWinCount, houseEdgeBps } as DiceSettings;
  if (settings.rollSpan < 100 || settings.minWinCount < 1) return null;
  if (settings.minWinCount > settings.maxWinCount || settings.maxWinCount >= settings.rollSpan) {
    return null;
  }
  if (settings.houseEdgeBps < 0 || settings.houseEdgeBps >= 10000) return null;
  return settings;
}

/** Number of winning rolls: "under" wins below the target, "over" wins above it. */
export function winCount(target: number, direction: DiceDirection, settings: DiceSettings): number {
  return direction === 'under' ? target : settings.rollSpan - 1 - target;
}

export function targetRange(
  direction: DiceDirection,
  { rollSpan, minWinCount, maxWinCount }: DiceSettings,
): { minTarget: number; maxTarget: number } {
  if (direction === 'under') return { minTarget: minWinCount, maxTarget: maxWinCount };
  return { minTarget: rollSpan - 1 - maxWinCount, maxTarget: rollSpan - 1 - minWinCount };
}

export function clampTarget(
  target: number,
  direction: DiceDirection,
  settings: DiceSettings,
): number {
  const { minTarget, maxTarget } = targetRange(direction, settings);
  return Math.min(maxTarget, Math.max(minTarget, Math.round(target)));
}

/** The target with the same win chance in the other direction (under 50.00 <-> over 49.99). */
export function flipTarget(target: number, settings: DiceSettings): number {
  return settings.rollSpan - 1 - target;
}

/** Multiplier in hundredths: floor((10000 - houseEdgeBps) x 100 / winningRolls). */
export function diceMultiplierX100(wins: number, settings: DiceSettings): number {
  return Math.floor(((10000 - settings.houseEdgeBps) * 100) / wins);
}

/** Stake x multiplier, rounded down. Exact integer maths, as on the server. */
export function payoutFor(stake: number, multiplierX100: number): number {
  const product = stake * multiplierX100;
  return (product - (product % 100)) / 100;
}

/** 507 -> "5.07". */
export function formatRoll(x100: number): string {
  if (!Number.isSafeInteger(x100) || x100 < 0) return '—';
  return `${Math.floor(x100 / 100)}.${String(x100 % 100).padStart(2, '0')}`;
}

/** Win chance as a percentage with two decimals: 5000 winning rolls of 10000 -> "50.00%". */
export function formatChance(wins: number, settings: DiceSettings): string {
  return `${formatRoll(Math.floor((wins * 10000) / settings.rollSpan))}%`;
}

export type ParseTargetResult = { ok: true; value: number } | { ok: false; error: string };

/** Parses a typed target such as "50", "50.5" or "5.07" into hundredths. */
export function parseTarget(input: string): ParseTargetResult {
  const match = /^(\d{1,2})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) {
    return { ok: false, error: 'Enter a number from 0.00 to 99.99 with up to 2 decimals.' };
  }
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));
  return { ok: true, value: whole * 100 + fraction };
}
