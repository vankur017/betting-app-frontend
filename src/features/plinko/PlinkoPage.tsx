import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { listGames } from '../../api/games';
import { ApiError } from '../../api/http';
import { playPlinko } from '../../api/plinko';
import type { PlinkoRisk, PlinkoRound } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { TextField } from '../../components/ui/TextField';
import { useApiQuery } from '../../hooks/useApiQuery';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { formatMultiplier } from '../../lib/crash';
import { cx } from '../../lib/cx';
import { messageOf } from '../../lib/errors';
import { newIdempotencyKey } from '../../lib/idempotency';
import { formatCoins, formatSignedCoins, parseCoins, toCoinInput } from '../../lib/money';
import { compactMultiplier, multiplierTable, readPlinkoSettings } from '../../lib/plinko';
import { useWallet } from '../../wallet/wallet-context';
import { gameBySlug } from '../games/catalog';
import { GameHeader } from '../games/GameHeader';
import { RecentRounds } from '../games/RecentRounds';
import { adjustedStake, stakeProblem } from '../games/stake';
import { PlinkoCanvas } from './PlinkoCanvas';
import { createPlinkoVisualState, setBoard, startDrop } from './plinkoVisualState';

const PLINKO = gameBySlug('plinko');
const DEFAULT_ROWS = 12;
const DEFAULT_RISK: PlinkoRisk = 'medium';
const RISK_LABELS: Record<PlinkoRisk, string> = { low: 'Low', medium: 'Medium', high: 'High' };

function RoundResult({ round }: { round: PlinkoRound }) {
  const net = round.virtualReturn - round.stake;
  const ahead = net >= 0;
  return (
    <div
      className={cx(
        'animate-pop rounded-xl border p-4',
        ahead ? 'border-mint-500/40 bg-mint-500/10' : 'border-rose-500/40 bg-rose-500/10',
      )}
    >
      <p className={cx('text-lg font-bold', ahead ? 'text-mint-300' : 'text-rose-300')}>
        Landed on {formatMultiplier(round.multiplierX100)}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-night-300">Stake</dt>
        <dd className="text-right tabular-nums">{formatCoins(round.stake)}</dd>
        <dt className="text-night-300">Return</dt>
        <dd className="text-right tabular-nums">{formatCoins(round.virtualReturn)}</dd>
        <dt className="text-night-300">Net</dt>
        <dd className="text-right font-semibold tabular-nums">{formatSignedCoins(net)}</dd>
        <dt className="text-night-300">Board</dt>
        <dd className="text-right">
          {round.rows} rows · {RISK_LABELS[round.risk]}
        </dd>
        <dt className="text-night-300">Bucket</dt>
        <dd className="text-right tabular-nums">
          {round.bucket + 1} of {round.rows + 1}
        </dd>
      </dl>
    </div>
  );
}

