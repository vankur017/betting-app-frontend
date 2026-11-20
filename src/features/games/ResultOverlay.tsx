import { cx } from '../../lib/cx';
import { formatSignedCoins } from '../../lib/money';

/** What a finished round means for the player, as shown on the game area. */
export interface RoundOutcome {
  /** Changes for every round, so the entrance animation replays. */
  key: string;
  /** Return minus stake, in minor units. */
  net: number;
  /** e.g. "Cashed out at 2.41x" or "Crashed at 1.20x". */
  label: string;
}

interface ResultOverlayProps {
  outcome: RoundOutcome | null;
  /** "top" sits above the game; "center" covers a finished board such as Mines. */
  placement?: 'top' | 'center';
}

/**
 * Win/loss feedback on top of the game area. Decorative (aria-hidden): the panel's status line
 * announces the same result to screen readers. Never blocks clicks.
 */
export function ResultOverlay({ outcome, placement = 'top' }: ResultOverlayProps) {
  if (!outcome) return null;
  const tone = outcome.net > 0 ? 'win' : outcome.net < 0 ? 'loss' : 'even';

  return (
    <div
      aria-hidden="true"
      className={cx(
        'pointer-events-none absolute inset-x-0 z-10 flex justify-center px-4',
        placement === 'top' ? 'top-3' : 'inset-y-0 items-center',
      )}
    >
      <div
        key={outcome.key}
        className={cx(
          'flex animate-pop items-center gap-3 rounded-full border px-4 py-2 font-semibold shadow-[0_12px_32px_-12px_rgb(0_0_0/0.9)]',
          placement === 'center' && 'flex-col gap-1 rounded-2xl px-8 py-5 text-center',
          tone === 'win' && 'border-mint-400/40 bg-[#0c2a20] text-mint-300',
          tone === 'loss' && 'border-rose-400/40 bg-[#2b1018] text-rose-300',
          tone === 'even' && 'border-white/15 bg-night-800 text-night-100',
        )}
      >
        <span className={cx('text-sm', placement === 'center' && 'text-base text-night-100')}>
          {outcome.label}
        </span>
        <span
          className={cx(
            'tabular-nums',
            placement === 'center' ? 'font-display text-3xl font-bold' : 'text-base',
          )}
        >
          {formatSignedCoins(outcome.net)} VC
        </span>
      </div>
    </div>
  );
}
