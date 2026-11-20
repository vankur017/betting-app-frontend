import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { cashOutCrashRound, getCrashRound, startCrashRound } from '../../api/crash';
import { listGames } from '../../api/games';
import { ApiError } from '../../api/http';
import type { CrashRound } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toast-context';
import { useApiQuery } from '../../hooks/useApiQuery';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { formatMultiplier } from '../../lib/crash';
import { messageOf, readDetailRoundId } from '../../lib/errors';
import { newIdempotencyKey } from '../../lib/idempotency';
import { estimatePayout, formatCoins, formatSignedCoins } from '../../lib/money';
import { outcomeSound, sound } from '../../lib/sound';
import { useWallet } from '../../wallet/wallet-context';
import { BetAmountField } from '../games/BetAmountField';
import { GameLayout } from '../games/GameLayout';
import { ResultOverlay, type RoundOutcome } from '../games/ResultOverlay';
import { StatGrid, type Stat } from '../games/StatGrid';
import { limitsHint } from '../games/stake';
import { useInFlight } from '../games/useInFlight';
import { useRecentRounds } from '../games/useRecentRounds';
import { useStake } from '../games/useStake';
import { CrashCanvas } from './CrashCanvas';
import {
  createIdleVisualState,
  readCrashRound,
  syncVisualState,
  timed,
  type RequestTiming,
} from './crashVisualState';
import { useLiveMultiplier } from './useLiveMultiplier';

// How often a running round is re-read to learn whether the server has crashed it.
const POLL_INTERVAL_MS = 250;
const FORM_ID = 'crash-bet-form';

type Busy = 'start' | 'cashout';

function statusMessage(round: CrashRound | null, busy: Busy | null): string {
  if (busy === 'start') return 'Placing your bet…';
  if (busy === 'cashout') return 'Cashing out…';
  if (!round) return 'Enter a bet and press Place bet.';
  switch (round.status) {
    case 'RUNNING':
      return 'Round running. Cash out before it crashes.';
    case 'CASHED_OUT':
      return `Cashed out at ${formatMultiplier(round.cashoutMultiplierX100 ?? 100)}. You received ${formatCoins(round.virtualReturn)} VC.`;
    case 'CRASHED':
      return `Crashed at ${formatMultiplier(round.crashMultiplierX100)}. Your bet was lost.`;
  }
}

/** True for elements where Space already means something (typing, pressing a button). */
function isInteractive(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('input, textarea, select, button, a, [contenteditable="true"]') !== null
  );
}

