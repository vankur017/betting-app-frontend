import { apiRequest } from './http';
import type {
  MinesActiveResult,
  MinesCashoutResult,
  MinesRevealResult,
  MinesRoundResult,
} from './types';

/** Debits the stake and hides the mines. Reuse the same key when retrying after a network error. */
export function startMines(
  stake: number,
  mineCount: number,
  idempotencyKey: string,
): Promise<MinesRoundResult> {
  return apiRequest<MinesRoundResult>('/api/games/mines/start', {
    method: 'POST',
    body: { stake, mineCount },
    idempotencyKey,
  });
}

/** Safe to retry: revealing an already revealed safe tile changes nothing. */
export function revealMinesTile(roundId: string, tile: number): Promise<MinesRevealResult> {
  return apiRequest<MinesRevealResult>('/api/games/mines/reveal', {
    method: 'POST',
    body: { roundId, tile },
  });
}

/** Settles at the current multiplier. Safe to retry: a repeat credits nothing. */
export function cashOutMines(roundId: string): Promise<MinesCashoutResult> {
  return apiRequest<MinesCashoutResult>('/api/games/mines/cashout', {
    method: 'POST',
    body: { roundId },
  });
}

/** The running round, or null. Used to resume after a page refresh. */
export function getActiveMinesRound(signal?: AbortSignal): Promise<MinesActiveResult> {
  return apiRequest<MinesActiveResult>('/api/games/mines/active', { signal });
}

export function getMinesRound(roundId: string, signal?: AbortSignal): Promise<MinesRoundResult> {
  return apiRequest<MinesRoundResult>(`/api/games/mines/rounds/${encodeURIComponent(roundId)}`, {
    signal,
  });
}
