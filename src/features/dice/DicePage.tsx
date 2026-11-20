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
import {
  clampTarget,
  DICE_DIRECTIONS,
  diceMultiplierX100,
  flipTarget,
  formatChance,
  formatChanceValue,
  formatRoll,
  parseChance,
  parseTarget,
  readDiceSettings,
  targetForWins,
  targetRange,
  winCount,
  winsForChance,
} from '../../lib/dice';
import { messageOf } from '../../lib/errors';
import { newIdempotencyKey } from '../../lib/idempotency';
import { estimatePayout, formatCoins, formatSignedCoins } from '../../lib/money';
import { useWallet } from '../../wallet/wallet-context';
import { BetAmountField } from '../games/BetAmountField';
import { GameLayout } from '../games/GameLayout';
import { ResultOverlay, type RoundOutcome } from '../games/ResultOverlay';
import { StatGrid } from '../games/StatGrid';
import { limitsHint } from '../games/stake';
import { useInFlight } from '../games/useInFlight';
import { useRecentRounds } from '../games/useRecentRounds';
import { useRevealQueue } from '../games/useRevealQueue';
import { useStake } from '../games/useStake';
import { DiceCanvas } from './DiceCanvas';
import {
  createDiceVisualState,
  setBet,
  startRoll,
  TRACK_PADDING,
  TRACK_Y_RATIO,
} from './diceVisualState';

const FORM_ID = 'dice-bet-form';
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
// Half the invisible drag thumb (18px wide), so the thumb's centre lines up with the track.
const THUMB_HALF = 9;

