# Frontend — Betting Game MVP

React 19 + Vite + TypeScript + Tailwind CSS v4 + Phaser 3. Virtual coins only: no sign-in,
payments, deposits, withdrawals or redemption. Follows `REQUIREMENTS.md` v3.0.

## Run

Requires Node.js 20.19+. Start the backend first (`cd ../backend && npm run dev`, port 5000).

```bash
npm install
npm run dev        # http://localhost:5173, proxies /api to http://localhost:5000
npm test           # Vitest
npm run typecheck
```

Set `VITE_API_BASE_URL` to call the API directly instead of through the dev proxy.

## Structure

- `src/api/` — the only place that calls the backend. `http.ts` unwraps `{ success, data }`
  and turns `{ success: false, error }` into `ApiError`.
- `src/features/crash/` — Crash screen. React owns the stake form, buttons, balance and
  history. `CrashScene.ts` (Phaser) only draws the curve from `crashVisualState.ts`.
- `src/features/plinko/` — Plinko screen. Same split: `PlinkoScene.ts` only replays the
  server's path from `plinkoVisualState.ts`. Board maths lives in `src/lib/plinko.ts`.
- `src/features/dice/` — Dice screen. `DiceScene.ts` (Phaser) draws the track and replays the
  server's roll from `diceVisualState.ts`. Bet preview maths lives in `src/lib/dice.ts`.
- `src/features/mines/` — Mines screen. The board is a grid of real buttons, not a canvas, so
  it works with a keyboard and screen readers. Tile states live in `src/lib/mines.ts`.
- `src/features/games/` — shared pieces: game catalog, `RecentRounds`, stake checks and the
  stake field. The placeholder page is unused while every game has its own page.
- `src/features/` — lobby, wallet, history, help.

## Crash and the server

- The server picks the crash point and keeps it secret until the round ends.
- The page polls `GET /api/games/crash/rounds/:id` every 250 ms. The curve animates
  locally between polls, but only the server decides when the round crashes and what a
  cash-out pays.
- Start sends an `Idempotency-Key`. After a network error, retrying the same stake reuses
  the key, so the stake cannot be taken twice.
- If a round is already running (for example after a page reload), Start resumes it.

## Plinko and the server

- Rows (8, 12, 16), risk levels and every bucket multiplier come from `GET /api/games`
  (`plinko.settings`). If they are missing, the page refuses to play rather than draw a board
  that does not match the server.
- `POST /api/games/plinko/play` debits, picks the path and settles in one request. The page
  then replays the returned `path` (about 1.4–2.7 s) and reveals the result and the new
  balance when the ball lands. Under reduced motion the ball still falls, but without the
  bounce or the bucket lift.
- Drop sends an `Idempotency-Key`. After a network error, retrying the same stake and board
  reuses the key, so the stake cannot be taken twice.
- One ball at a time: stake, rows and risk are locked while a ball is falling.

## Mines and the server

- Mine positions stay on the server while a round runs; the page only learns them when the
  round ends. Each tile click is one `POST /api/games/mines/reveal`.
- One reveal at a time. Cash-out needs at least one safe tile; revealing every safe tile
  cashes out automatically.
- On load, `GET /api/games/mines/active` resumes a round left running (refresh, another tab).
- Start sends an `Idempotency-Key`, reused when retrying the same stake and mine count after a
  network error. Repeat reveals and cash-outs are safe: the server never pays twice.

## Dice and the server

- Roll range, win-chance limits and house edge come from `GET /api/games` (`dice.settings`).
  The page previews win chance, multiplier and profit; the server recalculates all of them.
- Switching between roll under and roll over keeps the same win chance (under 50.00 ↔ over 49.99).
- `POST /api/games/dice/roll` settles in one request. The marker then slides to the roll (about
  0.7 s) and the result and new balance appear when it stops. Under reduced motion it jumps.
- Roll sends an `Idempotency-Key`, reused when retrying the same bet after a network error.

## Status

Done: lobby, all four games (Crash, Plinko, Mines, Dice) end to end, wallet, recent history,
help. Sign-in code exists but is disabled (`VITE_AUTH_ENABLED=false`).
