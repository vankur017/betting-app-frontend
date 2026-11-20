import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { GameSummary } from '../../api/types';
import { buttonClasses } from '../../components/ui/buttonStyles';
import { formatCoins } from '../../lib/money';
import type { GameInfo } from '../games/catalog';
import { GAME_THEMES } from '../games/theme';
import { GameArt } from './GameArt';

interface GameCardProps {
  game: GameInfo;
  /** Server settings for the game. Absent while loading or if the server is unreachable. */
  summary?: GameSummary;
  /** Stagger for the entrance animation. */
  index?: number;
}

export function GameCard({ game, summary, index = 0 }: GameCardProps) {
  const comingSoon = summary?.available === false;
  const { minStake, maxStake } = summary ?? {};
  const theme = GAME_THEMES[game.slug];

  return (
    <article
      className="group panel relative flex animate-rise flex-col overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:border-white/15 hover:shadow-[0_28px_60px_-30px_var(--accent)]"
      style={{ '--accent': theme.accent, animationDelay: `${index * 70}ms` } as CSSProperties}
    >
      <div
        className="relative flex h-44 items-center justify-center overflow-hidden border-b border-white/5"
        style={{ background: theme.gradient }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-60 transition duration-500 group-hover:opacity-100"
          style={{ background: `radial-gradient(60% 60% at 50% 60%, ${theme.glow}, transparent 70%)` }}
        />
        <GameArt
          game={game.slug}
          className="relative h-32 w-48 transition duration-500 group-hover:scale-[1.06]"
        />
        <span
          className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] font-semibold backdrop-blur"
          style={{ color: theme.accent }}
        >
          {comingSoon ? 'Coming soon' : theme.tag}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-xl font-bold">{game.name}</h3>
        <p className="text-sm leading-relaxed text-night-300">{game.tagline}</p>
        {!comingSoon && minStake !== undefined && maxStake !== undefined ? (
          <p className="text-xs text-night-400">
            Stake {formatCoins(minStake)} – {formatCoins(maxStake)} VC
          </p>
        ) : null}
        <div className="mt-auto pt-4">
          {comingSoon ? (
            <span
              aria-disabled="true"
              className={buttonClasses('secondary', {
                fullWidth: true,
                className: 'pointer-events-none opacity-60',
              })}
            >
              Coming soon
            </span>
          ) : (
            <Link
              to={`/games/${game.slug}`}
              className={buttonClasses('primary', { fullWidth: true })}
              aria-label={`Play ${game.name}`}
            >
              Play
              <span aria-hidden="true" className="transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
