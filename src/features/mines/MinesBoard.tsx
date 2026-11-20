import type { MinesRound } from '../../api/types';
import { cx } from '../../lib/cx';
import { tilePosition, tileView, type TileView } from '../../lib/mines';

function GemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3/5 w-3/5">
      <path d="M7 3h10l5 6-10 12L2 9z" fill="currentColor" />
      <path
        d="M2 9h20M7 3l5 6 5-6M12 9v12"
        fill="none"
        stroke="#070b14"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MineIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3/5 w-3/5">
      <path
        d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4M4.6 4.6l2.8 2.8M16.6 16.6l2.8 2.8M4.6 19.4l2.8-2.8M16.6 7.4l2.8-2.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="6.5" fill="currentColor" />
      <circle cx="9.8" cy="9.8" r="1.7" fill="#ffffff" fillOpacity="0.55" />
    </svg>
  );
}

const TILE_CLASSES: Record<TileView, string> = {
  hidden:
    'border-white/10 bg-linear-to-b from-[#334166] to-[#1f2a47] shadow-[inset_0_1px_0_rgb(255_255_255/0.1),0_5px_0_rgb(5_8_15/0.7)]',
  safe:
    'animate-pop border-mint-300/60 bg-linear-to-b from-mint-500/30 to-mint-600/15 text-mint-300 shadow-[0_0_24px_-6px_rgb(62_230_160/0.7),inset_0_1px_0_rgb(255_255_255/0.15)]',
  hit: 'animate-pop border-rose-300/70 bg-linear-to-b from-rose-500/45 to-rose-700/30 text-rose-200 shadow-[0_0_28px_-4px_rgb(244_63_94/0.8)]',
  mine: 'border-white/5 bg-night-950/60 text-rose-400/70',
  unpicked: 'border-white/5 bg-night-950/60 text-mint-300/30',
};

const TILE_LABELS: Record<TileView, string> = {
  hidden: 'hidden',
  safe: 'safe',
  hit: 'mine, hit',
  mine: 'mine',
  unpicked: 'safe, not picked',
};

interface MinesBoardProps {
  gridSize: number;
  tileCount: number;
  round: MinesRound | null;
  pendingTile: number | null;
  /** True while a round is running and no request is in flight. */
  playable: boolean;
  onReveal: (tile: number) => void;
}

/**
 * The board as real buttons, so it works with a keyboard and screen readers. Tiles of a running
 * round use aria-disabled rather than disabled, so focus is not lost while a reveal is in flight.
 */
export function MinesBoard({
  gridSize,
  tileCount,
  round,
  pendingTile,
  playable,
  onReveal,
}: MinesBoardProps) {
  return (
    <div
      className="panel p-5 sm:p-8"
      style={{
        background:
          'radial-gradient(70% 65% at 50% 40%, rgb(56 189 248 / 0.13), transparent 70%), linear-gradient(180deg, rgb(20 29 50 / 0.82), rgb(11 17 32 / 0.9))',
      }}
    >
      <div
        role="group"
        aria-label="Mines board"
        className="mx-auto grid w-full max-w-[500px] gap-2.5 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: tileCount }, (_, index) => {
          const view = tileView(round, index);
          const { row, column } = tilePosition(index, gridSize);
          const clickable = playable && view === 'hidden';
          const pending = pendingTile === index;
          return (
            <button
              key={index}
              type="button"
              aria-label={`Row ${row}, column ${column}: ${TILE_LABELS[view]}`}
              aria-busy={pending || undefined}
              aria-disabled={!clickable || undefined}
              disabled={round === null}
              onClick={() => {
                if (clickable) onReveal(index);
              }}
              className={cx(
                'flex aspect-square items-center justify-center rounded-xl border transition duration-150',
                TILE_CLASSES[view],
                clickable &&
                  'cursor-pointer hover:-translate-y-1 hover:border-sky-300/60 hover:from-[#3b4b75] hover:shadow-[0_10px_26px_-10px_rgb(56_189_248/0.7),0_5px_0_rgb(5_8_15/0.7)] active:translate-y-0.5',
                !clickable && 'cursor-default',
                round === null && 'opacity-55',
                pending && 'animate-pulse border-sky-300',
              )}
            >
              {view === 'safe' || view === 'unpicked' ? <GemIcon /> : null}
              {view === 'hit' || view === 'mine' ? <MineIcon /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
