import { apiRequest } from './http';
import type { CrashCashoutResult, CrashRoundResult } from './types';

/** Debits the stake. Reuse the same key when retrying the same start after a network error. */
export function startCrashRound(stake: number, idempotencyKey: string): Promise<CrashRoundResult> {
  return apiRequest<CrashRoundResult>('/api/games/crash/start', {
    method: 'POST',
    body: { stake },
    idempotencyKey,
  });
}

/** Settles at the server's current multiplier. Safe to retry: a repeat credits nothing. */
export function cashOutCrashRound(roundId: string): Promise<CrashCashoutResult> {
  return apiRequest<CrashCashoutResult>('/api/games/crash/cashout', {
    method: 'POST',
    body: { roundId },
  });
}

export function getCrashRound(roundId: string, signal?: AbortSignal): Promise<CrashRoundResult> {
  return apiRequest<CrashRoundResult>(`/api/games/crash/rounds/${encodeURIComponent(roundId)}`, {
    signal,
  });
}
