import { cx } from '../../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BASE =
  'inline-flex select-none items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-linear-to-b from-mint-400 to-mint-500 text-night-950 shadow-[0_8px_24px_-10px_rgb(22_199_132/0.8),inset_0_1px_0_rgb(255_255_255/0.35)] hover:from-mint-300 hover:to-mint-400 hover:shadow-[0_10px_30px_-8px_rgb(22_199_132/0.85),inset_0_1px_0_rgb(255_255_255/0.4)]',
  secondary:
    'border border-white/8 bg-white/5 text-night-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] hover:border-white/15 hover:bg-white/10',
  ghost: 'text-night-300 hover:bg-white/5 hover:text-night-100',
  danger:
    'bg-linear-to-b from-rose-500 to-rose-600 text-white shadow-[0_8px_24px_-10px_rgb(244_63_94/0.8)] hover:from-rose-400 hover:to-rose-500',
};

/** Shared so router links can look like buttons without nesting interactive elements. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  options: { fullWidth?: boolean; className?: string } = {},
): string {
  return cx(BASE, VARIANTS[variant], options.fullWidth && 'w-full', options.className);
}
