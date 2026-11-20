/*
 * Contracts for the Express API (see backend/README.md). Every response is wrapped in
 * { success, data } and http.ts unwraps it. Coin amounts are integers in minor units;
 * multipliers are integers in hundredths (100 = 1.00x).
 */

// Auth types are unused while sign-in is out of scope. Kept for a later phase.
export type Role = 'PLAYER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

/** Open string type: unknown future values still render through a fallback. */
type OpenString = string & Record<never, never>;

export type GameId = 'crash' | 'plinko' | 'mines' | 'dice';

export interface GameSummary {
  id: GameId;
  name: string;
  available: boolean;
  minStake?: number;
  maxStake?: number;
  configVersion?: number;
  /** Game-specific settings. Shape differs per game; read it with that game's parser. */
  settings?: unknown;
}

export type WalletTransactionType = 'STARTER_GRANT' | 'STAKE_DEBIT' | 'ROUND_RETURN';

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType | OpenString;
  /** Signed: negative for debits, positive for credits. */
  amount: number;
  balanceAfter: number;
  roundId: string | null;
  createdAt: string;
}

export interface Wallet {
  playerId: string;
  playerName: string;
  currencyCode: string;
  decimals: number;
  balance: number;
  updatedAt: string;
  /** Newest first. */
  recentTransactions: WalletTransaction[];
}

export interface HistoryItem {
  roundId: string;
  game: GameId | OpenString;
  status: string;
  stake: number;
  /** Null while the round is running. */
  virtualReturn: number | null;
  outcomeSummary: string | null;
  /** Short result for chips, e.g. "2.41x", "49.99" or "Bust". Null while running; absent on older servers. */
  resultLabel?: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface CrashCurve {
  type: 'exponential';
  /** multiplier = e^(growthPerMs x elapsedMs) */
  growthPerMs: number;
}

interface CrashRoundBase {
  roundId: string;
  game: 'crash';
  stake: number;
  configVersion: number;
  startedAt: string;
  serverTime: string;
  curve: CrashCurve;
}

/** The crash point is secret while a round runs, so it is not part of this shape. */
export interface CrashRunningRound extends CrashRoundBase {
  status: 'RUNNING';
  elapsedMs: number;
  currentMultiplierX100: number;
}

export interface CrashEndedRound extends CrashRoundBase {
  status: 'CASHED_OUT' | 'CRASHED';
  crashMultiplierX100: number;
  cashoutMultiplierX100: number | null;
  virtualReturn: number;
  outcomeSummary: string;
  completedAt: string;
}

export type CrashRound = CrashRunningRound | CrashEndedRound;

export interface CrashRoundResult {
  round: CrashRound;
  balance: number;
}

export interface CrashCashoutResult extends CrashRoundResult {
  /** True when the round had already been cashed out; nothing new was credited. */
  alreadySettled: boolean;
}

// ---- Plinko ----

export type PlinkoRisk = 'low' | 'medium' | 'high';

/** From GET /api/games (plinko.settings). Tables are indexed by bucket; keys are row counts. */
export interface PlinkoSettings {
  rows: number[];
  risks: PlinkoRisk[];
  multipliersX100: Record<string, Record<PlinkoRisk, number[]>>;
}

/** Plinko settles in one request, so a round is always SETTLED. */
export interface PlinkoRound {
  roundId: string;
  game: 'plinko';
  status: 'SETTLED';
  stake: number;
  configVersion: number;
  rows: number;
  risk: PlinkoRisk;
  /** One step per row: 0 = left, 1 = right. */
  path: number[];
  /** Number of rights, 0..rows. */
  bucket: number;
  multiplierX100: number;
  virtualReturn: number;
  outcomeSummary: string;
  startedAt: string;
  completedAt: string;
}

export interface PlinkoRoundResult {
  round: PlinkoRound;
  /** Balance after the stake and the return were both applied. */
  balance: number;
}

// ---- Dice ----

export type DiceDirection = 'under' | 'over';

/** From GET /api/games (dice.settings). Rolls and targets are in hundredths: 5000 = 50.00. */
export interface DiceSettings {
  /** Number of possible rolls: 10000 means 0.00 to 99.99. */
  rollSpan: number;
  /** Fewest and most winning rolls a bet may have (100 = 1.00% win chance). */
  minWinCount: number;
  maxWinCount: number;
  houseEdgeBps: number;
}

/** Dice settles in one request. */
export interface DiceRound {
  roundId: string;
  game: 'dice';
  status: 'WON' | 'LOST';
  stake: number;
  configVersion: number;
  target: number;
  direction: DiceDirection;
  /** Win chance in basis points of 100%: 5000 = 50.00%. */
  winChanceBps: number;
  multiplierX100: number;
  roll: number;
  won: boolean;
  virtualReturn: number;
  outcomeSummary: string;
  startedAt: string;
  completedAt: string;
}

export interface DiceRoundResult {
  round: DiceRound;
  balance: number;
}

// ---- Mines ----

/** From GET /api/games (mines.settings). Tiles are numbered 0..tileCount-1, row by row. */
export interface MinesSettings {
  gridSize: number;
  tileCount: number;
  minMines: number;
  maxMines: number;
}

interface MinesRoundBase {
  roundId: string;
  game: 'mines';
  stake: number;
  configVersion: number;
  gridSize: number;
  tileCount: number;
  mineCount: number;
  /** Safe tiles revealed so far, in the order they were picked. */
  revealedTiles: number[];
  safeReveals: number;
  currentMultiplierX100: number;
  startedAt: string;
}

/** Mine positions are secret while a round runs, so they are not part of this shape. */
export interface MinesRunningRound extends MinesRoundBase {
  status: 'RUNNING';
  /** Multiplier after one more safe tile. Null when every safe tile is revealed. */
  nextMultiplierX100: number | null;
  /** What a cash-out would pay now. Null before the first safe tile. */
  potentialReturn: number | null;
}

export interface MinesEndedRound extends MinesRoundBase {
  status: 'CASHED_OUT' | 'BUSTED';
  minePositions: number[];
  /** The mine the player revealed, or null after a cash-out. */
  hitMine: number | null;
  cashoutMultiplierX100: number | null;
  virtualReturn: number;
  outcomeSummary: string;
  completedAt: string;
}

export type MinesRound = MinesRunningRound | MinesEndedRound;

export interface MinesRoundResult {
  round: MinesRound;
  balance: number;
}

export interface MinesRevealResult extends MinesRoundResult {
  /** True when that tile had already been revealed; nothing changed. */
  alreadyRevealed: boolean;
}

export interface MinesCashoutResult extends MinesRoundResult {
  /** True when the round had already been cashed out; nothing new was credited. */
  alreadySettled: boolean;
}

export interface MinesActiveResult {
  round: MinesRunningRound | null;
  balance: number;
}
