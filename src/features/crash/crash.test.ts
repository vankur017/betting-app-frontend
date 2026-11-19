import { describe, expect, it } from 'vitest';
import type { CrashEndedRound, CrashRunningRound } from '../../api/types';
import { elapsedForMultiplier, formatMultiplier, multiplierAt } from '../../lib/crash';
import {
  createIdleVisualState,
  readCrashRound,
  readRoundId,
  syncVisualState,
} from './crashVisualState';

const GROWTH = 0.00006;
const base = {
  roundId: 'r1',
  game: 'crash' as const,
  stake: 1000,
  configVersion: 1,
  startedAt: '2026-11-20T00:00:00.000Z',
  serverTime: '2026-11-20T00:00:05.000Z',
  curve: { type: 'exponential' as const, growthPerMs: GROWTH },
};

describe('crash display math', () => {
  it('matches the backend multiplier curve', () => {
    expect(multiplierAt(0, GROWTH)).toBe(100);
    expect(multiplierAt(5000, GROWTH)).toBe(134);
    expect(multiplierAt(11552, GROWTH)).toBe(199);
    expect(multiplierAt(11553, GROWTH)).toBe(200);
  });

  it('inverts the curve', () => {
    expect(elapsedForMultiplier(100, GROWTH)).toBe(0);
    expect(elapsedForMultiplier(200, GROWTH)).toBeCloseTo(11552.45, 1);
  });

  it('formats multipliers with two decimals', () => {
    expect(formatMultiplier(100)).toBe('1.00x');
    expect(formatMultiplier(213)).toBe('2.13x');
    expect(formatMultiplier(1.5)).toBe('—');
  });
});

describe('syncVisualState', () => {
  it('anchors a running round to the local clock, allowing for half the round trip', () => {
    const visual = createIdleVisualState(false);
    const running: CrashRunningRound = { ...base, status: 'RUNNING', elapsedMs: 5000, currentMultiplierX100: 134 };
    syncVisualState(visual, running, { receivedAt: 20000, rttMs: 100 }, 99999);
    expect(visual.phase).toBe('running');
    expect(visual.localStartMs).toBe(20000 - 5050);
    expect(visual.polledElapsedMs).toBe(5050);
    expect(visual.crashX100).toBeNull();
  });

  it('reveals the crash point only once the round has ended', () => {
    const visual = createIdleVisualState(false);
    const ended: CrashEndedRound = {
      ...base,
      status: 'CASHED_OUT',
      crashMultiplierX100: 200,
      cashoutMultiplierX100: 134,
      virtualReturn: 1340,
      outcomeSummary: 'Cashed out at 1.34x',
      completedAt: '2026-11-20T00:00:05.000Z',
    };
    syncVisualState(visual, ended, undefined, 0);
    expect(visual.phase).toBe('cashed_out');
    expect(visual.crashX100).toBe(200);
    expect(visual.cashoutX100).toBe(134);
  });
});

describe('error detail readers', () => {
  it('reads the round id from ROUND_IN_PROGRESS details', () => {
    expect(readRoundId({ roundId: 'abc' })).toBe('abc');
    expect(readRoundId(undefined)).toBeNull();
    expect(readRoundId({ roundId: 5 })).toBeNull();
  });

  it('reads the round from ROUND_CRASHED details', () => {
    expect(readCrashRound({ round: { roundId: 'abc' } })).toEqual({ roundId: 'abc' });
    expect(readCrashRound({ round: null })).toBeNull();
    expect(readCrashRound('nope')).toBeNull();
  });
});
