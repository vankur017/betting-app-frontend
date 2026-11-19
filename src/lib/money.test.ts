import { describe, expect, it } from 'vitest';
import { formatCoins, formatSignedCoins, parseCoins, toCoinInput } from './money';

describe('formatCoins', () => {
  it('formats minor units with grouping and fixed decimals', () => {
    expect(formatCoins(123456, 2)).toBe('1,234.56');
    expect(formatCoins(5, 2)).toBe('0.05');
    expect(formatCoins(-5, 2)).toBe('-0.05');
    expect(formatCoins(1000, 0)).toBe('1,000');
  });

  it('shows a dash instead of throwing for invalid amounts', () => {
    expect(formatCoins(1.5, 2)).toBe('—');
    expect(formatCoins(Number.NaN, 2)).toBe('—');
    expect(formatSignedCoins(Number.NaN, 2)).toBe('—');
  });

  it('formats input values without separators', () => {
    expect(toCoinInput(123456, 2)).toBe('1234.56');
  });

  it('adds a plus sign to credits only', () => {
    expect(formatSignedCoins(250, 2)).toBe('+2.50');
    expect(formatSignedCoins(-250, 2)).toBe('-2.50');
    expect(formatSignedCoins(0, 2)).toBe('0.00');
  });
});

describe('parseCoins', () => {
  it('parses into integer minor units without floating point', () => {
    expect(parseCoins('1.5', 2)).toEqual({ ok: true, value: 150 });
    expect(parseCoins('0.07', 2)).toEqual({ ok: true, value: 7 });
    expect(parseCoins(' 42 ', 2)).toEqual({ ok: true, value: 4200 });
  });

  it('rejects empty, negative, malformed, and over-precise input', () => {
    for (const input of ['', '-1', 'abc', '1.234', '1e3', '1,000']) {
      expect(parseCoins(input, 2).ok).toBe(false);
    }
  });

  it('rejects decimals when the currency has none', () => {
    expect(parseCoins('1.5', 0).ok).toBe(false);
    expect(parseCoins('15', 0)).toEqual({ ok: true, value: 15 });
  });
});
