import { cx } from '../../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BASE =
  'inline-flex select-none items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-mint-500 text-night-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_1px_2px_rgb(0_0_0/0.4)] hover:bg-mint-400 disabled:hover:bg-mint-500',
  secondary:
    'border border-white/10 bg-night-700/70 text-night-100 hover:border-white/20 hover:bg-night-700',
  ghost: 'text-night-300 hover:bg-white/5 hover:text-night-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
};

/** Shared so router links can look like buttons without nesting interactive elements. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  options: { fullWidth?: boolean; className?: string } = {},
): string {
  return cx(BASE, VARIANTS[variant], options.fullWidth && 'w-full', options.className);
}
