import { describe, expect, it } from 'vitest';
import type { PlinkoRound } from '../../api/types';
import {
  ballAt,
  bucketOffset,
  bucketTone,
  compactMultiplier,
  dropDurationMs,
  isConsistentPath,
  multiplierTable,
  pathWaypoints,
  readPlinkoSettings,
} from '../../lib/plinko';
import { adjustedStake, stakeProblem } from '../games/stake';
import {
  createPlinkoVisualState,
  dropProgress,
  setBoard,
  settleDrops,
  startDrop,
} from './plinkoVisualState';

const TABLE_8_LOW = [360, 230, 141, 85, 50, 85, 141, 230, 360];
const settingsPayload = {
  rows: [8],
  risks: ['low', 'medium', 'high'],
  multipliersX100: {
    8: {
      low: TABLE_8_LOW,
      medium: [620, 300, 146, 74, 40, 74, 146, 300, 620],
      high: [1260, 430, 151, 54, 20, 54, 151, 430, 1260],
    },
  },
};

function round(overrides: Partial<PlinkoRound> = {}): PlinkoRound {
  return {
    roundId: 'r1',
    game: 'plinko',
    status: 'SETTLED',
    stake: 1000,
    configVersion: 1,
    rows: 8,
    risk: 'low',
    path: [1, 1, 1, 1, 0, 0, 0, 0],
    bucket: 4,
    multiplierX100: 50,
    virtualReturn: 500,
    outcomeSummary: 'Landed in bucket 5 of 9 at 0.50x',
    startedAt: '2026-11-20T00:00:00.000Z',
    completedAt: '2026-11-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('plinko labels and tones', () => {
  it('formats compact bucket labels', () => {
    expect(compactMultiplier(6100)).toBe('61x');
    expect(compactMultiplier(50)).toBe('0.5x');
    expect(compactMultiplier(141)).toBe('1.41x');
    expect(compactMultiplier(103)).toBe('1.03x');
    expect(compactMultiplier(1.5)).toBe('—');
  });

  it('bands multipliers by size', () => {
    expect(bucketTone(50)).toBe('below');
    expect(bucketTone(100)).toBe('low');
    expect(bucketTone(360)).toBe('mid');
    expect(bucketTone(1260)).toBe('high');
  });
});

describe('readPlinkoSettings', () => {
  it('accepts the server settings and finds tables', () => {
    const settings = readPlinkoSettings(settingsPayload);
    expect(settings).not.toBeNull();
    expect(multiplierTable(settings!, 8, 'low')).toEqual(TABLE_8_LOW);
    expect(multiplierTable(settings!, 12, 'low')).toBeNull();
  });

  it('rejects missing or malformed settings', () => {
    expect(readPlinkoSettings(undefined)).toBeNull();
    expect(readPlinkoSettings({ ...settingsPayload, rows: [] })).toBeNull();
    expect(readPlinkoSettings({ ...settingsPayload, risks: ['extreme'] })).toBeNull();
    expect(
      readPlinkoSettings({
        ...settingsPayload,
        multipliersX100: { 8: { ...settingsPayload.multipliersX100[8], low: [100, 200] } },
      }),
    ).toBeNull();
    expect(readPlinkoSettings({ ...settingsPayload, rows: [8, 12] })).toBeNull();
  });
});

describe('ball path geometry', () => {
  it('checks that a path replays its bucket', () => {
    expect(isConsistentPath([1, 0, 1, 1, 0, 0, 0, 1], 8, 4)).toBe(true);
    expect(isConsistentPath([1, 0, 1], 8, 2)).toBe(false);
    expect(isConsistentPath([1, 0, 1, 1, 0, 0, 0, 2], 8, 5)).toBe(false);
    expect(isConsistentPath([1, 1, 1, 1, 1, 1, 1, 1], 8, 4)).toBe(false);
  });

  it('starts above the centre and ends in the bucket centre', () => {
    const path = [1, 1, 1, 1, 1, 1, 1, 1];
    expect(ballAt(path, 0)).toEqual({ offset: 0, level: -1 });
    const end = ballAt(path, 1);
    expect(end.offset).toBeCloseTo(bucketOffset(8, 8));
    expect(end.level).toBeCloseTo(8);
    expect(ballAt([0, 0, 0, 0], 1).offset).toBeCloseTo(bucketOffset(0, 4));
  });

  it('touches one peg per row, moving half a spacing each time', () => {
    const points = pathWaypoints([1, 0, 1]);
    expect(points.map((p) => p.offset)).toEqual([0, 0, 0.5, 0, 0.5]);
    expect(points).toHaveLength(5);
  });

  it('removes the bounce but keeps the fall when asked', () => {
    const path = [1, 0, 1, 1];
    const bouncy = ballAt(path, 0.3, true);
    const flat = ballAt(path, 0.3, false);
    expect(flat.offset).toBeCloseTo(bouncy.offset);
    expect(flat.level).toBeGreaterThan(bouncy.level);
  });

  it('times the drop by the number of rows', () => {
    expect(dropDurationMs(8)).toBe(1440);
    expect(dropDurationMs(16)).toBe(2720);
  });
});