export function PlinkoPage() {
  const { wallet, refresh: refreshWallet } = useWallet();
  const games = useApiQuery(listGames);
  const summary = games.status === 'success' ? games.data.find((g) => g.id === 'plinko') : undefined;
  const settings = useMemo(() => readPlinkoSettings(summary?.settings), [summary]);

  const reducedMotion = usePrefersReducedMotion();
  // One stable object shared with Phaser for the life of this page.
  const [visual] = useState(() => createPlinkoVisualState(reducedMotion, DEFAULT_ROWS));
  useEffect(() => {
    visual.reducedMotion = reducedMotion;
  }, [visual, reducedMotion]);

  const [stakeInput, setStakeInput] = useState('10');
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [risk, setRisk] = useState<PlinkoRisk>(DEFAULT_RISK);
  const [busy, setBusy] = useState(false);
  // The server has settled this round; the ball is still falling on screen.
  const [landing, setLanding] = useState<{ round: PlinkoRound; durationMs: number } | null>(null);
  const [result, setResult] = useState<PlinkoRound | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  // Reused only when retrying the same drop after a network failure, so a lost response
  // cannot cause a second debit.
  const pendingPlay = useRef<{ key: string; fingerprint: string } | null>(null);

  // Fall back to the server's own options if our defaults are not offered.
  const activeRows = settings && !settings.rows.includes(rows) ? settings.rows[0] : rows;
  const activeRisk = settings && !settings.risks.includes(risk) ? settings.risks[0] : risk;
  const table = settings ? multiplierTable(settings, activeRows, activeRisk) : null;

  const dropping = landing !== null;
  useEffect(() => {
    if (table && !dropping) setBoard(visual, activeRows, table);
  }, [visual, activeRows, table, dropping]);

  // Reveal the result once the ball lands. The server settled it already, so if the page closes
  // mid-drop the balance is simply refreshed.
  useEffect(() => {
    if (!landing) return;
    let fired = false;
    const timer = window.setTimeout(() => {
      fired = true;
      setResult(landing.round);
      setLanding(null);
      void refreshWallet();
      setHistoryVersion((version) => version + 1);
    }, landing.durationMs);
    return () => {
      window.clearTimeout(timer);
      if (!fired) void refreshWallet();
    };
  }, [landing, refreshWallet]);

  async function handlePlay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || dropping || !settings || !table) return;
    setActionError(null);

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

    const fingerprint = `${parsed.value}|${activeRows}|${activeRisk}`;
    const pending = pendingPlay.current;
    const key = pending && pending.fingerprint === fingerprint ? pending.key : newIdempotencyKey();
    pendingPlay.current = { key, fingerprint };

    setBusy(true);
    try {
      const { round } = await playPlinko(parsed.value, activeRows, activeRisk, key);
      pendingPlay.current = null;
      // The server's numbers are final; the table only draws the board.
      const roundTable = multiplierTable(settings, round.rows, round.risk) ?? table;
      const durationMs = startDrop(visual, round, roundTable, performance.now());
      setResult(null);
      setLanding({ round, durationMs });
    } catch (error) {
      const isNetworkError = error instanceof ApiError && error.status === 0;
      if (!isNetworkError) pendingPlay.current = null;
      if (error instanceof ApiError && error.fieldErrors.stake) {
        setStakeError(error.fieldErrors.stake);
      } else {
        setActionError(messageOf(error, 'Could not drop the ball. Try again.'));
      }
    } finally {
      setBusy(false);
    }
  }

  function adjust(change: 'half' | 'double') {
    const parsed = parseCoins(stakeInput);
    if (!parsed.ok) return;
    const next = adjustedStake(parsed.value, change, summary);
    if (next === null) return;
    setStakeInput(toCoinInput(next));
    setStakeError(null);
  }

  const controlsLocked = busy || dropping;
  const limitsHint =
    summary?.minStake !== undefined && summary.maxStake !== undefined
      ? `${formatCoins(summary.minStake)} – ${formatCoins(summary.maxStake)} VC`
      : undefined;
  const topMultiplier = table ? Math.max(...table) : null;

  let status = 'Pick a stake and a board, then drop a ball.';
  if (busy) status = 'Dropping the ball…';
  else if (dropping) status = 'Ball in play…';
  else if (result) {
    status = `Landed on ${formatMultiplier(result.multiplierX100)}. You received ${formatCoins(result.virtualReturn)} VC.`;
  }

  return (
    <div className="flex flex-col gap-8">
      <GameHeader game="plinko" />

      {games.status === 'error' ? (
        <Alert tone="warning">Board settings are unavailable: {games.error}</Alert>
      ) : null}
      {games.status === 'success' && !settings ? (
        <Alert tone="warning">
          The server did not send Plinko board settings. Update the backend and reload.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <section
          aria-labelledby="plinko-controls-heading"
          className="order-2 flex flex-col gap-5 panel p-5 lg:order-1"
        >
          <h2 id="plinko-controls-heading" className="sr-only">
            Drop controls
          </h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-night-300">Demo balance</span>
            <span className="font-semibold tabular-nums">
              {wallet ? `${formatCoins(wallet.balance)} ${wallet.currencyCode}` : '—'}
            </span>
          </div>

          <form noValidate onSubmit={(event) => void handlePlay(event)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
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
                  onClick={() => adjust('half')}
                  disabled={controlsLocked}
                >
                  ½
                </Button>
                <Button
                  variant="secondary"
                  aria-label="Double stake"
                  onClick={() => adjust('double')}
                  disabled={controlsLocked}
                >
                  2×
                </Button>
              </div>
            </div>

            {settings ? (
              <>
                <Segmented
                  label="Rows"
                  options={settings.rows}
                  value={activeRows}
                  onChange={(value) => {
                    setRows(value);
                    setResult(null);
                  }}
                  format={String}
                  disabled={controlsLocked}
                />
                <Segmented
                  label="Risk"
                  options={settings.risks}
                  value={activeRisk}
                  onChange={(value) => {
                    setRisk(value);
                    setResult(null);
                  }}
                  format={(value) => RISK_LABELS[value]}
                  disabled={controlsLocked}
                />
              </>
            ) : null}

            <Button
              type="submit"
              className="py-3 text-base"
              loading={busy}
              disabled={dropping || !table}
            >
              Drop ball
            </Button>
          </form>

          {topMultiplier !== null ? (
            <p className="text-xs text-night-300">
              Edge buckets pay up to {compactMultiplier(topMultiplier)} and are the hardest to hit.
            </p>
          ) : null}
          <p role="status" className="text-sm text-night-300">
            {status}
          </p>

          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          {result && !dropping ? <RoundResult round={result} /> : null}
        </section>

        <div className="order-1 lg:order-2">
          <PlinkoCanvas state={visual} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="plinko-rules-heading"
          className="panel p-5"
        >
          <h2 id="plinko-rules-heading" className="text-lg font-semibold">
            How Plinko works
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-night-300">
            {PLINKO?.rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ol>
        </section>
        <RecentRounds game="plinko" version={historyVersion} />
      </div>

      <p className="text-xs text-night-300">
        Virtual coins only. Coins have no monetary value and cannot be redeemed.
      </p>
    </div>
  );
}
