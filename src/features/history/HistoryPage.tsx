import { Link } from 'react-router-dom';
import { listHistory } from '../../api/games';
import { buttonClasses } from '../../components/ui/buttonStyles';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import {
  tableClass,
  tableWrapperClass,
  tbodyClass,
  tdClass,
  theadClass,
  thClass,
} from '../../components/ui/table';
import { useApiQuery } from '../../hooks/useApiQuery';
import { cx } from '../../lib/cx';
import { formatDateTime, humanize } from '../../lib/format';
import { formatCoins } from '../../lib/money';
import { gameNameOf } from '../games/catalog';

const HISTORY_LIMIT = 50;
const loadHistory = (signal: AbortSignal) => listHistory(HISTORY_LIMIT, signal);

export function HistoryPage() {
  const history = useApiQuery(loadHistory);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Recent history"
        description={`The last ${HISTORY_LIMIT} demo rounds, newest first.`}
        actions={
          <button type="button" className={buttonClasses('secondary')} onClick={history.retry}>
            Refresh
          </button>
        }
      />

      {history.status === 'loading' ? (
        <LoadingState label="Loading history" />
      ) : history.status === 'error' ? (
        <ErrorState message={history.error} onRetry={history.retry} />
      ) : history.data.length === 0 ? (
        <EmptyState
          title="No rounds yet"
          description="Rounds you play will appear here."
          action={
            <Link to="/games/crash" className={buttonClasses('primary')}>
              Play Crash
            </Link>
          }
        />
      ) : (
        <div className={tableWrapperClass}>
          <table className={tableClass}>
            <caption className="sr-only">Game rounds, newest first</caption>
            <thead className={theadClass}>
              <tr>
                <th scope="col" className={thClass}>Started</th>
                <th scope="col" className={thClass}>Game</th>
                <th scope="col" className={thClass}>Outcome</th>
                <th scope="col" className={cx(thClass, 'text-right')}>Stake</th>
                <th scope="col" className={cx(thClass, 'text-right')}>Return</th>
                <th scope="col" className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {history.data.map((round) => (
                <tr key={round.roundId}>
                  <td className={cx(tdClass, 'text-night-300')}>{formatDateTime(round.startedAt)}</td>
                  <td className={cx(tdClass, 'font-medium')}>{gameNameOf(round.game)}</td>
                  <td className={cx(tdClass, 'text-night-300')}>{round.outcomeSummary ?? '—'}</td>
                  <td className={cx(tdClass, 'text-right tabular-nums')}>{formatCoins(round.stake)}</td>
                  <td className={cx(tdClass, 'text-right tabular-nums')}>
                    {round.virtualReturn === null ? '—' : formatCoins(round.virtualReturn)}
                  </td>
                  <td className={tdClass}>{humanize(round.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
