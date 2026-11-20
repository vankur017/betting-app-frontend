import type { PlinkoRisk, PlinkoSettings } from '../api/types';

/*
 * Display-only Plinko helpers. The server alone picks the path, the bucket and the return;
 * these functions only read its settings and replay its path on screen.
 */

export const PLINKO_RISKS: readonly PlinkoRisk[] = ['low', 'medium', 'high'];

/** Animation time per row of pegs (plus one for the first fall). 8 rows ≈ 1.4 s, 16 rows ≈ 2.7 s. */
export const STEP_MS = 160;

export function dropDurationMs(rows: number): number {
  return STEP_MS * (rows + 1);
}

/** Short multiplier label for a bucket: 6100 -> "61x", 50 -> "0.5x", 141 -> "1.41x". */
export function compactMultiplier(x100: number): string {
  if (!Number.isSafeInteger(x100) || x100 < 0) return '—';
  const whole = Math.floor(x100 / 100);
  const fraction = x100 % 100;
  if (fraction === 0) return `${whole}x`;
  if (fraction % 10 === 0) return `${whole}.${fraction / 10}x`;
  return `${whole}.${String(fraction).padStart(2, '0')}x`;
}

export type BucketTone = 'below' | 'low' | 'mid' | 'high';

/** Colour band for a bucket: below 1x, 1x-2x, 2x-10x, 10x and up. */
export function bucketTone(x100: number): BucketTone {
  if (x100 < 100) return 'below';
  if (x100 < 200) return 'low';
  if (x100 < 1000) return 'mid';
  return 'high';
}

function isRisk(value: unknown): value is PlinkoRisk {
  return typeof value === 'string' && (PLINKO_RISKS as readonly string[]).includes(value);
}

function isMultiplierTable(value: unknown, rows: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === rows + 1 &&
    value.every((m) => Number.isSafeInteger(m) && m >= 0)
  );
}

/**
 * Reads plinko.settings from GET /api/games. Returns null if anything is missing or malformed,
 * so the page can refuse to play rather than draw a board that does not match the server.
 */
export function readPlinkoSettings(value: unknown): PlinkoSettings | null {
  if (typeof value !== 'object' || value === null) return null;
  const { rows, risks, multipliersX100 } = value as Record<string, unknown>;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  if (!rows.every((r) => Number.isSafeInteger(r) && r > 0 && r <= 32)) return null;
  if (!Array.isArray(risks) || risks.length === 0 || !risks.every(isRisk)) return null;
  if (typeof multipliersX100 !== 'object' || multipliersX100 === null) return null;

  const tables = multipliersX100 as Record<string, unknown>;
  for (const r of rows as number[]) {
    const byRisk = tables[String(r)];
    if (typeof byRisk !== 'object' || byRisk === null) return null;
    for (const risk of risks) {
      if (!isMultiplierTable((byRisk as Record<string, unknown>)[risk], r)) return null;
    }
  }
  return value as PlinkoSettings;
}

export function multiplierTable(
  settings: PlinkoSettings,
  rows: number,
  risk: PlinkoRisk,
): number[] | null {
  return settings.multipliersX100[String(rows)]?.[risk] ?? null;
}

/** True when `path` is a valid replay of `bucket` on a board with `rows` rows. */
export function isConsistentPath(path: unknown, rows: number, bucket: number): path is number[] {
  return (
    Array.isArray(path) &&
    path.length === rows &&
    path.every((step) => step === 0 || step === 1) &&
    path.reduce((sum: number, step: number) => sum + step, 0) === bucket
  );
}

/*
 * Board geometry in board units. `offset` is horizontal, in peg spacings from the centre;
 * `level` is vertical, in rows: peg row i sits at level i, the drop point at level -1 and the
 * buckets at level `rows`. Peg row i has i + 3 pegs at offsets (p - (i + 2) / 2).
 */
export interface BoardPoint {
  offset: number;
  level: number;
}

/** How far above a peg's centre the ball's centre is when it touches it, in rows. */
const CONTACT = 0.35;
/** Height of each bounce off a peg, in rows. */
const HOP = 0.3;

/** Points the ball passes through: drop point, the top of one peg per row, then its bucket. */
export function pathWaypoints(path: readonly number[]): BoardPoint[] {
  const points: BoardPoint[] = [{ offset: 0, level: -1 }];
  let rights = 0;
  path.forEach((step, row) => {
    points.push({ offset: rights - row / 2, level: row - CONTACT });
    rights += step;
  });
  points.push({ offset: rights - path.length / 2, level: path.length });
  return points;
}

/**
 * Ball position at `progress` (0 = dropped, 1 = in its bucket). `bounce` adds a small hop off
 * each peg; turn it off under reduced motion so the ball still falls, just without bouncing.
 */
export function ballAt(path: readonly number[], progress: number, bounce = true): BoardPoint {
  const points = pathWaypoints(path);
  const segments = points.length - 1;
  const clamped = Math.min(1, Math.max(0, progress));
  const segment = Math.min(segments - 1, Math.floor(clamped * segments));
  const t = clamped * segments - segment;
  const from = points[segment];
  const to = points[segment + 1];

  // Sideways push eases out after each peg; height falls under gravity with a small hop.
  const sideways = 1 - (1 - t) * (1 - t);
  const hop = !bounce || segment === 0 ? 0 : HOP * 4 * t * (1 - t);
  return {
    offset: from.offset + (to.offset - from.offset) * sideways,
    level: from.level + (to.level - from.level) * t * t - hop,
  };
}

/** Horizontal offset of bucket `index` on a board with `rows` rows. */
export function bucketOffset(index: number, rows: number): number {
  return index - rows / 2;
}