export function CrashPage() {
  const { wallet, refresh: refreshWallet } = useWallet();
  const toast = useToast();
  const games = useApiQuery(listGames);
  const limits = games.status === 'success' ? games.data.find((g) => g.id === 'crash') : undefined;
  const stake = useStake('crash', limits, wallet?.balance);

  const reducedMotion = usePrefersReducedMotion();
  // One stable object shared with Phaser for the life of this page.
  const [visual] = useState(() => createIdleVisualState(reducedMotion));
  useEffect(() => {
    visual.reducedMotion = reducedMotion;
  }, [visual, reducedMotion]);

  const [round, setRound] = useState<CrashRound | null>(null);
  const { busy, run } = useInFlight<Busy>();
  const [actionError, setActionError] = useState<string | null>(null);
  const [connectionLost, setConnectionLost] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const history = useRecentRounds('crash', historyVersion);

  // Reused only when retrying the same stake after a network failure, so a lost response
  // cannot cause a second debit.
  const pendingStart = useRef<{ key: string; stake: number } | null>(null);
  // Ignores a stale RUNNING poll that lands after the round has already been settled.
  const settledRoundId = useRef<string | null>(null);

  const running = round?.status === 'RUNNING';
  const runningStake = round?.status === 'RUNNING' ? round.stake : null;
  const liveX100 = useLiveMultiplier(visual, running);

  useEffect(() => {
    visual.stake = runningStake;
  }, [visual, runningStake]);

  // Sound: a quiet rising tone while the round runs, a chime at each whole multiplier, then the
  // crash or the cash-out. All of it follows what the server reported.
  useEffect(() => {
    if (!running) return;
    sound.startRise();
    return () => sound.stopRise();
  }, [running]);
  const lastMilestone = useRef(1);
  useEffect(() => {
    if (!running) {
      lastMilestone.current = 1;
      return;
    }
    sound.setRise(liveX100);
    const whole = Math.floor(liveX100 / 100);
    if (whole > lastMilestone.current) {
      lastMilestone.current = whole;
      sound.play('milestone', { step: whole });
    }
  }, [running, liveX100]);
  const soundedRoundId = useRef<string | null>(null);
  useEffect(() => {
    if (!round || round.status === 'RUNNING' || soundedRoundId.current === round.roundId) return;
    soundedRoundId.current = round.roundId;
    if (round.status === 'CRASHED') {
      sound.play('crash');
      return;
    }
    sound.play('cashout');
    if (outcomeSound(round.stake, round.virtualReturn) === 'bigWin') sound.play('bigWin');
  }, [round]);
  useEffect(() => {
    visual.idleCaption = busy === 'start' ? 'Starting round…' : 'Place a bet to start';
  }, [visual, busy]);

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
          toast.show({
            tone: 'error',
            title: 'Round not found',
            message: 'The server no longer has this round. It may have restarted.',
          });
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
  }, [runningRoundId, applyRound, resetRound, refreshWallet, toast]);

  async function resumeRound(id: string) {
    try {
      const { value, timing } = await timed(() => getCrashRound(id));
      applyRound(value.round, timing);
      toast.show({ title: 'Round resumed', message: 'You already had a Crash round running.' });
    } catch (error) {
      setActionError(messageOf(error, 'Could not load your running round.'));
    }
  }

  function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running) return;
    void run('start', async () => {
      setActionError(null);
      setConnectionLost(false);
      const value = stake.validate();
      if (value === null) return;

      const pending = pendingStart.current;
      const key = pending && pending.stake === value ? pending.key : newIdempotencyKey();
      pendingStart.current = { key, stake: value };

      try {
        const { value: result, timing } = await timed(() => startCrashRound(value, key));
        pendingStart.current = null;
        sound.play('bet');
        applyRound(result.round, timing);
        void refreshWallet();
      } catch (error) {
        const isNetworkError = error instanceof ApiError && error.status === 0;
        if (!isNetworkError) pendingStart.current = null;

        if (error instanceof ApiError && error.code === 'ROUND_IN_PROGRESS') {
          const activeId = readDetailRoundId(error.details);
          if (activeId) {
            await resumeRound(activeId);
            return;
          }
        }
        if (error instanceof ApiError && error.fieldErrors.stake) {
          stake.setError(error.fieldErrors.stake);
        } else {
          setActionError(messageOf(error, 'Could not start the round.'));
        }
      }
    });
  }

  function handleCashout() {
    if (round?.status !== 'RUNNING') return;
    const id = round.roundId;
    void run('cashout', async () => {
      setActionError(null);
      try {
        const result = await cashOutCrashRound(id);
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
      }
    });
  }

  // Space places a bet or cashes out, unless focus is on something that already uses Space.
  const hotkey = useRef<() => void>(() => undefined);
  useEffect(() => {
    hotkey.current = () => {
      if (running) handleCashout();
      else (document.getElementById(FORM_ID) as HTMLFormElement | null)?.requestSubmit();
    };
  });
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (isInteractive(event.target)) return;
      event.preventDefault();
      hotkey.current();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const livePayout = runningStake !== null ? estimatePayout(runningStake, liveX100) : 0;

  const stats: Stat[] =
    round?.status === 'RUNNING'
      ? [
          { label: 'Multiplier', value: formatMultiplier(liveX100), tone: 'accent' },
          { label: 'Payout', value: `${formatCoins(livePayout)}` },
          { label: 'Profit', value: formatSignedCoins(livePayout - round.stake), tone: 'win' },
        ]
      : [
          { label: 'Bet', value: stake.value === null ? '—' : formatCoins(stake.value) },
          {
            label: 'At 2.00x',
            value: stake.value === null ? '—' : formatCoins(estimatePayout(stake.value, 200)),
          },
          {
            label: 'At 10.00x',
            value: stake.value === null ? '—' : formatCoins(estimatePayout(stake.value, 1000)),
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
              : `Crashed at ${formatMultiplier(round.crashMultiplierX100)}`,
        }
      : null;

  const action = running ? (
    <Button className="py-3.5 text-base" onClick={handleCashout} loading={busy === 'cashout'}>
      Cash out <span className="tabular-nums">{formatCoins(livePayout)} VC</span>
    </Button>
  ) : (
    <Button
      type="submit"
      form={FORM_ID}
      className="py-3.5 text-base"
      loading={busy === 'start'}
      disabled={busy !== null}
    >
      {round ? 'Bet again' : 'Place bet'}
    </Button>
  );

  return (
    <GameLayout
      game="crash"
      formId={FORM_ID}
      onSubmit={handleStart}
      notice={
        games.status === 'error' ? (
          <Alert tone="warning">Stake limits are unavailable: {games.error}</Alert>
        ) : null
      }
      controls={
        <>
          <BetAmountField
            stake={stake}
            disabled={running || busy !== null}
            hint={limitsHint(limits)}
          />
          <p className="hidden text-xs text-night-400 lg:block">
            Tip: press <kbd className="rounded bg-night-800 px-1.5 py-0.5 font-sans">Space</kbd> to
            bet or cash out.
          </p>
        </>
      }
      summary={<StatGrid stats={stats} />}
      action={action}
      status={statusMessage(round, busy)}
      alerts={
        <>
          {connectionLost ? <Alert tone="warning">Connection lost. Retrying…</Alert> : null}
          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
        </>
      }
      stage={
        <div className="stage">
          <CrashCanvas state={visual} />
          <ResultOverlay outcome={outcome} />
        </div>
      }
      history={history}
    />
  );
}
