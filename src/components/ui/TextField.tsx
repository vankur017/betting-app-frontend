import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, error, hint, className, ...rest }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'rounded-xl border bg-night-950/70 px-3.5 py-2.5 text-base font-semibold tabular-nums text-night-100 shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)] transition placeholder:text-night-400 focus:outline-none focus-visible:border-mint-400/70 focus-visible:ring-4 focus-visible:ring-mint-400/15 disabled:opacity-60',
          error ? 'border-rose-500/80' : 'border-white/10 hover:border-white/20',
        )}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-xs text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-night-300">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
