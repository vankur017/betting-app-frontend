import type { HistoryItem } from '../../api/types';
import type { QueryState } from '../../hooks/useApiQuery';
import { cx } from '../../lib/cx';
import { formatSignedCoins } from '../../lib/money';
import { CHIP_CLASSES, netOf, netTone } from './resultTone';

const SHOWN = 14;

/** The latest finished results as a row of chips above the game, newest first. */
export function RecentResultsStrip({ history }: { history: QueryState<HistoryItem[]> }) {
  if (history.status === 'loading') {
    return (
      <div aria-hidden="true" className="flex h-8 items-center gap-1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="h-6 w-12 animate-pulse rounded-md bg-white/5" />
        ))}
      </div>
    );
  }
  if (history.status === 'error') return <div aria-hidden="true" className="h-8" />;

  const finished = history.data.filter((round) => round.status !== 'RUNNING').slice(0, SHOWN);
  if (finished.length === 0) {
    return (
      <p className="flex h-8 items-center text-xs text-night-400">
        Your latest results will appear here.
      </p>
    );
  }

  return (
    <ol
      aria-label="Latest results, newest first"
      className="flex h-8 items-center gap-1.5 overflow-hidden [mask-image:linear-gradient(90deg,black_80%,transparent)]"
    >
      {finished.map((round, index) => {
        const net = netOf(round);
        return (
          <li
            key={round.roundId}
            title={round.outcomeSummary ?? undefined}
            className={cx(
              'shrink-0 rounded-md px-2 py-1 text-xs font-semibold tabular-nums',
              CHIP_CLASSES[netTone(net)],
              index === 0 && 'animate-pop',
            )}
          >
            {round.resultLabel ?? (net === null ? '—' : formatSignedCoins(net))}
          </li>
        );
      })}
    </ol>
  );
}
