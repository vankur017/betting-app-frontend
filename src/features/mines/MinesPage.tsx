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
import type { MinesEndedRound, MinesRound } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { useApiQuery } from '../../hooks/useApiQuery';
import { formatMultiplier } from '../../lib/crash';
import { cx } from '../../lib/cx';
import { messageOf, readDetailRound, readDetailRoundId } from '../../lib/errors';
import { newIdempotencyKey } from '../../lib/idempotency';
import { DEFAULT_MINES_SETTINGS, readMinesSettings } from '../../lib/mines';
import { formatCoins, formatSignedCoins, parseCoins, toCoinInput } from '../../lib/money';
import { useWallet } from '../../wallet/wallet-context';
import { gameBySlug } from '../games/catalog';
import { GameHeader } from '../games/GameHeader';
import { RecentRounds } from '../games/RecentRounds';
import { adjustedStake, limitsHint, stakeProblem } from '../games/stake';
import { StakeControls } from '../games/StakeControls';
import { MinesBoard } from './MinesBoard';

const MINES = gameBySlug('mines');
const DEFAULT_MINE_COUNT = 3;

function statusMessage(round: MinesRound | null): string {
  if (!round) return 'Pick a stake and the number of mines, then start a round.';
  switch (round.status) {
    case 'RUNNING':
      return round.safeReveals === 0
        ? 'Pick a tile. Avoid the mines.'
        : `${round.safeReveals} safe. Pick another tile or cash out.`;
    case 'CASHED_OUT':
      return `Cashed out at ${formatMultiplier(round.cashoutMultiplierX100 ?? 100)}. You received ${formatCoins(round.virtualReturn)} VC.`;
    case 'BUSTED':
      return 'You hit a mine. Your stake was lost.';
  }
}

function RoundResult({ round }: { round: MinesEndedRound }) {
  const won = round.status === 'CASHED_OUT';
  return (
    <div
      className={cx(
        'animate-pop rounded-xl border p-4',
        won ? 'border-mint-500/40 bg-mint-500/10' : 'border-rose-500/40 bg-rose-500/10',
      )}
    >
      <p className={cx('text-lg font-bold', won ? 'text-mint-300' : 'text-rose-300')}>
        {won
          ? `Cashed out at ${formatMultiplier(round.cashoutMultiplierX100 ?? 100)}`
          : 'Hit a mine'}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-night-300">Stake</dt>
        <dd className="text-right tabular-nums">{formatCoins(round.stake)}</dd>
        <dt className="text-night-300">Return</dt>
        <dd className="text-right tabular-nums">{formatCoins(round.virtualReturn)}</dd>
        <dt className="text-night-300">Net</dt>
        <dd className="text-right font-semibold tabular-nums">
          {formatSignedCoins(round.virtualReturn - round.stake)}
        </dd>
        <dt className="text-night-300">Mines</dt>
        <dd className="text-right tabular-nums">{round.mineCount}</dd>
        <dt className="text-night-300">Safe tiles</dt>
        <dd className="text-right tabular-nums">{round.safeReveals}</dd>
      </dl>
    </div>
  );
}

