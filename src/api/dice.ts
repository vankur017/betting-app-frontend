import { apiRequest } from './http';
import type { DiceDirection, DiceRoundResult } from './types';

/**
 * Debits the stake, rolls on the server and settles in one request. `target` is in hundredths.
 * Reuse the same key when retrying the same roll after a network error.
 */
export function rollDice(
  stake: number,
  target: number,
  direction: DiceDirection,
  idempotencyKey: string,
): Promise<DiceRoundResult> {
  return apiRequest<DiceRoundResult>('/api/games/dice/roll', {
    method: 'POST',
    body: { stake, target, direction },
    idempotencyKey,
  });
}

export function getDiceRound(roundId: string, signal?: AbortSignal): Promise<DiceRoundResult> {
  return apiRequest<DiceRoundResult>(`/api/games/dice/rounds/${encodeURIComponent(roundId)}`, {
    signal,
  });
}
