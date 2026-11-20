import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { cashOutCrashRound, getCrashRound, startCrashRound } from '../../api/crash';
import { listGames } from '../../api/games';
import { ApiError } from '../../api/http';
import type { CrashEndedRound, CrashRound } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { useApiQuery } from '../../hooks/useApiQuery';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { formatMultiplier } from '../../lib/crash';
import { cx } from '../../lib/cx';
import { messageOf } from '../../lib/errors';
import { newIdempotencyKey } from '../../lib/idempotency';
import { formatCoins, formatSignedCoins, parseCoins, toCoinInput } from '../../lib/money';
import { useWallet } from '../../wallet/wallet-context';
import { gameBySlug } from '../games/catalog';
import { GameHeader } from '../games/GameHeader';
import { CrashCanvas } from './CrashCanvas';
import { CrashRecentRounds } from './CrashRecentRounds';
import {
  createIdleVisualState,
  readCrashRound,
  readRoundId,
  syncVisualState,
  timed,
  type RequestTiming,
} from './crashVisualState';

// How often a running round is re-read to learn whether the server has crashed it.
const POLL_INTERVAL_MS = 250;
const CRASH = gameBySlug('crash');

function statusMessage(round: CrashRound | null): string {
  if (!round) return 'Enter a stake and start a round.';
  switch (round.status) {
    case 'RUNNING':
      return 'Round running. Cash out before it crashes.';
    case 'CASHED_OUT':
      return `Cashed out at ${formatMultiplier(round.cashoutMultiplierX100 ?? 100)}. You received ${formatCoins(round.virtualReturn)} VC.`;
    case 'CRASHED':
      return `Crashed at ${formatMultiplier(round.crashMultiplierX100)}. Your stake was lost.`;
  }
}

function RoundResult({ round }: { round: CrashEndedRound }) {
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
          : `Crashed at ${formatMultiplier(round.crashMultiplierX100)}`}
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
        <dt className="text-night-300">Crash point</dt>
        <dd className="text-right tabular-nums">{formatMultiplier(round.crashMultiplierX100)}</dd>
      </dl>
    </div>
  );
}

