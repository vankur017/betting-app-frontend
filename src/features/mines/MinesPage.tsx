import { useEffect, useRef, useState, type FormEvent } from 'react';
import { listGames } from '../../api/games';
import { ApiError } from '../../api/http';
import {
  cashOutMines,
  getActiveMinesRound,
  getMinesRound,
  revealMinesTile,
  startMines,
} from '../../api/mines';
import type { MinesRevealResult, MinesRound } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toast-context';
import { useApiQuery } from '../../hooks/useApiQuery';
import { formatMultiplier } from '../../lib/crash';
import { cx } from '../../lib/cx';
import { messageOf, readDetailRound, readDetailRoundId } from '../../lib/errors';
import { newIdempotencyKey } from '../../lib/idempotency';
import { DEFAULT_MINES_SETTINGS, readMinesSettings } from '../../lib/mines';
import { formatCoins, formatSignedCoins } from '../../lib/money';
import { outcomeSound, sound } from '../../lib/sound';
import { useWallet } from '../../wallet/wallet-context';
import { BetAmountField } from '../games/BetAmountField';
import { GameLayout } from '../games/GameLayout';
import type { RoundOutcome } from '../games/ResultOverlay';
import { StatGrid, type Stat } from '../games/StatGrid';
import { limitsHint } from '../games/stake';
import { useInFlight } from '../games/useInFlight';
import { useRecentRounds } from '../games/useRecentRounds';
import { useStake } from '../games/useStake';
import { MinesBoard } from './MinesBoard';

const FORM_ID = 'mines-bet-form';
const DEFAULT_MINE_COUNT = 3;
const MINE_PRESETS = [1, 3, 5, 10, 24];

type Busy = 'start' | 'reveal' | 'cashout';

const stepClass =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-night-800 text-lg font-semibold text-night-100 transition hover:border-white/20 hover:bg-night-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40';

interface MineCountPickerProps {
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}

