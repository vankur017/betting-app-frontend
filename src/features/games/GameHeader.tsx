import { Link } from 'react-router-dom';
import type { GameId } from '../../api/types';
import { GameArt } from '../lobby/GameArt';
import { gameBySlug } from './catalog';
import { GAME_THEMES } from './theme';

/** Title block for a game page: artwork tile, name, tagline and play style. */
export function GameHeader({ game }: { game: GameId }) {
  const info = gameBySlug(game);
  const theme = GAME_THEMES[game];

  return (
    <div className="flex animate-rise flex-col gap-4">
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-night-400 transition hover:text-night-100"
      >
        <span aria-hidden="true">←</span> Lobby
      </Link>
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-16 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10"
          style={{
            background: theme.gradient,
            boxShadow: `0 16px 36px -18px ${theme.glow}, inset 0 1px 0 rgb(255 255 255 / 0.06)`,
          }}
        >
          <GameArt game={game} className="h-12 w-16" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold sm:text-4xl">{info?.name}</h1>
            <span
              className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
              style={{ color: theme.accent, borderColor: `${theme.accent}55` }}
            >
              {theme.tag}
            </span>
          </div>
          <p className="mt-1 text-sm text-night-300">{info?.tagline}</p>
        </div>
      </div>
    </div>
  );
}
