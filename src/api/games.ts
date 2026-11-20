import { apiRequest } from './http';
import type { GameId, GameSummary, HistoryItem } from './types';

export function listGames(signal?: AbortSignal): Promise<GameSummary[]> {
  return apiRequest<GameSummary[]>('/api/games', { signal });
}

/** Recent rounds, newest first. `limit` is 1-100. Pass `game` to get only that game's rounds. */
export function listHistory(
  limit: number,
  signal?: AbortSignal,
  game?: GameId,
): Promise<HistoryItem[]> {
  return apiRequest<HistoryItem[]>('/api/history', { query: { limit, game }, signal });
}
