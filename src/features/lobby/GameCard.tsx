import { Link } from 'react-router-dom';
import type { GameSummary } from '../../api/types';
import { buttonClasses } from '../../components/ui/buttonStyles';
import { formatCoins } from '../../lib/money';
import type { GameInfo } from '../games/catalog';
import { GameArt } from './GameArt';

interface GameCardProps {
  game: GameInfo;
  /** Server settings for the game. Absent while loading or if the server is unreachable. */
  summary?: GameSummary;
}

export function GameCard({ game, summary }: GameCardProps) {
  const comingSoon = summary?.available === false;
  const { minStake, maxStake } = summary ?? {};

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-night-800 bg-night-900 transition-colors hover:border-night-600">
      <div className="flex h-36 items-center justify-center bg-night-800">
        <GameArt game={game.slug} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold">{game.name}</h3>
          {comingSoon ? (
            <span className="rounded-full bg-night-700 px-2 py-0.5 text-xs text-night-300">
              Coming soon
            </span>
          ) : null}
        </div>
        <p className="text-sm text-night-300">{game.tagline}</p>
        {!comingSoon && minStake !== undefined && maxStake !== undefined ? (
          <p className="text-xs text-night-300">
            Stake {formatCoins(minStake)} – {formatCoins(maxStake)} VC
          </p>
        ) : null}
        <div className="mt-auto pt-2">
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
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
