import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export interface Stat {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'win' | 'loss' | 'accent';
}

const TONES: Record<NonNullable<Stat['tone']>, string> = {
  default: 'text-night-100',
  win: 'text-mint-300',
  loss: 'text-rose-300',
  accent: 'text-mint-400',
};

/** A row of figures for the current bet or round: multiplier, payout, profit, … */
export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <dl
      className="panel-inset grid divide-x divide-white/5"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 px-1.5 py-2.5 text-center sm:px-2.5">
          <dt className="eyebrow truncate tracking-[0.04em]">{stat.label}</dt>
          <dd
            className={cx(
              'mt-1 truncate text-sm font-semibold tabular-nums sm:text-base',
              TONES[stat.tone ?? 'default'],
            )}
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
