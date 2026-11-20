import { formatCoins } from '../../lib/money';

/*
 * Stake checks shared by the game pages. They exist only for instant form feedback;
 * the server re-validates every stake against its own limits and the real balance.
 */

export interface StakeLimits {
  minStake?: number;
  maxStake?: number;
}

export function stakeProblem(
  stake: number,
  limits: StakeLimits | undefined,
  balance: number | undefined,
): string | null {
  if (stake <= 0) return 'Enter an amount above zero.';
  if (limits?.minStake !== undefined && stake < limits.minStake) {
    return `Minimum stake is ${formatCoins(limits.minStake)} VC.`;
  }
  if (limits?.maxStake !== undefined && stake > limits.maxStake) {
    return `Maximum stake is ${formatCoins(limits.maxStake)} VC.`;
  }
  if (balance !== undefined && stake > balance) return 'Not enough virtual coins for this stake.';
  return null;
}

/** Halves or doubles a stake, clamped to the limits. Returns null if the result is unusable. */
export function adjustedStake(
  stake: number,
  change: 'half' | 'double',
  limits: StakeLimits | undefined,
): number | null {
  let next = change === 'half' ? Math.floor(stake / 2) : stake * 2;
  if (limits?.minStake !== undefined) next = Math.max(next, limits.minStake);
  if (limits?.maxStake !== undefined) next = Math.min(next, limits.maxStake);
  return Number.isSafeInteger(next) ? next : null;
}

/** "0.10 – 1,000.00 VC" once the server's limits are known. */
export function limitsHint(limits: StakeLimits | undefined): string | undefined {
  if (limits?.minStake === undefined || limits.maxStake === undefined) return undefined;
  return `${formatCoins(limits.minStake)} – ${formatCoins(limits.maxStake)} VC`;
}
