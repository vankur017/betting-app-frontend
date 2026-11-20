import { Link } from 'react-router-dom';
import { useWallet } from '../wallet/wallet-context';
import { formatCoins } from '../lib/money';
import { AnimatedCoins } from './AnimatedCoins';
import { CoinIcon } from './icons';

export function BalanceBadge() {
  const { wallet, status, error } = useWallet();

  if (!wallet) {
    if (status === 'error') {
      return (
        <span
          className="rounded-full bg-night-800 px-3 py-1.5 text-xs text-night-300"
          title={error ?? undefined}
        >
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

  return (
    <Link
      to="/wallet"
      className="flex items-center gap-2 rounded-full border border-white/10 bg-night-900 py-1 pl-1.5 pr-3.5 text-sm font-semibold transition hover:border-mint-400/50"
      aria-label={`Virtual coin balance: ${formatCoins(wallet.balance)} ${wallet.currencyCode}. Open wallet.`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-night-950/60">
        <CoinIcon />
      </span>
      <AnimatedCoins value={wallet.balance} className="text-night-100" />
      <span className="text-xs font-semibold text-mint-300">{wallet.currencyCode}</span>
    </Link>
  );
}