export function MinesPage() {
  const { wallet, refresh: refreshWallet } = useWallet();
  const games = useApiQuery(listGames);
  const summary = games.status === 'success' ? games.data.find((g) => g.id === 'mines') : undefined;
  const settings = readMinesSettings(summary?.settings) ?? DEFAULT_MINES_SETTINGS;

  const [stakeInput, setStakeInput] = useState('10');
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [mineCount, setMineCount] = useState(DEFAULT_MINE_COUNT);
  const [round, setRound] = useState<MinesRound | null>(null);
  const [busy, setBusy] = useState<'start' | 'cashout' | 'resume' | null>(null);
  const [pendingTile, setPendingTile] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

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
        setStakeInput(toCoinInput(active.stake));
        setNotice('You had a Mines round running, so it has been resumed.');
      },
      () => {
        // Not fatal: if a round is running, Start reports it and resumes it.
      },
    );
    return () => controller.abort();
  }, []);

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
    setActionError('The server no longer has this round. It may have been reset.');
    void refreshWallet();
  }

  function adjust(change: 'half' | 'double') {
    const parsed = parseCoins(stakeInput);
    if (!parsed.ok) return;
    const next = adjustedStake(parsed.value, change, summary);
    if (next === null) return;
    setStakeInput(toCoinInput(next));
    setStakeError(null);
  }

  async function resume(id: string) {
    setBusy('resume');
    try {
      const { round: active } = await getMinesRound(id);
      setRound(active);
      setNotice('You already had a round running, so it has been resumed.');
    } catch (error) {
      setActionError(messageOf(error, 'Could not load your running round.'));
    }
  }

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (round?.status === 'RUNNING' || busy) return;
    setActionError(null);
    setNotice(null);

    const parsed = parseCoins(stakeInput);
    if (!parsed.ok) {
      setStakeError(parsed.error);
      return;
    }
    const problem = stakeProblem(parsed.value, summary, wallet?.balance);
    if (problem) {
      setStakeError(problem);
      return;
    }
    setStakeError(null);

    const fingerprint = `${parsed.value}|${mineCount}`;
    const pending = pendingStart.current;
    const key = pending && pending.fingerprint === fingerprint ? pending.key : newIdempotencyKey();
    pendingStart.current = { key, fingerprint };

    setBusy('start');
    try {
      const result = await startMines(parsed.value, mineCount, key);
      pendingStart.current = null;
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
        setStakeError(error.fieldErrors.stake);
      } else {
        setActionError(messageOf(error, 'Could not start the round.'));
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleReveal(tile: number) {
    if (round?.status !== 'RUNNING' || busy || pendingTile !== null) return;
    if (round.revealedTiles.includes(tile)) return;
    setPendingTile(tile);
    setActionError(null);
    try {
      const result = await revealMinesTile(round.roundId, tile);
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
  }

  async function handleCashout() {
    if (round?.status !== 'RUNNING' || busy || pendingTile !== null) return;
    setBusy('cashout');
    setActionError(null);
    try {
      const result = await cashOutMines(round.roundId);
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
    } finally {
      setBusy(null);
    }
  }

  const running = round?.status === 'RUNNING';
  const controlsLocked = running || busy !== null;
  const gridSize = round?.gridSize ?? settings.gridSize;
  const tileCount = round?.tileCount ?? settings.tileCount;
  const mineOptions = Array.from(
    { length: settings.maxMines - settings.minMines + 1 },
    (_, i) => settings.minMines + i,
  );

  return (
    <div className="flex flex-col gap-8">
      <GameHeader game="mines" />

      {games.status === 'error' ? (
        <Alert tone="warning">Mines settings are unavailable: {games.error}</Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <section
          aria-labelledby="mines-controls-heading"
          className="order-2 flex flex-col gap-5 panel p-5 lg:order-1"
        >
          <h2 id="mines-controls-heading" className="sr-only">
            Round controls
          </h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-night-300">Demo balance</span>
            <span className="font-semibold tabular-nums">
              {wallet ? `${formatCoins(wallet.balance)} ${wallet.currencyCode}` : '—'}
            </span>
          </div>

          <form noValidate onSubmit={(event) => void handleStart(event)} className="flex flex-col gap-4">
            <StakeControls
              value={stakeInput}
              onChange={(value) => {
                setStakeInput(value);
                setStakeError(null);
              }}
              onAdjust={adjust}
              disabled={controlsLocked}
              error={stakeError ?? undefined}
              hint={limitsHint(summary)}
            />

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="eyebrow">Mines</span>
              <select
                name="mineCount"
                value={mineCount}
                onChange={(event) => setMineCount(Number(event.target.value))}
                disabled={controlsLocked}
                className="rounded-xl border border-white/10 bg-night-950/70 px-3.5 py-2.5 text-base font-semibold text-night-100 shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)] transition hover:border-white/20 focus:outline-none focus-visible:border-mint-400/70 focus-visible:ring-4 focus-visible:ring-mint-400/15 disabled:opacity-60"
              >
                {mineOptions.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
              <span className="text-xs text-night-300">More mines pay more per safe tile.</span>
            </label>

            {round?.status === 'RUNNING' ? (
              <Button
                className="py-3 text-base"
                onClick={() => void handleCashout()}
                loading={busy === 'cashout'}
                disabled={round.safeReveals === 0 || pendingTile !== null}
              >
                {round.potentialReturn === null
                  ? 'Cash out'
                  : `Cash out ${formatCoins(round.potentialReturn)} VC`}
              </Button>
            ) : (
              <Button
                type="submit"
                className="py-3 text-base"
                loading={busy === 'start' || busy === 'resume'}
              >
                Start round
              </Button>
            )}
          </form>

          {round?.status === 'RUNNING' ? (
            <dl className="grid grid-cols-3 gap-2 panel-inset p-3 text-center">
              <div>
                <dt className="text-xs text-night-300">Multiplier</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {formatMultiplier(round.currentMultiplierX100)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-night-300">Next tile</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {round.nextMultiplierX100 === null
                    ? '—'
                    : formatMultiplier(round.nextMultiplierX100)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-night-300">Safe tiles</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {round.safeReveals} / {round.tileCount - round.mineCount}
                </dd>
              </div>
            </dl>
          ) : null}

          <p role="status" className="text-sm text-night-300">
            {statusMessage(round)}
          </p>

          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          {notice ? <Alert tone="info">{notice}</Alert> : null}
          {round && round.status !== 'RUNNING' ? <RoundResult round={round} /> : null}
        </section>

        <div className="order-1 lg:order-2">
          <MinesBoard
            gridSize={gridSize}
            tileCount={tileCount}
            round={round}
            pendingTile={pendingTile}
            playable={running && busy === null && pendingTile === null}
            onReveal={(tile) => void handleReveal(tile)}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="mines-rules-heading"
          className="panel p-5"
        >
          <h2 id="mines-rules-heading" className="text-lg font-semibold">
            How Mines works
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-night-300">
            {MINES?.rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ol>
        </section>
        <RecentRounds game="mines" version={historyVersion} />
      </div>

      <p className="text-xs text-night-300">
        Virtual coins only. Coins have no monetary value and cannot be redeemed.
      </p>
    </div>
  );
}
