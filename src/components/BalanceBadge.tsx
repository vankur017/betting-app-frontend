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
      className="group flex items-center gap-2 rounded-full border border-mint-400/20 bg-linear-to-b from-mint-500/15 to-mint-500/5 py-1 pl-1.5 pr-3.5 text-sm font-semibold shadow-[0_8px_24px_-14px_rgb(22_199_132/0.8)] transition hover:border-mint-400/50"
      aria-label={`Virtual coin balance: ${amount} ${wallet.currencyCode}. Open wallet.`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-night-950/60">
        <CoinIcon />
      </span>
      <span className="tabular-nums text-night-100">{amount}</span>
      <span className="text-xs font-semibold text-mint-300">{wallet.currencyCode}</span>
    </Link>
  );
}
