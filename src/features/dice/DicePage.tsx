import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { rollDice } from '../../api/dice';
import { listGames } from '../../api/games';
import { ApiError } from '../../api/http';
import type { DiceDirection, DiceRound, DiceSettings } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { TextField } from '../../components/ui/TextField';
import { useApiQuery } from '../../hooks/useApiQuery';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { formatMultiplier } from '../../lib/crash';
import { cx } from '../../lib/cx';
import {
  clampTarget,
  DICE_DIRECTIONS,
  diceMultiplierX100,
  flipTarget,
  formatChance,
  formatRoll,
  parseTarget,
  payoutFor,
  readDiceSettings,
  targetRange,
  winCount,
} from '../../lib/dice';
import { messageOf } from '../../lib/errors';
import { newIdempotencyKey } from '../../lib/idempotency';
import { formatCoins, formatSignedCoins, parseCoins, toCoinInput } from '../../lib/money';
import { useWallet } from '../../wallet/wallet-context';
import { gameBySlug } from '../games/catalog';
import { GameHeader } from '../games/GameHeader';
import { RecentRounds } from '../games/RecentRounds';
import { adjustedStake, limitsHint, stakeProblem } from '../games/stake';
import { StakeControls } from '../games/StakeControls';
import { DiceCanvas } from './DiceCanvas';
import { createDiceVisualState, setBet, startRoll } from './diceVisualState';

const DICE = gameBySlug('dice');
const DEFAULT_TARGET = 5000;
// Draws the controls while settings load. Rolling stays disabled until the server's arrive.
const PLACEHOLDER_SETTINGS: DiceSettings = {
  rollSpan: 10000,
  minWinCount: 100,
  maxWinCount: 9800,
  houseEdgeBps: 100,
};
const DIRECTION_LABELS: Record<DiceDirection, string> = {
  under: 'Roll under',
  over: 'Roll over',
};

function RoundResult({ round }: { round: DiceRound }) {
  const net = round.virtualReturn - round.stake;
  return (
    <div
      className={cx(
        'animate-pop rounded-xl border p-4',
        round.won ? 'border-mint-500/40 bg-mint-500/10' : 'border-rose-500/40 bg-rose-500/10',
      )}
    >
      <p className={cx('text-lg font-bold', round.won ? 'text-mint-300' : 'text-rose-300')}>
        {round.won ? `Won at ${formatMultiplier(round.multiplierX100)}` : 'Missed'}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-night-300">Roll</dt>
        <dd className="text-right font-semibold tabular-nums">{formatRoll(round.roll)}</dd>
        <dt className="text-night-300">Needed</dt>
        <dd className="text-right tabular-nums">
          {round.direction} {formatRoll(round.target)}
        </dd>
        <dt className="text-night-300">Stake</dt>
        <dd className="text-right tabular-nums">{formatCoins(round.stake)}</dd>
        <dt className="text-night-300">Return</dt>
        <dd className="text-right tabular-nums">{formatCoins(round.virtualReturn)}</dd>
        <dt className="text-night-300">Net</dt>
        <dd className="text-right font-semibold tabular-nums">{formatSignedCoins(net)}</dd>
      </dl>
    </div>
  );
}