export function CrashPage() {
  const { wallet, refresh: refreshWallet } = useWallet();
  const games = useApiQuery(listGames);
  const limits = games.status === 'success' ? games.data.find((g) => g.id === 'crash') : undefined;

  const reducedMotion = usePrefersReducedMotion();
  // One stable object shared with Phaser for the life of this page.
  const [visual] = useState(() => createIdleVisualState(reducedMotion));
  useEffect(() => {
    visual.reducedMotion = reducedMotion;
  }, [visual, reducedMotion]);

  const [stakeInput, setStakeInput] = useState('10');
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [round, setRound] = useState<CrashRound | null>(null);
  const [busy, setBusy] = useState<'start' | 'cashout' | 'resume' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [connectionLost, setConnectionLost] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  // Reused only when retrying the same stake after a network failure, so a lost response
  // cannot cause a second debit.
  const pendingStart = useRef<{ key: string; stake: number } | null>(null);
  // Ignores a stale RUNNING poll that lands after the round has already been settled.
  const settledRoundId = useRef<string | null>(null);

  const applyRound = useCallback(
    (next: CrashRound, timing?: RequestTiming) => {
      if (next.status === 'RUNNING' && settledRoundId.current === next.roundId) return;
      syncVisualState(visual, next, timing, performance.now());
      if (next.status !== 'RUNNING') settledRoundId.current = next.roundId;
      setRound(next);
    },
    [visual],
  );

  const resetRound = useCallback(() => {
    Object.assign(visual, createIdleVisualState(visual.reducedMotion));
    setRound(null);
  }, [visual]);

  // When a round ends, re-read the balance and recent rounds from the server.
  const roundId = round?.roundId ?? null;
  const roundEnded = round !== null && round.status !== 'RUNNING';
  useEffect(() => {
    if (!roundEnded) return;
    void refreshWallet();
    setHistoryVersion((version) => version + 1);
  }, [roundEnded, roundId, refreshWallet]);

  // Poll the running round. The server, not the animation, decides when it crashes.
  const runningRoundId = round?.status === 'RUNNING' ? round.roundId : null;
  useEffect(() => {
    if (!runningRoundId) return;
    const controller = new AbortController();
    let cancelled = false;
    let timer: number | undefined;

    async function poll(id: string) {
      try {
        const { value, timing } = await timed(() => getCrashRound(id, controller.signal));
        if (cancelled) return;
        setConnectionLost(false);
        applyRound(value.round, timing);
        if (value.round.status !== 'RUNNING') return;
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          resetRound();
          setActionError('The server no longer has this round. It may have restarted.');
          void refreshWallet();
          return;
        }
        setConnectionLost(true);
      }
      timer = window.setTimeout(() => void poll(id), POLL_INTERVAL_MS);
    }

    timer = window.setTimeout(() => void poll(runningRoundId), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [runningRoundId, applyRound, resetRound, refreshWallet]);

  function stakeProblem(stake: number): string | null {
    if (stake <= 0) return 'Enter an amount above zero.';
    if (limits?.minStake !== undefined && stake < limits.minStake) {
      return `Minimum stake is ${formatCoins(limits.minStake)} VC.`;
    }
    if (limits?.maxStake !== undefined && stake > limits.maxStake) {
      return `Maximum stake is ${formatCoins(limits.maxStake)} VC.`;
    }
    if (wallet && stake > wallet.balance) return 'Not enough virtual coins for this stake.';
    return null;
  }

  function adjustStake(change: 'half' | 'double') {
    const parsed = parseCoins(stakeInput);
    if (!parsed.ok) return;
    let next = change === 'half' ? Math.floor(parsed.value / 2) : parsed.value * 2;
    if (limits?.minStake !== undefined) next = Math.max(next, limits.minStake);
    if (limits?.maxStake !== undefined) next = Math.min(next, limits.maxStake);
    if (!Number.isSafeInteger(next)) return;
    setStakeInput(toCoinInput(next));
    setStakeError(null);
  }

  async function resumeRound(id: string) {
    setBusy('resume');
    try {
      const { value, timing } = await timed(() => getCrashRound(id));
      applyRound(value.round, timing);
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
    setConnectionLost(false);

    const parsed = parseCoins(stakeInput);
    if (!parsed.ok) {
      setStakeError(parsed.error);
      return;
    }
    const problem = stakeProblem(parsed.value);
    if (problem) {
      setStakeError(problem);
      return;
    }
    setStakeError(null);

    const pending = pendingStart.current;
    const key = pending && pending.stake === parsed.value ? pending.key : newIdempotencyKey();
    pendingStart.current = { key, stake: parsed.value };

    setBusy('start');
    try {
      const { value, timing } = await timed(() => startCrashRound(parsed.value, key));
      pendingStart.current = null;
      applyRound(value.round, timing);
      void refreshWallet();
    } catch (error) {
      const isNetworkError = error instanceof ApiError && error.status === 0;
      if (!isNetworkError) pendingStart.current = null;

      if (error instanceof ApiError && error.code === 'ROUND_IN_PROGRESS') {
        const activeId = readRoundId(error.details);
        if (activeId) {
          await resumeRound(activeId);
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

  async function handleCashout() {
    if (round?.status !== 'RUNNING' || busy) return;
    setBusy('cashout');
    setActionError(null);
    try {
      const result = await cashOutCrashRound(round.roundId);
      applyRound(result.round);
    } catch (error) {
      const crashed =
        error instanceof ApiError && error.code === 'ROUND_CRASHED'
          ? readCrashRound(error.details)
          : null;
      if (crashed) {
        applyRound(crashed);
      } else {
        // Retrying is safe: the server never pays a round twice.
        setActionError(messageOf(error, 'Cash-out failed. Try again.'));
      }
    } finally {
      setBusy(null);
    }
  }

  const running = round?.status === 'RUNNING';
  const controlsLocked = running || busy !== null;
  const limitsHint =
    limits?.minStake !== undefined && limits.maxStake !== undefined
      ? `${formatCoins(limits.minStake)} – ${formatCoins(limits.maxStake)} VC`
      : undefined;

  return (
    <div className="flex flex-col gap-8">
      <GameHeader game="crash" />

      {games.status === 'error' ? (
        <Alert tone="warning">Stake limits are unavailable: {games.error}</Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <section
          aria-labelledby="crash-controls-heading"
          className="order-2 flex flex-col gap-5 panel p-5 lg:order-1"
        >
          <h2 id="crash-controls-heading" className="sr-only">
            Round controls
          </h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-night-300">Demo balance</span>
            <span className="font-semibold tabular-nums">
              {wallet ? `${formatCoins(wallet.balance)} ${wallet.currencyCode}` : '—'}
            </span>
          </div>

          <form noValidate onSubmit={(event) => void handleStart(event)} className="flex flex-col gap-3">
            <TextField
              label="Stake (VC)"
              name="stake"
              inputMode="decimal"
              autoComplete="off"
              value={stakeInput}
              onChange={(event) => {
                setStakeInput(event.target.value);
                setStakeError(null);
              }}
              disabled={controlsLocked}
              error={stakeError ?? undefined}
              hint={limitsHint}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                aria-label="Halve stake"
                onClick={() => adjustStake('half')}
                disabled={controlsLocked}
              >
                ½
              </Button>
              <Button
                variant="secondary"
                aria-label="Double stake"
                onClick={() => adjustStake('double')}
                disabled={controlsLocked}
              >
                2×
              </Button>
            </div>
            {running ? (
              <Button
                className="py-3 text-base"
                onClick={() => void handleCashout()}
                loading={busy === 'cashout'}
              >
                Cash out
              </Button>
            ) : (
              <Button type="submit" className="py-3 text-base" loading={busy === 'start' || busy === 'resume'}>
                Start round
              </Button>
            )}
          </form>

          {round?.status === 'RUNNING' ? (
            <p className="text-sm text-night-300">
              Server multiplier{' '}
              <span className="font-semibold tabular-nums text-night-100">
                {formatMultiplier(round.currentMultiplierX100)}
              </span>
            </p>
          ) : null}
          <p role="status" className="text-sm text-night-300">
            {statusMessage(round)}
          </p>

          {connectionLost ? <Alert tone="warning">Connection lost. Retrying…</Alert> : null}
          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          {notice ? <Alert tone="info">{notice}</Alert> : null}
          {round && round.status !== 'RUNNING' ? <RoundResult round={round} /> : null}
        </section>

        <div className="order-1 lg:order-2">
          <CrashCanvas state={visual} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="crash-rules-heading"
          className="panel p-5"
        >
          <h2 id="crash-rules-heading" className="text-lg font-semibold">
            How Crash works
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-night-300">
            {CRASH?.rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ol>
        </section>
        <CrashRecentRounds version={historyVersion} />
      </div>

      <p className="text-xs text-night-300">
        Virtual coins only. Coins have no monetary value and cannot be redeemed.
      </p>
    </div>
  );
}
