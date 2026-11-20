import type { GameId } from '../../api/types';

/** One accent per game, used for artwork, card glows and the game page header. Original colours. */
export interface GameTheme {
  accent: string;
  glow: string;
  /** Background for artwork tiles. */
  gradient: string;
  /** Short label for how the game plays. */
  tag: string;
}

export const GAME_THEMES: Record<GameId, GameTheme> = {
  crash: {
    accent: '#3ee6a0',
    glow: 'rgb(62 230 160 / 0.38)',
    gradient: 'radial-gradient(120% 90% at 20% 0%, #134a3a 0%, #0b1a26 55%, #080d18 100%)',
    tag: 'Live round',
  },
  plinko: {
    accent: '#a78bfa',
    glow: 'rgb(167 139 250 / 0.38)',
    gradient: 'radial-gradient(120% 90% at 50% 0%, #34246a 0%, #131536 55%, #090b1c 100%)',
    tag: 'Instant',
  },
  mines: {
    accent: '#38bdf8',
    glow: 'rgb(56 189 248 / 0.38)',
    gradient: 'radial-gradient(120% 90% at 80% 0%, #0d3b5c 0%, #0b1730 55%, #080d1a 100%)',
    tag: 'Pick & cash out',
  },
  dice: {
    accent: '#fbbf24',
    glow: 'rgb(251 191 36 / 0.34)',
    gradient: 'radial-gradient(120% 90% at 50% 0%, #4a320c 0%, #1a1424 55%, #0b0a16 100%)',
    tag: 'Instant',
  },
};
