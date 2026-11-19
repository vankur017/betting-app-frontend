import { apiRequest } from './http';
import type { GameSummary, HistoryItem } from './types';

export function listGames(signal?: AbortSignal): Promise<GameSummary[]> {
  return apiRequest<GameSummary[]>('/api/games', { signal });
}

/** Recent rounds across all games, newest first. `limit` is 1-100. */
export function listHistory(limit: number, signal?: AbortSignal): Promise<HistoryItem[]> {
  return apiRequest<HistoryItem[]>('/api/history', { query: { limit }, signal });
}
