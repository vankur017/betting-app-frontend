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
