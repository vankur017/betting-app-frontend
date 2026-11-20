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

const MULTIPLIER_STEPS = [
  10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000,
];

/**
 * Graph gridlines for multipliers up to `maxX100`: 1.00x plus round values (1.5x, 2x, 5x, …),
 * at most `maxTicks` above 1.00x.
 */
export function multiplierTicks(maxX100: number, maxTicks = 4): number[] {
  const range = Math.max(1, maxX100 - 100);
  const step =
    MULTIPLIER_STEPS.find((s) => range / s <= maxTicks) ??
    MULTIPLIER_STEPS[MULTIPLIER_STEPS.length - 1];
  const ticks = [100];
  for (let tick = Math.ceil(101 / step) * step; tick <= maxX100; tick += step) ticks.push(tick);
  return ticks;
}

const TIME_STEPS_MS = [1000, 2000, 5000, 10000, 15000, 20000, 30000, 60000, 120000];

/** Graph time labels (milliseconds) up to `maxMs`, at most `maxTicks` of them. */
export function timeTicks(maxMs: number, maxTicks = 5): number[] {
  const step =
    TIME_STEPS_MS.find((s) => maxMs / s <= maxTicks) ?? TIME_STEPS_MS[TIME_STEPS_MS.length - 1];
  const ticks: number[] = [];
  for (let tick = step; tick <= maxMs; tick += step) ticks.push(tick);
  return ticks;
}
