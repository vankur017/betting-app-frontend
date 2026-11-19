import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listHistory } from '../../api/games';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useApiQuery } from '../../hooks/useApiQuery';
import { cx } from '../../lib/cx';
import { formatDateTime, humanize } from '../../lib/format';
import { formatCoins, formatSignedCoins } from '../../lib/money';

const LIMIT = 10;
const loadRecent = (signal: AbortSignal) => listHistory(LIMIT, signal);

/** Recent Crash rounds. Reloads whenever `version` changes (after each round ends). */
export function CrashRecentRounds({ version }: { version: number }) {
  const history = useApiQuery(loadRecent);
  const { retry } = history;

  useEffect(() => {
    if (version > 0) retry();
  }, [version, retry]);

  return (
    <section
      aria-labelledby="recent-rounds-heading"
      className="rounded-2xl border border-night-800 bg-night-900 p-5"
    >
      <h2 id="recent-rounds-heading" className="text-lg font-semibold">
        Recent rounds
      </h2>
      <div className="mt-3">
        {history.status === 'loading' ? (
          <LoadingState label="Loading rounds" />
        ) : history.status === 'error' ? (
          <ErrorState message={history.error} onRetry={retry} />
        ) : (
          (() => {
            const rounds = history.data.filter((round) => round.game === 'crash');
            if (rounds.length === 0) {
              return <p className="py-6 text-sm text-night-300">No rounds yet.</p>;
            }
            return (
              <ul className="divide-y divide-night-800">
                {rounds.map((round) => {
                  const net = round.virtualReturn === null ? null : round.virtualReturn - round.stake;
                  return (
                    <li key={round.roundId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div>
                        <p
                          className={cx(
                            'font-medium',
                            round.status === 'CASHED_OUT' && 'text-mint-300',
                            round.status === 'CRASHED' && 'text-rose-300',
                          )}
                        >
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
            );
          })()
        )}
      </div>
      <Link to="/history" className="mt-3 inline-block text-sm font-semibold text-mint-300 hover:text-mint-400">
        Full history
      </Link>
    </section>
  );
}
