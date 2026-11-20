import { useCallback, useEffect } from 'react';
import { listHistory } from '../../api/games';
import type { GameId } from '../../api/types';
import { useApiQuery } from '../../hooks/useApiQuery';

const LIMIT = 20;

/** The latest rounds of one game. Reloads in the background whenever `version` changes. */
export function useRecentRounds(game: GameId, version: number) {
  const load = useCallback((signal: AbortSignal) => listHistory(LIMIT, signal, game), [game]);
  const history = useApiQuery(load, { keepPreviousData: true });
  const { retry } = history;

  useEffect(() => {
    if (version > 0) retry();
  }, [version, retry]);

  return history;
}
