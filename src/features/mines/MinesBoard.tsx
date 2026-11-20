import type { CSSProperties } from 'react';
import type { MinesRound } from '../../api/types';
import { cx } from '../../lib/cx';
import { tilePosition, tileView, type TileView } from '../../lib/mines';
import { ResultOverlay, type RoundOutcome } from '../games/ResultOverlay';

function GemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3/5 w-3/5">
      <path d="M7 3h10l5 6-10 12L2 9z" fill="currentColor" />
      <path
        d="M2 9h20M7 3l5 6 5-6M12 9v12"
        fill="none"
        stroke="#05080f"
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
  hidden: 'border-white/10 bg-[#25314f] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_4px_0_#111829]',
  safe: 'animate-flip border-mint-400/60 bg-mint-500/15 text-mint-300',
  hit: 'animate-shake border-rose-400/80 bg-rose-500/25 text-rose-200',
  mine: 'animate-fade border-white/5 bg-night-950/60 text-rose-400/80',
  unpicked: 'animate-fade border-white/5 bg-night-950/60 text-mint-300/35',
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
  /** Result shown over the board once the round ends. */
  outcome: RoundOutcome | null;
}

/**
 * The board as real buttons, so it works with a keyboard and screen readers. Tiles of a running
 * round use aria-disabled rather than disabled, so focus is not lost while a reveal is in flight.
 * Revealed tiles flip in; when the round ends the rest of the board fades in, one tile after
 * another.
 */
export function MinesBoard({
  gridSize,
  tileCount,
  round,
  pendingTile,
  playable,
  onReveal,
  outcome,
}: MinesBoardProps) {
  return (
    <div className="stage p-4 sm:p-6">
      <div
        role="group"
        aria-label="Mines board"
        className="mx-auto grid w-full max-w-[520px] gap-2 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: tileCount }, (_, index) => {
          const view = tileView(round, index);
          const { row, column } = tilePosition(index, gridSize);
          const clickable = playable && view === 'hidden';
          const pending = pendingTile === index;
          const style: CSSProperties | undefined =
            view === 'mine' || view === 'unpicked' ? { animationDelay: `${index * 18}ms` } : undefined;
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
              style={style}
              className={cx(
                'flex aspect-square items-center justify-center rounded-xl border transition duration-150',
                TILE_CLASSES[view],
                clickable &&
                  'cursor-pointer hover:-translate-y-0.5 hover:border-mint-400/50 hover:bg-[#2c3a5d] active:translate-y-0.5 active:shadow-none',
                !clickable && 'cursor-default',
                round === null && 'opacity-50',
                pending && 'animate-pulse border-mint-400',
              )}
            >
              {view === 'safe' || view === 'unpicked' ? <GemIcon /> : null}
              {view === 'hit' || view === 'mine' ? <MineIcon /> : null}
            </button>
          );
        })}
      </div>
      <ResultOverlay outcome={outcome} placement="center" />
    </div>
  );
}
