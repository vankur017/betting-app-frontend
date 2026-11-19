import { cx } from '../../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-mint-500 text-night-950 hover:bg-mint-400',
  secondary: 'bg-night-700 text-night-100 hover:bg-night-600',
  ghost: 'text-night-300 hover:bg-night-800 hover:text-night-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
};

/** Shared so router links can look like buttons without nesting interactive elements. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  options: { fullWidth?: boolean; className?: string } = {},
): string {
  return cx(BASE, VARIANTS[variant], options.fullWidth && 'w-full', options.className);
}
