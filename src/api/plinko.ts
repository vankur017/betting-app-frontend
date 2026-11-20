import { apiRequest } from './http';
import type { PlinkoRisk, PlinkoRoundResult } from './types';

/**
 * Debits the stake, drops the ball on the server and settles in one request.
 * Reuse the same key when retrying the same drop after a network error.
 */
export function playPlinko(
  stake: number,
  rows: number,
  risk: PlinkoRisk,
  idempotencyKey: string,
): Promise<PlinkoRoundResult> {
  return apiRequest<PlinkoRoundResult>('/api/games/plinko/play', {
    method: 'POST',
    body: { stake, rows, risk },
    idempotencyKey,
  });
}

export function getPlinkoRound(roundId: string, signal?: AbortSignal): Promise<PlinkoRoundResult> {
  return apiRequest<PlinkoRoundResult>(`/api/games/plinko/rounds/${encodeURIComponent(roundId)}`, {
    signal,
  });
}
