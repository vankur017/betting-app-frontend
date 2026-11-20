import { Link } from 'react-router-dom';
import { listGames } from '../../api/games';
import type { GameId } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { buttonClasses } from '../../components/ui/buttonStyles';
import { env } from '../../config/env';
import { useApiQuery } from '../../hooks/useApiQuery';
import { GAMES } from '../games/catalog';
import { GAME_THEMES } from '../games/theme';
import { GameArt } from './GameArt';
import { GameCard } from './GameCard';

const STATS = [
  { value: '4', label: 'Original games' },
  { value: '0', label: 'Real money' },
  { value: '100%', label: 'Server-decided' },
];

// Decorative tiles on the right of the hero. Rotation on the outer box, float on the inner one.
const HERO_TILES: { game: GameId; position: string; delay: string }[] = [
  { game: 'crash', position: 'left-2 top-0 -rotate-6', delay: '0s' },
  { game: 'plinko', position: 'right-0 top-2 rotate-6', delay: '1.2s' },
  { game: 'mines', position: 'bottom-0 left-10 rotate-3', delay: '2.4s' },
  { game: 'dice', position: '-bottom-4 right-6 -rotate-3', delay: '3.6s' },
];

export function LobbyPage() {
  const games = useApiQuery(listGames);
  const summaries =
    games.status === 'success' ? new Map(games.data.map((game) => [game.id, game])) : undefined;

  return (
    <div className="flex flex-col gap-14">
      <section className="panel relative overflow-hidden px-6 py-12 sm:px-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-mint-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 right-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"
        />

        <div className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-mint-400/25 bg-mint-500/10 px-3 py-1 text-xs font-semibold text-mint-300">
              <span className="h-1.5 w-1.5 rounded-full bg-mint-400 shadow-[0_0_10px_rgb(62_230_160)]" />
              Play money only
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] sm:text-6xl">
              Four games.
              <br />
              <span className="text-gradient">Zero real money.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-night-300 sm:text-lg">
              Play Crash, Plinko, Mines and Dice on {env.appName} with virtual coins. Coins have no
              monetary value and cannot be bought, sold, or redeemed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/games/crash"
                className={buttonClasses('primary', { className: 'px-6 py-3 text-base' })}
              >
                Play Crash
              </Link>
              <Link
                to="/help"
                className={buttonClasses('secondary', { className: 'px-6 py-3 text-base' })}
              >
                How it works
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {STATS.map((stat) => (
                <div key={stat.label} className="panel-inset px-3 py-3">
                  <dt className="eyebrow">{stat.label}</dt>
                  <dd className="mt-1 font-display text-2xl font-bold">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div aria-hidden="true" className="relative hidden h-[22rem] lg:block">
            {HERO_TILES.map(({ game, position, delay }) => (
              <div key={game} className={`absolute ${position}`}>
                <div
                  className="flex h-36 w-52 animate-float items-center justify-center rounded-3xl border border-white/10"
                  style={{
                    background: GAME_THEMES[game].gradient,
                    boxShadow: `0 30px 60px -28px ${GAME_THEMES[game].glow}, inset 0 1px 0 rgb(255 255 255 / 0.06)`,
                    animationDelay: delay,
                  }}
                >
                  <GameArt game={game} className="h-28 w-44" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="games-heading">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="games-heading" className="text-2xl font-bold">
              Games
            </h2>
            <p className="mt-1 text-sm text-night-300">Pick one to start playing.</p>
          </div>
        </div>
        {games.status === 'error' ? (
          <Alert tone="warning" className="mb-5">
            Live game settings are unavailable: {games.error}
          </Alert>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {GAMES.map((game, index) => (
            <GameCard
              key={game.slug}
              game={game}
              summary={summaries?.get(game.slug)}
              index={index}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
