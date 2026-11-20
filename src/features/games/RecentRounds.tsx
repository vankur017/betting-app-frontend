import { Link } from 'react-router-dom';
import type { HistoryItem } from '../../api/types';
import { ErrorState, LoadingState } from '../../components/ui/States';
import type { QueryState } from '../../hooks/useApiQuery';
import { cx } from '../../lib/cx';
import { formatDateTime, humanize } from '../../lib/format';
import { formatCoins, formatSignedCoins } from '../../lib/money';
import { CHIP_CLASSES, netOf, netTone, TEXT_CLASSES } from './resultTone';

const SHOWN = 8;

type HistoryState = QueryState<HistoryItem[]> & { retry: () => void };

/** The latest rounds of one game with their result, time, stake and net. */
export function RecentRounds({ history }: { history: HistoryState }) {
  return (
    <section aria-labelledby="recent-rounds-heading" className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recent-rounds-heading" className="text-lg font-semibold">
          Recent rounds
        </h2>
        <Link
          to="/history"
          className="text-sm font-semibold text-mint-300 transition hover:text-mint-400"
        >
          Full history →
        </Link>
      </div>
      <div className="mt-3">
        {history.status === 'loading' ? (
          <LoadingState label="Loading rounds" />
        ) : history.status === 'error' ? (
          <ErrorState message={history.error} onRetry={history.retry} />
        ) : history.data.length === 0 ? (
          <p className="py-6 text-sm text-night-300">No rounds yet. Place a bet to get started.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {history.data.slice(0, SHOWN).map((round) => {
              const net = netOf(round);
              const tone = netTone(net);
              return (
                <li key={round.roundId} className="flex items-center gap-3 py-2.5 text-sm">
                  {/* Servers before resultLabel existed send no label: leave the chip out. */}
                  {round.resultLabel !== undefined ? (
                    <span
                      className={cx(
                        'w-16 shrink-0 rounded-md px-1.5 py-1 text-center text-xs font-semibold tabular-nums',
                        CHIP_CLASSES[tone],
                      )}
                    >
                      {round.resultLabel ?? 'Live'}
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-night-100">
                      {round.outcomeSummary ?? humanize(round.status)}
                    </p>
                    <p className="text-xs text-night-400">
                      {formatDateTime(round.startedAt)} · Bet {formatCoins(round.stake)}
                    </p>
                  </div>
                  <p className={cx('shrink-0 font-semibold tabular-nums', TEXT_CLASSES[tone])}>
                    {net === null ? 'In play' : formatSignedCoins(net)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
