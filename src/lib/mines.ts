import type { MinesRound, MinesSettings } from '../api/types';

/*
 * Display-only Mines helpers. The server alone places the mines and decides every reveal;
 * mine positions only reach the browser once a round has ended.
 */

/** Used to draw the board until GET /api/games answers. A running round carries its own size. */
export const DEFAULT_MINES_SETTINGS: MinesSettings = {
  gridSize: 5,
  tileCount: 25,
  minMines: 1,
  maxMines: 24,
};

/** Reads mines.settings from GET /api/games, or null if anything is missing or malformed. */
export function readMinesSettings(value: unknown): MinesSettings | null {
  if (typeof value !== 'object' || value === null) return null;
  const { gridSize, tileCount, minMines, maxMines } = value as Record<string, unknown>;
  if (![gridSize, tileCount, minMines, maxMines].every((n) => Number.isSafeInteger(n))) {
    return null;
  }
  const settings = { gridSize, tileCount, minMines, maxMines } as MinesSettings;
  if (settings.gridSize < 2 || settings.gridSize > 10) return null;
  if (settings.tileCount !== settings.gridSize * settings.gridSize) return null;
  if (settings.minMines < 1 || settings.minMines > settings.maxMines) return null;
  if (settings.maxMines >= settings.tileCount) return null;
  return settings;
}

/**
 * What one tile shows:
 * hidden = not revealed (or no round), safe = revealed safe tile, hit = the mine that ended
 * the round, mine = another mine shown after the round, unpicked = a safe tile left unopened.
 */
export type TileView = 'hidden' | 'safe' | 'hit' | 'mine' | 'unpicked';

export function tileView(round: MinesRound | null, index: number): TileView {
  if (!round) return 'hidden';
  const revealed = round.revealedTiles.includes(index);
  if (round.status === 'RUNNING') return revealed ? 'safe' : 'hidden';
  if (round.hitMine === index) return 'hit';
  if (round.minePositions.includes(index)) return 'mine';
  return revealed ? 'safe' : 'unpicked';
}

/** 1-based row and column, for labels. */
export function tilePosition(index: number, gridSize: number): { row: number; column: number } {
  return { row: Math.floor(index / gridSize) + 1, column: (index % gridSize) + 1 };
}
