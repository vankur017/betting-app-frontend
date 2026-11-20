import type { HistoryItem } from '../../api/types';

export type NetTone = 'win' | 'loss' | 'even' | 'live';

/** Net result of a round in minor units, or null while it is running. */
export function netOf(round: HistoryItem): number | null {
  return round.virtualReturn === null ? null : round.virtualReturn - round.stake;
}

export function netTone(net: number | null): NetTone {
  if (net === null) return 'live';
  if (net > 0) return 'win';
  if (net < 0) return 'loss';
  return 'even';
}

export const CHIP_CLASSES: Record<NetTone, string> = {
  win: 'bg-mint-500/15 text-mint-300',
  loss: 'bg-rose-500/10 text-rose-300',
  even: 'bg-white/5 text-night-300',
  live: 'bg-sky-500/10 text-sky-300',
};

export const TEXT_CLASSES: Record<NetTone, string> = {
  win: 'text-mint-300',
  loss: 'text-rose-300',
  even: 'text-night-300',
  live: 'text-sky-300',
};
