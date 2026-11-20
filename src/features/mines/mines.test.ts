import { describe, expect, it } from 'vitest';
import type { MinesEndedRound, MinesRunningRound } from '../../api/types';
import { readDetailRound, readDetailRoundId } from '../../lib/errors';
import { DEFAULT_MINES_SETTINGS, readMinesSettings, tilePosition, tileView } from '../../lib/mines';

const base = {
  roundId: 'm1',
  game: 'mines' as const,
  stake: 1000,
  configVersion: 1,
  gridSize: 5,
  tileCount: 25,
  mineCount: 3,
  startedAt: '2026-11-20T00:00:00.000Z',
};

const running: MinesRunningRound = {
  ...base,
  status: 'RUNNING',
  revealedTiles: [5, 6],
  safeReveals: 2,
  currentMultiplierX100: 128,
  nextMultiplierX100: 147,
  potentialReturn: 1280,
};

const busted: MinesEndedRound = {
  ...base,
  status: 'BUSTED',
  revealedTiles: [5],
  safeReveals: 1,
  currentMultiplierX100: 112,
  minePositions: [0, 1, 2],
  hitMine: 1,
  cashoutMultiplierX100: null,
  virtualReturn: 0,
  outcomeSummary: 'Hit a mine after 1 safe tiles',
  completedAt: '2026-11-20T00:00:05.000Z',
};

describe('readMinesSettings', () => {
  it('accepts the server settings', () => {
    expect(readMinesSettings(DEFAULT_MINES_SETTINGS)).toEqual(DEFAULT_MINES_SETTINGS);
  });

  it('rejects inconsistent settings', () => {
    expect(readMinesSettings('x')).toBeNull();
    expect(readMinesSettings({ ...DEFAULT_MINES_SETTINGS, tileCount: 24 })).toBeNull();
    expect(readMinesSettings({ ...DEFAULT_MINES_SETTINGS, maxMines: 25 })).toBeNull();
    expect(readMinesSettings({ ...DEFAULT_MINES_SETTINGS, minMines: 0 })).toBeNull();
  });
});

describe('tileView', () => {
  it('shows every tile hidden before a round', () => {
    expect(tileView(null, 3)).toBe('hidden');
  });

  it('shows only revealed safe tiles while running: mines stay secret', () => {
    expect(tileView(running, 5)).toBe('safe');
    expect(tileView(running, 7)).toBe('hidden');
    expect(tileView(running, 0)).toBe('hidden');
  });

  it('shows the whole board once the round ends', () => {
    expect(tileView(busted, 1)).toBe('hit');
    expect(tileView(busted, 0)).toBe('mine');
    expect(tileView(busted, 5)).toBe('safe');
    expect(tileView(busted, 9)).toBe('unpicked');
  });

  it('numbers tiles row by row', () => {
    expect(tilePosition(0, 5)).toEqual({ row: 1, column: 1 });
    expect(tilePosition(7, 5)).toEqual({ row: 2, column: 3 });
    expect(tilePosition(24, 5)).toEqual({ row: 5, column: 5 });
  });
});

describe('error detail readers', () => {
  it('reads the round id', () => {
    expect(readDetailRoundId({ roundId: 'abc' })).toBe('abc');
    expect(readDetailRoundId(null)).toBeNull();
    expect(readDetailRoundId({ roundId: 5 })).toBeNull();
  });

  it('reads a round only when it belongs to the expected game', () => {
    expect(readDetailRound<MinesEndedRound>({ round: busted }, 'mines')).toEqual(busted);
    expect(readDetailRound<MinesEndedRound>({ round: { ...busted, game: 'dice' } }, 'mines')).toBeNull();
    expect(readDetailRound<MinesEndedRound>('x', 'mines')).toBeNull();
  });
});
