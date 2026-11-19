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
      <label htmlFor={id} className="text-sm font-medium text-night-100">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'rounded-lg border bg-night-900 px-3 py-2.5 text-night-100 placeholder:text-night-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint-400',
          error ? 'border-rose-500' : 'border-night-600',
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
