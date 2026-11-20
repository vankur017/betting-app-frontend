import { useId } from 'react';
import { CoinIcon } from '../../components/icons';
import { env } from '../../config/env';
import { cx } from '../../lib/cx';
import { sound } from '../../lib/sound';
import type { StakeController } from './useStake';

const QUICK_AMOUNTS_VC = [1, 10, 50, 100];

const adjustClass =
  'min-w-11 px-3 text-sm font-semibold text-night-300 transition hover:bg-white/5 hover:text-night-100 active:bg-white/10 disabled:cursor-not-allowed disabled:hover:bg-transparent';
const chipClass =
  'rounded-lg bg-night-800 py-2 text-xs font-semibold text-night-300 transition hover:bg-night-700 hover:text-night-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';

interface BetAmountFieldProps {
  stake: StakeController;
  disabled: boolean;
  /** Stake limits, e.g. "0.10 – 1,000.00 VC". */
  hint?: string;
}

/** Bet amount input with halve/double, quick amounts and Max. Limits are checked on submit. */
export function BetAmountField({ stake, disabled, hint }: BetAmountFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const unit = 10 ** env.coinDecimals;
  const tap = (action: () => void) => () => {
    sound.play('click');
    action();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="eyebrow">
          Bet amount
        </label>
        {hint ? (
          <span id={hintId} className="text-[11px] text-night-400">
            {hint}
          </span>
        ) : null}
      </div>
      <div
        className={cx(
          'flex items-stretch rounded-xl border bg-night-950/70 transition focus-within:border-mint-400/70',
          stake.error ? 'border-rose-500/80' : 'border-white/10 hover:border-white/20',
          disabled && 'opacity-60',
        )}
      >
        <div className="relative flex min-w-0 flex-1 items-center">
          <CoinIcon className="pointer-events-none absolute left-3 h-4 w-4" />
          <input
            id={id}
            name="stake"
            inputMode="decimal"
            autoComplete="off"
            value={stake.input}
            onChange={(event) => stake.setInput(event.target.value)}
            disabled={disabled}
            aria-invalid={stake.error ? true : undefined}
            aria-describedby={stake.error ? errorId : hint ? hintId : undefined}
            className="w-full min-w-0 bg-transparent py-3 pl-9 pr-2 text-base font-semibold tabular-nums text-night-100 outline-none disabled:cursor-not-allowed"
          />
          <span className="pr-3 text-xs font-semibold text-night-400">VC</span>
        </div>
        <div className="flex border-l border-white/10">
          <button
            type="button"
            className={adjustClass}
            onClick={tap(() => stake.adjust('half'))}
            disabled={disabled}
            aria-label="Halve bet"
          >
            ½
          </button>
          <button
            type="button"
            className={cx(adjustClass, 'rounded-r-xl border-l border-white/10')}
            onClick={tap(() => stake.adjust('double'))}
            disabled={disabled}
            aria-label="Double bet"
          >
            2×
          </button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {QUICK_AMOUNTS_VC.map((amount) => (
          <button
            key={amount}
            type="button"
            className={chipClass}
            onClick={tap(() => stake.setAmount(amount * unit))}
            disabled={disabled}
            aria-label={`Bet ${amount} VC`}
          >
            {amount}
          </button>
        ))}
        <button type="button" className={chipClass} onClick={tap(stake.setMax)} disabled={disabled}>
          Max
        </button>
      </div>
      {stake.error ? (
        <p id={errorId} role="alert" className="text-xs text-rose-400">
          {stake.error}
        </p>
      ) : null}
    </div>
  );
}
