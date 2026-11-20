import { ApiError } from '../api/http';

export function messageOf(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return error instanceof ApiError ? error.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Reads details.roundId from errors such as ROUND_IN_PROGRESS. */
export function readDetailRoundId(details: unknown): string | null {
  if (!isRecord(details)) return null;
  return typeof details.roundId === 'string' ? details.roundId : null;
}

/** Reads details.round from errors such as ROUND_BUSTED, if it is a round of `game`. */
export function readDetailRound<T extends { roundId: string; game: string }>(
  details: unknown,
  game: T['game'],
): T | null {
  if (!isRecord(details) || !isRecord(details.round)) return null;
  const round = details.round;
  return typeof round.roundId === 'string' && round.game === game ? (round as unknown as T) : null;
}
