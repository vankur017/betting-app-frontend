import { Link } from 'react-router-dom';
import { formatCoins } from '../lib/money';
import { useWallet } from '../wallet/wallet-context';
import { CoinIcon } from './icons';

export function BalanceBadge() {
  const { wallet, status, error } = useWallet();

  if (!wallet) {
    if (status === 'error') {
      return (
        <span className="rounded-full bg-night-800 px-3 py-1.5 text-xs text-night-300" title={error ?? undefined}>
          Balance unavailable
        </span>
      );
    }
    return (
      <span
        role="status"
        aria-label="Loading balance"
        className="h-8 w-24 animate-pulse rounded-full bg-night-800"
      />
    );
  }

  const amount = formatCoins(wallet.balance);
  return (
    <Link
      to="/wallet"
      className="flex items-center gap-2 rounded-full border border-night-700 bg-night-900 px-3 py-1.5 text-sm font-semibold hover:border-mint-500/60"
      aria-label={`Virtual coin balance: ${amount} ${wallet.currencyCode}. Open wallet.`}
    >
      <CoinIcon />
      <span className="tabular-nums">{amount}</span>
      <span className="text-xs font-medium text-night-300">{wallet.currencyCode}</span>
    </Link>
  );
}
