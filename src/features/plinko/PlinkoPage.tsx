import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { listGames } from '../../api/games';
import { ApiError } from '../../api/http';
import { playPlinko } from '../../api/plinko';
import type { PlinkoRisk, PlinkoRound } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { useApiQuery } from '../../hooks/useApiQuery';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { formatMultiplier } from '../../lib/crash';
import { messageOf } from '../../lib/errors';
import { newIdempotencyKey } from '../../lib/idempotency';
import { estimatePayout, formatCoins } from '../../lib/money';
import { compactMultiplier, multiplierTable, readPlinkoSettings } from '../../lib/plinko';
import { outcomeSound, sound } from '../../lib/sound';
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
import { PlinkoCanvas } from './PlinkoCanvas';
import { createPlinkoVisualState, setBoard, startDrop } from './plinkoVisualState';

const FORM_ID = 'plinko-bet-form';
const DEFAULT_ROWS = 12;
const DEFAULT_RISK: PlinkoRisk = 'medium';
/** Balls allowed in the air at once. Each one is a separate, already settled bet. */
const MAX_BALLS = 5;
const RISK_LABELS: Record<PlinkoRisk, string> = { low: 'Low', medium: 'Medium', high: 'High' };

export function PlinkoPage() {
  const { wallet, refresh: refreshWallet } = useWallet();
  const games = useApiQuery(listGames);
  const summary = games.status === 'success' ? games.data.find((g) => g.id === 'plinko') : undefined;
  const settings = useMemo(() => readPlinkoSettings(summary?.settings), [summary]);
  const stake = useStake('plinko', summary, wallet?.balance);

  const reducedMotion = usePrefersReducedMotion();
  // One stable object shared with Phaser for the life of this page.
  const [visual] = useState(() => createPlinkoVisualState(reducedMotion, DEFAULT_ROWS));
  useEffect(() => {
    visual.reducedMotion = reducedMotion;
  }, [visual, reducedMotion]);

  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [risk, setRisk] = useState<PlinkoRisk>(DEFAULT_RISK);
  const { busy, run } = useInFlight<'drop'>();
  const [lastResult, setLastResult] = useState<PlinkoRound | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const history = useRecentRounds('plinko', historyVersion);

  // Each result is revealed (balance, history, banner) when its ball lands.
  const landings = useRevealQueue<PlinkoRound>((round, live) => {
    setLastResult(round);
    if (live) {
      sound.play('land');
      // A thud for every landing; a chime only when the bucket paid more than the bet.
      const tone = outcomeSound(round.stake, round.virtualReturn);
      if (tone !== 'lose') sound.play(tone);
    }
    void refreshWallet();
    setHistoryVersion((version) => version + 1);
  });
  const ballsInPlay = landings.pending;

  // Reused only when retrying the same drop after a network failure, so a lost response
  // cannot cause a second debit.
  const pendingPlay = useRef<{ key: string; fingerprint: string } | null>(null);

  // Fall back to the server's own options if our defaults are not offered.
  const activeRows = settings && !settings.rows.includes(rows) ? settings.rows[0] : rows;
  const activeRisk = settings && !settings.risks.includes(risk) ? settings.risks[0] : risk;
  const table = settings ? multiplierTable(settings, activeRows, activeRisk) : null;

  useEffect(() => {
    if (table && ballsInPlay === 0) setBoard(visual, activeRows, table);
  }, [visual, activeRows, table, ballsInPlay]);

  function handleDrop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings || !table || ballsInPlay >= MAX_BALLS) return;
    void run('drop', async () => {
      setActionError(null);
      const value = stake.validate();
      if (value === null) return;

      const fingerprint = `${value}|${activeRows}|${activeRisk}`;
      const pending = pendingPlay.current;
      const key = pending && pending.fingerprint === fingerprint ? pending.key : newIdempotencyKey();
      pendingPlay.current = { key, fingerprint };

      try {
        const { round } = await playPlinko(value, activeRows, activeRisk, key);
        pendingPlay.current = null;
        // The server's numbers are final; the table only draws the board.
        const roundTable = multiplierTable(settings, round.rows, round.risk) ?? table;
        sound.play('drop');
        landings.schedule(round, startDrop(visual, round, roundTable, performance.now()));
      } catch (error) {
        const isNetworkError = error instanceof ApiError && error.status === 0;
        if (!isNetworkError) pendingPlay.current = null;
        if (error instanceof ApiError && error.fieldErrors.stake) {
          stake.setError(error.fieldErrors.stake);
        } else {
          setActionError(messageOf(error, 'Could not drop the ball. Try again.'));
        }
      }
    });
  }

  // Rows and risk change the board, so they wait until every ball has landed.
  const boardLocked = busy !== null || ballsInPlay > 0;
  const topMultiplier = table ? Math.max(...table) : null;

  let status = 'Pick a bet and a board, then drop a ball.';
  if (busy) status = 'Dropping the ball…';
  else if (ballsInPlay > 0) status = ballsInPlay === 1 ? 'Ball in play…' : `${ballsInPlay} balls in play…`;
  else if (lastResult) {
    status = `Landed on ${formatMultiplier(lastResult.multiplierX100)}. You received ${formatCoins(lastResult.virtualReturn)} VC.`;
  }

  const outcome: RoundOutcome | null = lastResult
    ? {
        key: lastResult.roundId,
        net: lastResult.virtualReturn - lastResult.stake,
        label: `Landed on ${formatMultiplier(lastResult.multiplierX100)}`,
      }
    : null;

  return (
    <GameLayout
      game="plinko"
      formId={FORM_ID}
      onSubmit={handleDrop}
      notice={
        games.status === 'error' ? (
          <Alert tone="warning">Board settings are unavailable: {games.error}</Alert>
        ) : games.status === 'success' && !settings ? (
          <Alert tone="warning">
            The server did not send Plinko board settings. Update the backend and reload.
          </Alert>
        ) : null
      }
      controls={
        <>
          <BetAmountField stake={stake} disabled={busy !== null} hint={limitsHint(summary)} />
          {settings ? (
            <>
              <Segmented
                label="Rows"
                options={settings.rows}
                value={activeRows}
                onChange={(value) => {
                  setRows(value);
                  setLastResult(null);
                }}
                format={String}
                disabled={boardLocked}
              />
              <Segmented
                label="Risk"
                options={settings.risks}
                value={activeRisk}
                onChange={(value) => {
                  setRisk(value);
                  setLastResult(null);
                }}
                format={(value) => RISK_LABELS[value]}
                disabled={boardLocked}
              />
              {ballsInPlay > 0 ? (
                <p className="-mt-2 text-xs text-night-400">
                  Rows and risk unlock when every ball has landed.
                </p>
              ) : null}
            </>
          ) : null}
        </>
      }
      summary={
        <StatGrid
          stats={[
            {
              label: 'Top',
              value: topMultiplier === null ? '—' : compactMultiplier(topMultiplier),
              tone: 'accent',
            },
            {
              label: 'Max win',
              value:
                topMultiplier === null || stake.value === null
                  ? '—'
                  : formatCoins(estimatePayout(stake.value, topMultiplier)),
            },
            { label: 'In play', value: `${ballsInPlay} / ${MAX_BALLS}` },
          ]}
        />
      }
      action={
        <Button
          type="submit"
          form={FORM_ID}
          className="py-3.5 text-base"
          loading={busy !== null}
          disabled={!table || ballsInPlay >= MAX_BALLS}
        >
          {ballsInPlay > 0 ? 'Drop another' : 'Drop ball'}
        </Button>
      }
      status={status}
      alerts={actionError ? <Alert tone="error">{actionError}</Alert> : null}
      stage={
        <div className="stage">
          <PlinkoCanvas state={visual} />
          <ResultOverlay outcome={ballsInPlay > 0 ? null : outcome} />
        </div>
      }
      history={history}
    />
  );
}
