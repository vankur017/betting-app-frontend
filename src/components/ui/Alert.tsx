import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

type Tone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<Tone, string> = {
  info: 'border-sky-400/25 bg-sky-500/10 text-sky-100 before:bg-sky-400',
  success: 'border-mint-400/25 bg-mint-500/10 text-mint-300 before:bg-mint-400',
  warning: 'border-amber-400/25 bg-amber-500/10 text-amber-100 before:bg-amber-400',
  error: 'border-rose-400/25 bg-rose-500/10 text-rose-100 before:bg-rose-400',
};

interface AlertProps {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'relative overflow-hidden rounded-xl border py-3 pl-5 pr-4 text-sm before:absolute before:inset-y-0 before:left-0 before:w-1',
        TONES[tone],
        className,
      )}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? 'mt-1' : undefined}>{children}</div> : null}
    </div>
  );
}
