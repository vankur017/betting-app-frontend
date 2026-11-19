import { Link } from 'react-router-dom';
import { listGames } from '../../api/games';
import { Alert } from '../../components/ui/Alert';
import { buttonClasses } from '../../components/ui/buttonStyles';
import { env } from '../../config/env';
import { useApiQuery } from '../../hooks/useApiQuery';
import { GAMES } from '../games/catalog';
import { GameCard } from './GameCard';

export function LobbyPage() {
  const games = useApiQuery(listGames);
  const summaries =
    games.status === 'success' ? new Map(games.data.map((game) => [game.id, game])) : undefined;

  return (
    <div className="flex flex-col gap-12">
      <section className="relative overflow-hidden rounded-3xl border border-night-800 bg-gradient-to-br from-night-800 via-night-900 to-night-950 px-6 py-12 sm:px-10">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-mint-400">
            Play money only
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Four games. No real money.
          </h1>
          <p className="mt-4 text-base text-night-300 sm:text-lg">
            Play Crash, Plinko, Mines and Dice on {env.appName} with virtual coins. Coins have no
            monetary value and cannot be bought, sold, or redeemed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/games/crash" className={buttonClasses('primary')}>
              Play Crash
            </Link>
            <Link to="/help" className={buttonClasses('secondary')}>
              How it works
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="games-heading">
        <h2 id="games-heading" className="mb-5 text-xl font-bold">
          Games
        </h2>
        {games.status === 'error' ? (
          <Alert tone="warning" className="mb-5">
            Live game settings are unavailable: {games.error}
          </Alert>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {GAMES.map((game) => (
            <GameCard key={game.slug} game={game} summary={summaries?.get(game.slug)} />
          ))}
        </div>
      </section>
    </div>
  );
}