/** Stepper plus common presets. More mines: fewer safe tiles, bigger multipliers. */
function MineCountPicker({ value, min, max, disabled, onChange }: MineCountPickerProps) {
  const presets = MINE_PRESETS.filter((count) => count >= min && count <= max);
  const pick = (next: number) => {
    if (next !== value) sound.play('click');
    onChange(next);
  };
  return (
    <fieldset className="flex flex-col disabled:opacity-60" disabled={disabled}>
      <legend className="eyebrow mb-2">Mines</legend>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={stepClass}
          aria-label="Fewer mines"
          onClick={() => pick(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          −
        </button>
        <output
          aria-live="polite"
          className="panel-inset flex h-11 flex-1 items-center justify-center text-lg font-bold tabular-nums"
        >
          {value}
        </output>
        <button
          type="button"
          className={stepClass}
          aria-label="More mines"
          onClick={() => pick(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          +
        </button>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {presets.map((count) => (
          <button
            key={count}
            type="button"
            aria-pressed={count === value}
            onClick={() => pick(count)}
            className={cx(
              'rounded-lg py-2 text-xs font-semibold transition',
              count === value
                ? 'bg-mint-500/15 text-mint-300 ring-1 ring-mint-400/40'
                : 'bg-night-800 text-night-300 hover:bg-night-700 hover:text-night-100',
            )}
          >
            {count}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** A rising chime per safe tile, a blast for a mine, coins when the board is cleared. */
function playRevealSound({ round, alreadyRevealed }: MinesRevealResult): void {
  if (alreadyRevealed) return;
  if (round.status === 'BUSTED') {
    sound.play('bomb');
    return;
  }
  sound.play('gem', { step: round.safeReveals });
  if (round.status === 'CASHED_OUT') playCashoutSound(round);
}

function playCashoutSound(round: MinesRound): void {
  if (round.status !== 'CASHED_OUT') return;
  sound.play('cashout');
  if (outcomeSound(round.stake, round.virtualReturn) === 'bigWin') sound.play('bigWin');
}

function statusMessage(round: MinesRound | null, busy: Busy | null): string {
  if (busy === 'start') return 'Placing your bet…';
  if (busy === 'cashout') return 'Cashing out…';
  if (!round) return 'Pick a bet and the number of mines, then start a game.';
  switch (round.status) {
    case 'RUNNING':
      if (busy === 'reveal') return 'Revealing…';
      return round.safeReveals === 0
        ? 'Pick a tile. Avoid the mines.'
        : `${round.safeReveals} safe. Pick another tile or cash out.`;
    case 'CASHED_OUT':
      return `Cashed out at ${formatMultiplier(round.cashoutMultiplierX100 ?? 100)}. You received ${formatCoins(round.virtualReturn)} VC.`;
    case 'BUSTED':
      return 'You hit a mine. Your bet was lost.';
  }
}

export function MinesPage() {
  const { wallet, refresh: refreshWallet } = useWallet();
  const toast = useToast();
  const games = useApiQuery(listGames);
  const summary = games.status === 'success' ? games.data.find((g) => g.id === 'mines') : undefined;
  const settings = readMinesSettings(summary?.settings) ?? DEFAULT_MINES_SETTINGS;
  const stake = useStake('mines', summary, wallet?.balance);

  const [mineCount, setMineCount] = useState(DEFAULT_MINE_COUNT);
  const [round, setRound] = useState<MinesRound | null>(null);
  const { busy, run } = useInFlight<Busy>();
  const [pendingTile, setPendingTile] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const history = useRecentRounds('mines', historyVersion);

  // Reused only when retrying the same start after a network failure, so a lost response
  // cannot cause a second debit.
  const pendingStart = useRef<{ key: string; fingerprint: string } | null>(null);

  // Resume a round left running (page refresh, another tab). Mines stay hidden on the server.
  useEffect(() => {
    const controller = new AbortController();
    getActiveMinesRound(controller.signal).then(
      ({ round: active }) => {
        if (controller.signal.aborted || !active) return;
        setRound((current) => current ?? active);
        setMineCount(active.mineCount);
        toast.show({ title: 'Round resumed', message: 'You had a Mines round running.' });
      },
      () => {
        // Not fatal: if a round is running, Start reports it and resumes it.
      },
    );
    return () => controller.abort();
  }, [toast]);

  // When a round ends, re-read the balance and recent rounds from the server.
  const roundId = round?.roundId ?? null;
  const roundEnded = round !== null && round.status !== 'RUNNING';
  useEffect(() => {
    if (!roundEnded) return;
    void refreshWallet();
    setHistoryVersion((version) => version + 1);
  }, [roundEnded, roundId, refreshWallet]);

  function roundLost() {
    setRound(null);
    toast.show({
      tone: 'error',
      title: 'Round not found',
      message: 'The server no longer has this round. It may have been reset.',
    });
    void refreshWallet();
  }

  async function resume(id: string) {
    try {
      const { round: active } = await getMinesRound(id);
      setRound(active);
      toast.show({ title: 'Round resumed', message: 'You already had a Mines round running.' });
    } catch (error) {
      setActionError(messageOf(error, 'Could not load your running round.'));
    }
  }

  function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (round?.status === 'RUNNING') return;
    void run('start', async () => {
      setActionError(null);
      const value = stake.validate();
      if (value === null) return;

      const fingerprint = `${value}|${mineCount}`;
      const pending = pendingStart.current;
      const key = pending && pending.fingerprint === fingerprint ? pending.key : newIdempotencyKey();
      pendingStart.current = { key, fingerprint };

      try {
        const result = await startMines(value, mineCount, key);
        pendingStart.current = null;
        sound.play('bet');
        setRound(result.round);
        void refreshWallet();
      } catch (error) {
        const isNetworkError = error instanceof ApiError && error.status === 0;
        if (!isNetworkError) pendingStart.current = null;

        if (error instanceof ApiError && error.code === 'ROUND_IN_PROGRESS') {
          const activeId = readDetailRoundId(error.details);
          if (activeId) {
            await resume(activeId);
            return;
          }
        }
        if (error instanceof ApiError && error.fieldErrors.stake) {
          stake.setError(error.fieldErrors.stake);
        } else {
          setActionError(messageOf(error, 'Could not start the game.'));
        }
      }
    });
  }

  function handleReveal(tile: number) {
    if (round?.status !== 'RUNNING' || round.revealedTiles.includes(tile)) return;
    const id = round.roundId;
    void run('reveal', async () => {
      setPendingTile(tile);
      setActionError(null);
      try {
        const result = await revealMinesTile(id, tile);
        playRevealSound(result);
        setRound(result.round);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          roundLost();
          return;
        }
        // The round ended elsewhere (another tab): show how it ended.
        const ended =
          error instanceof ApiError && error.code === 'ROUND_ENDED'
            ? readDetailRound<MinesRound>(error.details, 'mines')
            : null;
        if (ended) setRound(ended);
        else setActionError(messageOf(error, 'Could not reveal that tile. Try again.'));
      } finally {
        setPendingTile(null);
      }
    });
  }

  /** Picks one of the hidden tiles for the player. Only the choice is random here, not the result. */
  function revealRandom() {
    if (round?.status !== 'RUNNING') return;
    const hidden = Array.from({ length: round.tileCount }, (_, i) => i).filter(
      (i) => !round.revealedTiles.includes(i),
    );
    if (hidden.length > 0) handleReveal(hidden[Math.floor(Math.random() * hidden.length)]);
  }

  function handleCashout() {
    if (round?.status !== 'RUNNING') return;
    const id = round.roundId;
    void run('cashout', async () => {
      setActionError(null);
      try {
        const result = await cashOutMines(id);
        if (!result.alreadySettled) playCashoutSound(result.round);
        setRound(result.round);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          roundLost();
          return;
        }
        const busted =
          error instanceof ApiError && error.code === 'ROUND_BUSTED'
            ? readDetailRound<MinesRound>(error.details, 'mines')
            : null;
        if (busted) setRound(busted);
        else setActionError(messageOf(error, 'Cash-out failed. Try again.'));
      }
    });
  }

  const running = round?.status === 'RUNNING';
  const controlsLocked = running || busy !== null;
  const gridSize = round?.gridSize ?? settings.gridSize;
  const tileCount = round?.tileCount ?? settings.tileCount;

  const stats: Stat[] =
    round?.status === 'RUNNING'
      ? [
          {
            label: 'Multiplier',
            value: formatMultiplier(round.currentMultiplierX100),
            tone: 'accent',
          },
          {
            label: 'Next tile',
            value:
              round.nextMultiplierX100 === null ? '—' : formatMultiplier(round.nextMultiplierX100),
          },
          {
            label: 'Profit',
            value:
              round.potentialReturn === null
                ? '—'
                : formatSignedCoins(round.potentialReturn - round.stake),
            tone: round.potentialReturn === null ? 'default' : 'win',
          },
        ]
      : [
          { label: 'Mines', value: String(mineCount) },
          { label: 'Safe', value: String(settings.tileCount - mineCount) },
          {
            label: 'Safe pick',
            value: `${Math.round(((settings.tileCount - mineCount) / settings.tileCount) * 100)}%`,
          },
        ];

  const outcome: RoundOutcome | null =
    round && round.status !== 'RUNNING'
      ? {
          key: round.roundId,
          net: round.virtualReturn - round.stake,
          label:
            round.status === 'CASHED_OUT'
              ? `Cashed out at ${formatMultiplier(round.cashoutMultiplierX100 ?? 100)}`
              : 'You hit a mine',
        }
      : null;

  const action =
    round?.status === 'RUNNING' ? (
      <>
        <Button
          className="py-3.5 text-base"
          onClick={handleCashout}
          loading={busy === 'cashout'}
          disabled={round.safeReveals === 0 || busy !== null}
        >
          {round.potentialReturn === null
            ? 'Cash out'
            : `Cash out ${formatCoins(round.potentialReturn)} VC`}
        </Button>
        <Button variant="secondary" className="py-3.5" onClick={revealRandom} disabled={busy !== null}>
          Random tile
        </Button>
      </>
    ) : (
      <Button
        type="submit"
        form={FORM_ID}
        className="py-3.5 text-base"
        loading={busy === 'start'}
        disabled={busy !== null}
      >
        {round ? 'New game' : 'Start game'}
      </Button>
    );

  return (
    <GameLayout
      game="mines"
      formId={FORM_ID}
      onSubmit={handleStart}
      notice={
        games.status === 'error' ? (
          <Alert tone="warning">Mines settings are unavailable: {games.error}</Alert>
        ) : null
      }
      controls={
        <>
          <BetAmountField stake={stake} disabled={controlsLocked} hint={limitsHint(summary)} />
          <MineCountPicker
            value={mineCount}
            min={settings.minMines}
            max={settings.maxMines}
            disabled={controlsLocked}
            onChange={setMineCount}
          />
        </>
      }
      summary={<StatGrid stats={stats} />}
      action={action}
      status={statusMessage(round, busy)}
      alerts={actionError ? <Alert tone="error">{actionError}</Alert> : null}
      stage={
        <MinesBoard
          gridSize={gridSize}
          tileCount={tileCount}
          round={round}
          pendingTile={pendingTile}
          playable={running && busy === null}
          onReveal={handleReveal}
          outcome={outcome}
        />
      }
      history={history}
    />
  );
}