export function DicePage() {
  const { wallet, refresh: refreshWallet } = useWallet();
  const games = useApiQuery(listGames);
  const summary = games.status === 'success' ? games.data.find((g) => g.id === 'dice') : undefined;
  const settings = useMemo(() => readDiceSettings(summary?.settings), [summary]);
  const rules = settings ?? PLACEHOLDER_SETTINGS;
  const stake = useStake('dice', summary, wallet?.balance);

  const reducedMotion = usePrefersReducedMotion();
  // One stable object shared with Phaser for the life of this page.
  const [visual] = useState(() => createDiceVisualState(reducedMotion));
  useEffect(() => {
    visual.reducedMotion = reducedMotion;
  }, [visual, reducedMotion]);

  const [direction, setDirection] = useState<DiceDirection>('under');
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [targetInput, setTargetInput] = useState(formatRoll(DEFAULT_TARGET));
  const [chanceInput, setChanceInput] = useState(
    formatChanceValue(winCount(DEFAULT_TARGET, 'under', PLACEHOLDER_SETTINGS), PLACEHOLDER_SETTINGS),
  );
  const [targetError, setTargetError] = useState<string | null>(null);
  const [chanceError, setChanceError] = useState<string | null>(null);
  const { busy, run } = useInFlight<'roll'>();
  const [result, setResult] = useState<DiceRound | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const history = useRecentRounds('dice', historyVersion);

  // A roll is revealed (banner, balance, history) when its marker stops.
  const reveals = useRevealQueue<DiceRound>((round) => {
    setResult(round);
    void refreshWallet();
    setHistoryVersion((version) => version + 1);
  });
  const rolling = reveals.pending > 0;

  // Reused only when retrying the same roll after a network failure, so a lost response
  // cannot cause a second debit.
  const pendingRoll = useRef<{ key: string; fingerprint: string } | null>(null);

  // Preview of the bet. The server recalculates all of it.
  const activeTarget = clampTarget(target, direction, rules);
  const { minTarget, maxTarget } = targetRange(direction, rules);
  const wins = winCount(activeTarget, direction, rules);
  const multiplier = diceMultiplierX100(wins, rules);
  const payoutOnWin = stake.value === null ? null : estimatePayout(stake.value, multiplier);

  useEffect(() => {
    if (!rolling) setBet(visual, activeTarget, direction, rules.rollSpan);
  }, [visual, activeTarget, direction, rules.rollSpan, rolling]);

  /** Sets the target and rewrites whichever inputs the user is not typing in. */
  function applyTarget(next: number, nextDirection: DiceDirection, source: 'target' | 'chance' | 'other') {
    setTarget(next);
    if (source !== 'target') setTargetInput(formatRoll(next));
    if (source !== 'chance') {
      setChanceInput(formatChanceValue(winCount(next, nextDirection, rules), rules));
    }
    setTargetError(null);
    setChanceError(null);
  }

  function changeDirection(next: DiceDirection) {
    if (next === direction) return;
    setDirection(next);
    // Keep the same win chance: under 50.00 becomes over 49.99.
    applyTarget(clampTarget(flipTarget(activeTarget, rules), next, rules), next, 'other');
  }

  function changeTargetInput(value: string) {
    setTargetInput(value);
    const parsed = parseTarget(value);
    if (!parsed.ok) {
      setTargetError(parsed.error);
      return;
    }
    if (parsed.value < minTarget || parsed.value > maxTarget) {
      setTargetError(`Enter ${formatRoll(minTarget)} to ${formatRoll(maxTarget)}.`);
      return;
    }
    applyTarget(parsed.value, direction, 'target');
  }

  function changeChanceInput(value: string) {
    setChanceInput(value);
    const parsed = parseChance(value);
    if (!parsed.ok) {
      setChanceError(parsed.error);
      return;
    }
    const nextWins = winsForChance(parsed.value, rules);
    if (nextWins < rules.minWinCount || nextWins > rules.maxWinCount) {
      setChanceError(
        `Enter ${formatChance(rules.minWinCount, rules)} to ${formatChance(rules.maxWinCount, rules)}.`,
      );
      return;
    }
    applyTarget(targetForWins(nextWins, direction, rules), direction, 'chance');
  }

  function handleRoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings || targetError || chanceError) return;
    void run('roll', async () => {
      setActionError(null);
      const value = stake.validate();
      if (value === null) return;

      const fingerprint = `${value}|${activeTarget}|${direction}`;
      const pending = pendingRoll.current;
      const key = pending && pending.fingerprint === fingerprint ? pending.key : newIdempotencyKey();
      pendingRoll.current = { key, fingerprint };

      try {
        const { round } = await rollDice(value, activeTarget, direction, key);
        pendingRoll.current = null;
        // Rolling again mid-animation shows the previous result at once instead of waiting.
        reveals.flush();
        reveals.schedule(round, startRoll(visual, round, performance.now()));
      } catch (error) {
        const isNetworkError = error instanceof ApiError && error.status === 0;
        if (!isNetworkError) pendingRoll.current = null;
        if (error instanceof ApiError && error.fieldErrors.stake) {
          stake.setError(error.fieldErrors.stake);
        } else if (error instanceof ApiError && error.fieldErrors.target) {
          setTargetError(error.fieldErrors.target);
        } else {
          setActionError(messageOf(error, 'Could not roll. Try again.'));
        }
      }
    });
  }

  const controlsLocked = busy !== null;

  let status = 'Set a target and roll.';
  if (busy || rolling) status = 'Rolling…';
  else if (result) {
    status = result.won
      ? `Rolled ${formatRoll(result.roll)}. You won ${formatCoins(result.virtualReturn)} VC.`
      : `Rolled ${formatRoll(result.roll)}. Your bet was lost.`;
  }

  const outcome: RoundOutcome | null =
    result && !rolling
      ? {
          key: result.roundId,
          net: result.virtualReturn - result.stake,
          label: result.won
            ? `Rolled ${formatRoll(result.roll)} · ${formatMultiplier(result.multiplierX100)}`
            : `Rolled ${formatRoll(result.roll)}`,
        }
      : null;

  return (
    <GameLayout
      game="dice"
      formId={FORM_ID}
      onSubmit={handleRoll}
      notice={
        games.status === 'error' ? (
          <Alert tone="warning">Dice settings are unavailable: {games.error}</Alert>
        ) : games.status === 'success' && !settings ? (
          <Alert tone="warning">
            The server did not send Dice settings. Update the backend and reload.
          </Alert>
        ) : null
      }
      controls={
        <>
          <BetAmountField stake={stake} disabled={controlsLocked} hint={limitsHint(summary)} />
          <Segmented
            label="Direction"
            options={DICE_DIRECTIONS}
            value={direction}
            onChange={changeDirection}
            format={(value) => DIRECTION_LABELS[value]}
            disabled={controlsLocked}
          />
          <div className="grid grid-cols-2 gap-3">
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
            <TextField
              label="Win chance %"
              name="winChance"
              inputMode="decimal"
              autoComplete="off"
              value={chanceInput}
              onChange={(event) => changeChanceInput(event.target.value)}
              disabled={controlsLocked}
              error={chanceError ?? undefined}
              hint={`${formatChance(rules.minWinCount, rules)} – ${formatChance(rules.maxWinCount, rules)}`}
            />
          </div>
        </>
      }
      summary={
        <StatGrid
          stats={[
            { label: 'Multiplier', value: formatMultiplier(multiplier), tone: 'accent' },
            {
              label: 'Payout',
              value: payoutOnWin === null ? '—' : formatCoins(payoutOnWin),
            },
            {
              label: 'Profit',
              value:
                payoutOnWin === null || stake.value === null
                  ? '—'
                  : formatSignedCoins(payoutOnWin - stake.value),
              tone: 'win',
            },
          ]}
        />
      }
      action={
        <Button
          type="submit"
          form={FORM_ID}
          className="py-3.5 text-base"
          loading={busy !== null}
          disabled={!settings || targetError !== null || chanceError !== null}
        >
          {rolling ? 'Roll again' : 'Roll dice'}
        </Button>
      }
      status={status}
      alerts={actionError ? <Alert tone="error">{actionError}</Alert> : null}
      stage={
        <div className="stage">
          <DiceCanvas state={visual}>
            <input
              type="range"
              className="dice-range absolute h-10"
              style={{
                left: TRACK_PADDING - THUMB_HALF,
                right: TRACK_PADDING - THUMB_HALF,
                top: `calc(${TRACK_Y_RATIO * 100}% - 20px)`,
              }}
              min={0}
              max={rules.rollSpan}
              step={1}
              value={activeTarget}
              onChange={(event) =>
                applyTarget(clampTarget(Number(event.target.value), direction, rules), direction, 'other')
              }
              disabled={controlsLocked || !settings}
              aria-label="Target"
              aria-valuetext={`${DIRECTION_LABELS[direction]} ${formatRoll(activeTarget)}, ${formatChance(wins, rules)} win chance`}
            />
          </DiceCanvas>
          <ResultOverlay outcome={outcome} />
        </div>
      }
      history={history}
    />
  );
}
