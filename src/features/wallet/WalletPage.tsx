import { Button } from '../../components/ui/Button';
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
import { cx } from '../../lib/cx';
import { formatDateTime, humanize } from '../../lib/format';
import { formatCoins, formatSignedCoins } from '../../lib/money';
import { useWallet } from '../../wallet/wallet-context';

const TYPE_LABELS: Record<string, string> = {
  STARTER_GRANT: 'Starter coins',
  STAKE_DEBIT: 'Stake',
  ROUND_RETURN: 'Round return',
};

export function WalletPage() {
  const { wallet, status, error, refresh } = useWallet();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Wallet"
        description="The demo wallet's virtual coin balance and its most recent ledger entries."
        actions={
          <Button variant="secondary" loading={status === 'loading'} onClick={() => void refresh()}>
            Refresh
          </Button>
        }
      />

      {!wallet ? (
        status === 'error' ? (
          <ErrorState message={error ?? 'Balance unavailable.'} onRetry={() => void refresh()} />
        ) : (
          <LoadingState label="Loading wallet" />
        )
      ) : (
        <>
          <section
            aria-labelledby="balance-heading"
            className="rounded-2xl border border-night-800 bg-night-900 p-6"
          >
            <h2 id="balance-heading" className="text-sm font-medium text-night-300">
              Demo wallet · {wallet.playerName}
            </h2>
            <p className="mt-2 flex items-baseline gap-2 text-4xl font-bold tabular-nums">
              {formatCoins(wallet.balance)}
              <span className="text-base font-semibold text-night-300">{wallet.currencyCode}</span>
            </p>
            <p className="mt-3 text-xs text-night-300">
              Virtual coins have no monetary value. They cannot be purchased, transferred, or
              redeemed.
            </p>
          </section>

          <section aria-labelledby="ledger-heading">
            <h2 id="ledger-heading" className="mb-4 text-lg font-semibold">
              Recent ledger entries
            </h2>
            {wallet.recentTransactions.length === 0 ? (
              <EmptyState title="No ledger entries yet" />
            ) : (
              <div className={tableWrapperClass}>
                <table className={tableClass}>
                  <caption className="sr-only">Wallet ledger entries, newest first</caption>
                  <thead className={theadClass}>
                    <tr>
                      <th scope="col" className={thClass}>Date</th>
                      <th scope="col" className={thClass}>Type</th>
                      <th scope="col" className={cx(thClass, 'text-right')}>Amount</th>
                      <th scope="col" className={cx(thClass, 'text-right')}>Balance after</th>
                    </tr>
                  </thead>
                  <tbody className={tbodyClass}>
                    {wallet.recentTransactions.map((entry) => (
                      <tr key={entry.id}>
                        <td className={cx(tdClass, 'text-night-300')}>
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className={tdClass}>{TYPE_LABELS[entry.type] ?? humanize(entry.type)}</td>
                        <td
                          className={cx(
                            tdClass,
                            'text-right font-semibold tabular-nums',
                            entry.amount > 0 && 'text-mint-300',
                            entry.amount < 0 && 'text-rose-300',
                          )}
                        >
                          {formatSignedCoins(entry.amount)}
                        </td>
                        <td className={cx(tdClass, 'text-right tabular-nums')}>
                          {formatCoins(entry.balanceAfter)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
