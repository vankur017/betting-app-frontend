import { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listHistory } from '../../api/games';
import type { GameId, HistoryItem } from '../../api/types';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useApiQuery } from '../../hooks/useApiQuery';
import { cx } from '../../lib/cx';
import { formatDateTime, humanize } from '../../lib/format';
import { formatCoins, formatSignedCoins } from '../../lib/money';

const LIMIT = 10;
const WIN_STATUSES = ['CASHED_OUT', 'WON'];
const LOSS_STATUSES = ['CRASHED', 'BUSTED', 'LOST'];

/** Green for a win, red for a loss. SETTLED rounds (Plinko) are judged by their net result. */
function outcomeClass(round: HistoryItem, net: number | null): string | false {
  if (WIN_STATUSES.includes(round.status)) return 'text-mint-300';
  if (LOSS_STATUSES.includes(round.status)) return 'text-rose-300';
  if (net === null || net === 0) return false;
  return net > 0 ? 'text-mint-300' : 'text-rose-300';
}

/** The latest rounds of one game. Reloads whenever `version` changes (after each round ends). */
export function RecentRounds({ game, version }: { game: GameId; version: number }) {
  const load = useCallback((signal: AbortSignal) => listHistory(LIMIT, signal, game), [game]);
  const history = useApiQuery(load);
  const { retry } = history;

  useEffect(() => {
    if (version > 0) retry();
  }, [version, retry]);

  return (
    <section
      aria-labelledby="recent-rounds-heading"
      className="panel p-5"
    >
      <h2 id="recent-rounds-heading" className="text-lg font-semibold">
        Recent rounds
      </h2>
      <div className="mt-3">
        {history.status === 'loading' ? (
          <LoadingState label="Loading rounds" />
        ) : history.status === 'error' ? (
          <ErrorState message={history.error} onRetry={retry} />
        ) : history.data.length === 0 ? (
          <p className="py-6 text-sm text-night-300">No rounds yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {history.data.map((round) => {
              const net = round.virtualReturn === null ? null : round.virtualReturn - round.stake;
              return (
                <li
                  key={round.roundId}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <div>
                    <p className={cx('font-medium', outcomeClass(round, net))}>
                      {round.outcomeSummary ?? humanize(round.status)}
                    </p>
                    <p className="text-xs text-night-300">{formatDateTime(round.startedAt)}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-semibold">{net === null ? '—' : formatSignedCoins(net)}</p>
                    <p className="text-xs text-night-300">Stake {formatCoins(round.stake)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Link
        to="/history"
        className="mt-3 inline-block text-sm font-semibold text-mint-300 hover:text-mint-400"
      >
        Full history
      </Link>
    </section>
  );
}
