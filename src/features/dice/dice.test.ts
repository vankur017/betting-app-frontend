import { describe, expect, it } from 'vitest';
import type { DiceRound } from '../../api/types';
import {
  clampTarget,
  diceMultiplierX100,
  flipTarget,
  formatChance,
  formatRoll,
  parseTarget,
  payoutFor,
  readDiceSettings,
  targetRange,
  winCount,
} from '../../lib/dice';
import {
  createDiceVisualState,
  markerValue,
  ROLL_MS,
  rollProgress,
  setBet,
  startRoll,
} from './diceVisualState';

const SETTINGS = { rollSpan: 10000, minWinCount: 100, maxWinCount: 9800, houseEdgeBps: 100 };

function round(overrides: Partial<DiceRound> = {}): DiceRound {
  return {
    roundId: 'd1',
    game: 'dice',
    status: 'WON',
    stake: 1000,
    configVersion: 1,
    target: 5000,
    direction: 'under',
    winChanceBps: 5000,
    multiplierX100: 198,
    roll: 1234,
    won: true,
    virtualReturn: 1980,
    outcomeSummary: 'Rolled 12.34 (under 50.00): won at 1.98x',
    startedAt: '2026-11-20T00:00:00.000Z',
    completedAt: '2026-11-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('readDiceSettings', () => {
  it('accepts the server settings', () => {
    expect(readDiceSettings(SETTINGS)).toEqual(SETTINGS);
  });

  it('rejects missing or inconsistent settings', () => {
    expect(readDiceSettings(null)).toBeNull();
    expect(readDiceSettings({ ...SETTINGS, maxWinCount: 10000 })).toBeNull();
    expect(readDiceSettings({ ...SETTINGS, minWinCount: 9900 })).toBeNull();
    expect(readDiceSettings({ ...SETTINGS, houseEdgeBps: 1.5 })).toBeNull();
    expect(readDiceSettings({ ...SETTINGS, rollSpan: undefined })).toBeNull();
  });
});

describe('dice bet maths (mirrors the backend)', () => {
  it('counts winning rolls and target ranges for both directions', () => {
    expect(winCount(5000, 'under', SETTINGS)).toBe(5000);
    expect(winCount(4999, 'over', SETTINGS)).toBe(5000);
    expect(targetRange('under', SETTINGS)).toEqual({ minTarget: 100, maxTarget: 9800 });
    expect(targetRange('over', SETTINGS)).toEqual({ minTarget: 199, maxTarget: 9899 });
  });

  it('clamps targets and flips direction without changing the win chance', () => {
    expect(clampTarget(50, 'under', SETTINGS)).toBe(100);
    expect(clampTarget(9999, 'over', SETTINGS)).toBe(9899);
    expect(flipTarget(5000, SETTINGS)).toBe(4999);
    expect(flipTarget(100, SETTINGS)).toBe(9899);
    expect(winCount(flipTarget(2500, SETTINGS), 'over', SETTINGS)).toBe(2500);
  });

  it('prices bets like the server', () => {
    expect(diceMultiplierX100(5000, SETTINGS)).toBe(198);
    expect(diceMultiplierX100(100, SETTINGS)).toBe(9900);
    expect(diceMultiplierX100(9800, SETTINGS)).toBe(101);
    expect(payoutFor(1000, 198)).toBe(1980);
    expect(payoutFor(15, 103)).toBe(15);
  });

  it('formats rolls and win chances', () => {
    expect(formatRoll(507)).toBe('5.07');
    expect(formatRoll(9999)).toBe('99.99');
    expect(formatRoll(-1)).toBe('—');
    expect(formatChance(5000, SETTINGS)).toBe('50.00%');
    expect(formatChance(100, SETTINGS)).toBe('1.00%');
  });
});

describe('parseTarget', () => {
  it('reads typed targets into hundredths', () => {
    expect(parseTarget('50')).toEqual({ ok: true, value: 5000 });
    expect(parseTarget('50.5')).toEqual({ ok: true, value: 5050 });
    expect(parseTarget('5.07')).toEqual({ ok: true, value: 507 });
    expect(parseTarget(' 12.34 ')).toEqual({ ok: true, value: 1234 });
  });

  it('rejects anything else', () => {
    for (const input of ['', '100', '50.123', 'abc', '-5', '5,5']) {
      expect(parseTarget(input).ok).toBe(false);
    }
  });
});

describe('dice visual state', () => {
  it('slides from the middle of the track to the roll', () => {
    const visual = createDiceVisualState(false);
    const duration = startRoll(visual, round(), 1000);
    expect(duration).toBe(ROLL_MS);
    expect(visual.roll?.from).toBe(5000);
    expect(markerValue(visual.roll!, 0)).toBe(5000);
    expect(markerValue(visual.roll!, 1)).toBe(1234);
    expect(rollProgress(visual.roll!, 1000 + ROLL_MS)).toBe(1);
  });

  it('starts the next roll from the last one', () => {
    const visual = createDiceVisualState(false);
    startRoll(visual, round(), 0);
    startRoll(visual, round({ roundId: 'd2', roll: 8000, won: false, status: 'LOST' }), 5000);
    expect(visual.roll?.from).toBe(1234);
    expect(visual.roll?.to).toBe(8000);
  });

  it('jumps straight to the roll under reduced motion', () => {
    const visual = createDiceVisualState(true);
    expect(startRoll(visual, round(), 0)).toBe(0);
    expect(rollProgress(visual.roll!, 0)).toBe(1);
  });

  it('keeps the last roll until the bet changes', () => {
    const visual = createDiceVisualState(false);
    startRoll(visual, round(), 0);
    setBet(visual, 5000, 'under', 10000);
    expect(visual.roll).not.toBeNull();
    setBet(visual, 6000, 'under', 10000);
    expect(visual.roll).toBeNull();
  });
});