export function DicePage() {
  const { wallet, refresh: refreshWallet } = useWallet();
  const games = useApiQuery(listGames);
  const summary = games.status === 'success' ? games.data.find((g) => g.id === 'dice') : undefined;
  const settings = useMemo(() => readDiceSettings(summary?.settings), [summary]);
  const rules = settings ?? PLACEHOLDER_SETTINGS;

  const reducedMotion = usePrefersReducedMotion();
  // One stable object shared with Phaser for the life of this page.
  const [visual] = useState(() => createDiceVisualState(reducedMotion));
  useEffect(() => {
    visual.reducedMotion = reducedMotion;
  }, [visual, reducedMotion]);

  const [stakeInput, setStakeInput] = useState('10');
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [direction, setDirection] = useState<DiceDirection>('under');
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [targetInput, setTargetInput] = useState(formatRoll(DEFAULT_TARGET));
  const [targetError, setTargetError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The server has settled this round; the marker is still moving on screen.
  const [rolling, setRolling] = useState<{ round: DiceRound; durationMs: number } | null>(null);
  const [result, setResult] = useState<DiceRound | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  // Reused only when retrying the same roll after a network failure, so a lost response
  // cannot cause a second debit.
  const pendingRoll = useRef<{ key: string; fingerprint: string } | null>(null);

  // Preview of the bet. The server recalculates all of it.
  const activeTarget = clampTarget(target, direction, rules);
  const { minTarget, maxTarget } = targetRange(direction, rules);
  const wins = winCount(activeTarget, direction, rules);
  const multiplier = diceMultiplierX100(wins, rules);
  const parsedStake = parseCoins(stakeInput);
  const profitOnWin = parsedStake.ok
    ? payoutFor(parsedStake.value, multiplier) - parsedStake.value
    : null;

  const isRolling = rolling !== null;
  useEffect(() => {
    if (!isRolling) setBet(visual, activeTarget, direction, rules.rollSpan);
  }, [visual, activeTarget, direction, rules.rollSpan, isRolling]);

  // Reveal the result once the marker stops. The server settled it already, so if the page
  // closes mid-roll the balance is simply refreshed.
  useEffect(() => {
    if (!rolling) return;
    let fired = false;
    const timer = window.setTimeout(() => {
      fired = true;
      setResult(rolling.round);
      setRolling(null);
      void refreshWallet();
      setHistoryVersion((version) => version + 1);
    }, rolling.durationMs);
    return () => {
      window.clearTimeout(timer);
      if (!fired) void refreshWallet();
    };
  }, [rolling, refreshWallet]);

  function applyTarget(next: number) {
    setTarget(next);
    setTargetInput(formatRoll(next));
    setTargetError(null);
    setResult(null);
  }

  function changeDirection(next: DiceDirection) {
    if (next === direction) return;
    setDirection(next);
    // Keep the same win chance: under 50.00 becomes over 49.99.
    applyTarget(clampTarget(flipTarget(activeTarget, rules), next, rules));
  }

  function changeTargetInput(value: string) {
    setTargetInput(value);
    const parsed = parseTarget(value);
    if (!parsed.ok) {
      setTargetError(parsed.error);
      return;
    }
    if (parsed.value < minTarget || parsed.value > maxTarget) {
      setTargetError(
        `For ${DIRECTION_LABELS[direction].toLowerCase()}, enter ${formatRoll(minTarget)} to ${formatRoll(maxTarget)}.`,
      );
      return;
    }
    setTarget(parsed.value);
    setTargetError(null);
    setResult(null);
  }

  function adjust(change: 'half' | 'double') {
    const parsed = parseCoins(stakeInput);
    if (!parsed.ok) return;
    const next = adjustedStake(parsed.value, change, summary);
    if (next === null) return;
    setStakeInput(toCoinInput(next));
    setStakeError(null);
  }

  async function handleRoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || isRolling || !settings || targetError) return;
    setActionError(null);

    if (!parsedStake.ok) {
      setStakeError(parsedStake.error);
      return;
    }
    const stake = parsedStake.value;
    const problem = stakeProblem(stake, summary, wallet?.balance);
    if (problem) {
      setStakeError(problem);
      return;
    }
    setStakeError(null);

    const fingerprint = `${stake}|${activeTarget}|${direction}`;
    const pending = pendingRoll.current;
    const key = pending && pending.fingerprint === fingerprint ? pending.key : newIdempotencyKey();
    pendingRoll.current = { key, fingerprint };

    setBusy(true);
    try {
      const { round } = await rollDice(stake, activeTarget, direction, key);
      pendingRoll.current = null;
      const durationMs = startRoll(visual, round, performance.now());
      setResult(null);
      setRolling({ round, durationMs });
    } catch (error) {
      const isNetworkError = error instanceof ApiError && error.status === 0;
      if (!isNetworkError) pendingRoll.current = null;
      if (error instanceof ApiError && error.fieldErrors.stake) {
        setStakeError(error.fieldErrors.stake);
      } else if (error instanceof ApiError && error.fieldErrors.target) {
        setTargetError(error.fieldErrors.target);
      } else {
        setActionError(messageOf(error, 'Could not roll. Try again.'));
      }
    } finally {
      setBusy(false);
    }
  }

  const controlsLocked = busy || isRolling;

  let status = 'Pick a target and roll.';
  if (busy || isRolling) status = 'Rolling…';
  else if (result) {
    status = result.won
      ? `Rolled ${formatRoll(result.roll)}. You won ${formatCoins(result.virtualReturn)} VC.`
      : `Rolled ${formatRoll(result.roll)}. Your stake was lost.`;
  }

  return (
    <div className="flex flex-col gap-8">
      <GameHeader game="dice" />

      {games.status === 'error' ? (
        <Alert tone="warning">Dice settings are unavailable: {games.error}</Alert>
      ) : null}
      {games.status === 'success' && !settings ? (
        <Alert tone="warning">
          The server did not send Dice settings. Update the backend and reload.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <section
          aria-labelledby="dice-controls-heading"
          className="order-2 flex flex-col gap-5 panel p-5 lg:order-1"
        >
          <h2 id="dice-controls-heading" className="sr-only">
            Roll controls
          </h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-night-300">Demo balance</span>
            <span className="font-semibold tabular-nums">
              {wallet ? `${formatCoins(wallet.balance)} ${wallet.currencyCode}` : '—'}
            </span>
          </div>

          <form noValidate onSubmit={(event) => void handleRoll(event)} className="flex flex-col gap-4">
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

            <Segmented
              label="Direction"
              options={DICE_DIRECTIONS}
              value={direction}
              onChange={changeDirection}
              format={(value) => DIRECTION_LABELS[value]}
              disabled={controlsLocked}
            />

            <div className="flex flex-col gap-2">
              <TextField
                label="Target"
                name="target"
                inputMode="decimal"
                autoComplete="off"
                value={targetInput}
                onChange={(event) => changeTargetInput(event.target.value)}
                disabled={controlsLocked}
                error={targetError ?? undefined}
                hint={`${formatRoll(minTarget)} – ${formatRoll(maxTarget)}`}
              />
              <input
                type="range"
                aria-label="Target slider"
                min={minTarget}
                max={maxTarget}
                step={1}
                value={activeTarget}
                onChange={(event) => applyTarget(Number(event.target.value))}
                disabled={controlsLocked}
                aria-valuetext={`${DIRECTION_LABELS[direction]} ${formatRoll(activeTarget)}, ${formatChance(wins, rules)} win chance`}
                className="w-full accent-mint-500 disabled:opacity-60"
              />
            </div>

            <dl className="grid grid-cols-3 gap-2 panel-inset p-3 text-center">
              <div>
                <dt className="text-xs text-night-300">Win chance</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{formatChance(wins, rules)}</dd>
              </div>
              <div>
                <dt className="text-xs text-night-300">Multiplier</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {formatMultiplier(multiplier)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-night-300">Profit on win</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {profitOnWin === null ? '—' : formatSignedCoins(profitOnWin)}
                </dd>
              </div>
            </dl>

            <Button
              type="submit"
              className="py-3 text-base"
              loading={busy}
              disabled={isRolling || !settings}
            >
              Roll
            </Button>
          </form>

          <p role="status" className="text-sm text-night-300">
            {status}
          </p>

          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          {result && !isRolling ? <RoundResult round={result} /> : null}
        </section>

        <div className="order-1 lg:order-2">
          <DiceCanvas state={visual} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="dice-rules-heading"
          className="panel p-5"
        >
          <h2 id="dice-rules-heading" className="text-lg font-semibold">
            How Dice works
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-night-300">
            {DICE?.rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ol>
        </section>
        <RecentRounds game="dice" version={historyVersion} />
      </div>

      <p className="text-xs text-night-300">
        Virtual coins only. Coins have no monetary value and cannot be redeemed.
      </p>
    </div>
  );
}
