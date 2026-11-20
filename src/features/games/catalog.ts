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
      'Choose a virtual stake, a board of 8, 12 or 16 rows, and a risk level.',
      "The server picks the ball's path and settles the round before the animation plays. The animation only replays it.",
      'Your return is the stake times the multiplier of the bucket the ball lands in.',
      'Edge buckets pay the most and are hit the least. Higher risk raises the edges and lowers the middle.',
    ],
  },
  {
    slug: 'mines',
    name: 'Mines',
    tagline: 'Reveal safe tiles and cash out before you hit a mine.',
    rules: [
      'Choose a virtual stake and a number of mines (1 to 24) for the 5×5 board.',
      'The server hides the mines. Their positions are only sent to your browser once the round ends.',
      'Each safe tile raises the multiplier. Revealing a mine ends the round and the stake is lost.',
      'Cash out after at least one safe tile to settle at the current multiplier. Revealing every safe tile cashes out for you.',
      'If you leave mid-round, the round waits for you and resumes when you come back.',
    ],
  },
  {
    slug: 'dice',
    name: 'Dice',
    tagline: 'Pick a target, roll, and see if the result lands in your range.',
    rules: [
      'Choose a virtual stake, a target, and whether to roll under or over it.',
      'The server rolls a number from 0.00 to 99.99 and checks it against your target.',
      'Win chance can be set from 1% to 98%. Lower chances pay a higher multiplier: 50% pays 1.98x.',
      'The server calculates every return. The preview on this page is only a guide.',
    ],
  },
];

export function gameBySlug(slug: string | undefined): GameInfo | undefined {
  return GAMES.find((game) => game.slug === slug);
}

export function gameNameOf(id: string): string {
  return gameBySlug(id)?.name ?? id;
}
