import { cx } from '../../lib/cx';

interface SegmentedProps<T extends string | number> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format: (value: T) => string;
  disabled: boolean;
}

/** A pill-shaped row of toggle buttons for one setting. */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format,
  disabled,
}: SegmentedProps<T>) {
  return (
    <fieldset className="flex flex-col gap-1.5 disabled:opacity-60" disabled={disabled}>
      <legend className="eyebrow mb-1.5">{label}</legend>
      <div
        className="panel-inset grid gap-1 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      >
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option)}
              className={cx(
                'rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed',
                active
                  ? 'bg-linear-to-b from-mint-400 to-mint-500 text-night-950 shadow-[0_6px_18px_-8px_rgb(22_199_132/0.9)]'
                  : 'text-night-300 hover:bg-white/5 hover:text-night-100',
              )}
            >
              {format(option)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
