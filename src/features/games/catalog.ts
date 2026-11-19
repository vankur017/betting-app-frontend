import type { GameId } from '../../api/types';

export interface GameInfo {
  /** Matches the API game id and the /games/:slug route. */
  slug: GameId;
  name: string;
  tagline: string;
  /** Player-facing rules. Limits and multipliers come from the server. */
  rules: string[];
}

export const GAMES: readonly GameInfo[] = [
  {
    slug: 'crash',
    name: 'Crash',
    tagline: 'Watch the multiplier climb and cash out before it crashes.',
    rules: [
      'Enter a virtual stake and start a round.',
      'The multiplier starts at 1.00x and rises. The server picks the crash point at the start and keeps it secret until the round ends.',
      "Cash out before the crash to receive your stake times the multiplier at that moment, measured by the server's clock.",
      'If the round crashes first, the stake is lost. Some rounds crash instantly at 1.00x.',
    ],
  },
  {
    slug: 'plinko',
    name: 'Plinko',
    tagline: 'Drop a ball through the pegs and land in a multiplier bucket.',
    rules: [
      'Choose a virtual stake and a supported board setting.',
      'The server picks the result bucket before the animation plays.',
      'Your return is the stake times the multiplier of the bucket the ball lands in.',
    ],
  },
  {
    slug: 'mines',
    name: 'Mines',
    tagline: 'Reveal safe tiles and cash out before you hit a mine.',
    rules: [
      'Choose a virtual stake and a number of mines.',
      'The server hides the mines. Their positions are never sent to your browser.',
      'Each safe tile raises the multiplier. Revealing a mine ends the round and the stake is lost.',
      'Cash out after a safe reveal to settle at the current multiplier.',
    ],
  },
  {
    slug: 'dice',
    name: 'Dice',
    tagline: 'Pick a target, roll, and see if the result lands in your range.',
    rules: [
      'Choose a virtual stake and a target within the allowed range.',
      'The server generates the roll and checks it against your target.',
      'Lower-probability targets pay a higher multiplier. The server calculates every return.',
    ],
  },
];

export function gameBySlug(slug: string | undefined): GameInfo | undefined {
  return GAMES.find((game) => game.slug === slug);
}

export function gameNameOf(id: string): string {
  return gameBySlug(id)?.name ?? id;
}