describe('plinko visual state', () => {
  it('keeps balls and the last landing until the board changes', () => {
    const visual = createPlinkoVisualState(false, 8);
    setBoard(visual, 8, TABLE_8_LOW);
    startDrop(visual, round(), TABLE_8_LOW, 1000);
    setBoard(visual, 8, TABLE_8_LOW);
    expect(visual.drops).toHaveLength(1);
    setBoard(visual, 8, [620, 300, 146, 74, 40, 74, 146, 300, 620]);
    expect(visual.drops).toHaveLength(0);
    expect(visual.lastLanding).toBeNull();
  });

  it('animates normally and lands at the end', () => {
    const visual = createPlinkoVisualState(false, 8);
    const duration = startDrop(visual, round(), TABLE_8_LOW, 1000);
    expect(duration).toBe(dropDurationMs(8));
    const drop = visual.drops[0];
    expect(dropProgress(drop, 1000)).toBe(0);
    expect(dropProgress(drop, 1000 + duration / 2)).toBeCloseTo(0.5);
    expect(dropProgress(drop, 1000 + duration + 50)).toBe(1);
  });

  it('keeps several balls in flight and remembers the latest landing', () => {
    const visual = createPlinkoVisualState(false, 8);
    const duration = startDrop(visual, round({ roundId: 'a', bucket: 4 }), TABLE_8_LOW, 0);
    startDrop(visual, round({ roundId: 'b', path: [1, 1, 1, 1, 1, 0, 0, 0], bucket: 5 }), TABLE_8_LOW, 300);
    expect(visual.drops).toHaveLength(2);

    settleDrops(visual, duration + 10);
    expect(visual.drops.map((d) => d.roundId)).toEqual(['b']);
    expect(visual.lastLanding).toEqual({ roundId: 'a', bucket: 4, at: duration });

    settleDrops(visual, duration + 400);
    expect(visual.drops).toHaveLength(0);
    expect(visual.lastLanding?.roundId).toBe('b');
  });

  it('still animates the fall under reduced motion', () => {
    const visual = createPlinkoVisualState(true, 8);
    expect(startDrop(visual, round(), TABLE_8_LOW, 0)).toBe(dropDurationMs(8));
    expect(dropProgress(visual.drops[0], 0)).toBe(0);
  });

  it('skips the animation only when the path is unusable', () => {
    const bad = createPlinkoVisualState(false, 8);
    expect(startDrop(bad, round({ path: [1, 1] }), TABLE_8_LOW, 0)).toBe(0);
    expect(bad.drops[0].bucket).toBe(4);
    expect(bad.drops[0].path).toEqual([]);
  });
});

describe('shared stake helpers', () => {
  const limits = { minStake: 10, maxStake: 100000 };

  it('reports the first stake problem', () => {
    expect(stakeProblem(0, limits, 5000)).toBe('Enter an amount above zero.');
    expect(stakeProblem(5, limits, 5000)).toMatch(/Minimum stake/);
    expect(stakeProblem(100001, limits, 500000)).toMatch(/Maximum stake/);
    expect(stakeProblem(6000, limits, 5000)).toMatch(/Not enough/);
    expect(stakeProblem(1000, limits, 5000)).toBeNull();
  });

  it('halves and doubles within the limits', () => {
    expect(adjustedStake(1000, 'half', limits)).toBe(500);
    expect(adjustedStake(15, 'half', limits)).toBe(10);
    expect(adjustedStake(80000, 'double', limits)).toBe(100000);
  });
});
