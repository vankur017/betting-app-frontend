import { useEffect, type FormEvent, type ReactNode } from 'react';
import type { GameId, HistoryItem } from '../../api/types';
import { AnimatedCoins } from '../../components/AnimatedCoins';
import type { QueryState } from '../../hooks/useApiQuery';
import { useWallet } from '../../wallet/wallet-context';
import { gameBySlug } from './catalog';
import { GameHeader } from './GameHeader';
import { RecentResultsStrip } from './RecentResultsStrip';
import { RecentRounds } from './RecentRounds';

type HistoryState = QueryState<HistoryItem[]> & { retry: () => void };

interface GameLayoutProps {
  game: GameId;
  /** id of the bet form, so action buttons outside it can submit it with `form={formId}`. */
  formId: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Fields of the bet form. */
  controls: ReactNode;
  /** Figures for the current bet or round, under the form. */
  summary?: ReactNode;
  /**
   * Main action button(s). Rendered in the panel on large screens and in a fixed bottom bar on
   * small ones, so the action is always in reach. Submit buttons must use `form={formId}`.
   */
  action: ReactNode;
  /** One short line describing the current state. */
  status: string;
  /** Errors and notices for the panel. */
  alerts?: ReactNode;
  /** Warning above the game, e.g. settings could not be loaded. */
  notice?: ReactNode;
  /** The game area. */
  stage: ReactNode;
  history: HistoryState;
}

/**
 * The shared game screen: title, game area with the latest results above it, bet panel,
 * recent rounds and rules. On small screens the game area comes first and the main action
 * sits in a bottom bar.
 */
export function GameLayout({
  game,
  formId,
  onSubmit,
  controls,
  summary,
  action,
  status,
  alerts,
  notice,
  stage,
  history,
}: GameLayoutProps) {
  const { wallet } = useWallet();
  const info = gameBySlug(game);

  // Keeps the page footer clear of the mobile action bar.
  useEffect(() => {
    document.body.classList.add('has-action-bar');
    return () => document.body.classList.remove('has-action-bar');
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <GameHeader game={game} />
      {notice}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2">
          <RecentResultsStrip history={history} />
          {stage}
        </div>

        <section
          aria-labelledby={`${game}-controls-heading`}
          className="panel order-2 flex min-w-0 flex-col gap-5 p-4 sm:p-5 lg:order-1"
        >
          <h2 id={`${game}-controls-heading`} className="sr-only">
            Bet controls
          </h2>
          <div className="flex items-center justify-between rounded-xl bg-night-950/50 px-3 py-2.5">
            <span className="eyebrow">Balance</span>
            <span className="flex items-baseline gap-1.5 text-sm font-semibold">
              {wallet ? (
                <>
                  <AnimatedCoins value={wallet.balance} />
                  <span className="text-xs text-night-400">{wallet.currencyCode}</span>
                </>
              ) : (
                '—'
              )}
            </span>
          </div>

          <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
            {controls}
          </form>

          {summary}
          <div className="hidden flex-col gap-2 lg:flex">{action}</div>
          <p role="status" className="min-h-5 text-sm text-night-300">
            {status}
          </p>
          {alerts}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RecentRounds history={history} />
        <section aria-labelledby={`${game}-rules-heading`} className="panel p-5">
          <h2 id={`${game}-rules-heading`} className="text-lg font-semibold">
            How {info?.name} works
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-night-300">
            {info?.rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ol>
        </section>
      </div>

      <p className="text-xs text-night-400">
        Virtual coins only. Coins have no monetary value and cannot be redeemed.
      </p>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night-950/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 lg:hidden">
        <p aria-hidden="true" className="mb-2 truncate text-center text-xs text-night-300">
          {status}
        </p>
        <div className="mx-auto flex max-w-xl gap-2 [&>*]:min-w-0 [&>*]:flex-1">{action}</div>
      </div>
    </div>
  );
}
