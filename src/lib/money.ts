import { env } from '../config/env';

/*
 * Virtual coin amounts travel as integers in the smallest unit ("minor units").
 * Formatting and parsing use BigInt string arithmetic, never floating point.
 * Client-side parsing exists only for form feedback; the server re-validates every stake.
 */

/** Display helper. Never throws during render: an invalid amount shows as a dash. */
export function formatCoins(minorUnits: number, decimals: number = env.coinDecimals): string {
  if (!Number.isSafeInteger(minorUnits)) return '—';
  const negative = minorUnits < 0;
  const absolute = BigInt(Math.abs(minorUnits));
  const base = 10n ** BigInt(decimals);
  const whole = (absolute / base).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = decimals > 0 ? `.${(absolute % base).toString().padStart(decimals, '0')}` : '';
  return `${negative ? '-' : ''}${whole}${fraction}`;
}

export function formatSignedCoins(minorUnits: number, decimals: number = env.coinDecimals): string {
  const formatted = formatCoins(minorUnits, decimals);
  return minorUnits > 0 ? `+${formatted}` : formatted;
}

/** Formats an amount for an input field: no thousands separators. */
export function toCoinInput(minorUnits: number, decimals: number = env.coinDecimals): string {
  return formatCoins(minorUnits, decimals).replaceAll(',', '');
}

export type ParseCoinsResult = { ok: true; value: number } | { ok: false; error: string };

export function parseCoins(input: string, decimals: number = env.coinDecimals): ParseCoinsResult {
  const trimmed = input.trim();
  if (trimmed === '') return { ok: false, error: 'Enter an amount.' };

  const pattern =
    decimals > 0 ? new RegExp(`^(\\d{1,15})(?:\\.(\\d{1,${decimals}}))?$`) : /^(\d{1,15})$/;
  const match = pattern.exec(trimmed);
  if (!match) {
    return {
      ok: false,
      error:
        decimals > 0
          ? `Enter a positive number with up to ${decimals} decimal places.`
          : 'Enter a whole number.',
    };
  }

  const whole = match[1] ?? '0';
  const fraction = (match[2] ?? '').padEnd(decimals, '0');
  const value = BigInt(whole) * 10n ** BigInt(decimals) + (fraction ? BigInt(fraction) : 0n);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    return { ok: false, error: 'That amount is too large.' };
  }
  return { ok: true, value: Number(value) };
}
