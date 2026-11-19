/*
 * Display-only mirror of backend/src/games/crash/crash.rules.js. The server alone decides
 * the crash point and every cash-out multiplier; these helpers only draw the curve.
 */

/** Multiplier in hundredths after `elapsedMs`, floored to 0.01x. */
export function multiplierAt(elapsedMs: number, growthPerMs: number): number {
  if (elapsedMs <= 0) return 100;
  return Math.max(100, Math.floor(100 * Math.exp(growthPerMs * elapsedMs)));
}

/** Elapsed milliseconds at which the curve reaches `x100`. */
export function elapsedForMultiplier(x100: number, growthPerMs: number): number {
  if (x100 <= 100 || growthPerMs <= 0) return 0;
  return Math.log(x100 / 100) / growthPerMs;
}

export function formatMultiplier(x100: number): string {
  if (!Number.isSafeInteger(x100) || x100 < 0) return '—';
  return `${Math.floor(x100 / 100)}.${String(x100 % 100).padStart(2, '0')}x`;
}
