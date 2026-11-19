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
- `src/features/` — lobby, wallet, history, help, and placeholders for the other games.

## Crash and the server

- The server picks the crash point and keeps it secret until the round ends.
- The page polls `GET /api/games/crash/rounds/:id` every 250 ms. The curve animates
  locally between polls, but only the server decides when the round crashes and what a
  cash-out pays.
- Start sends an `Idempotency-Key`. After a network error, retrying the same stake reuses
  the key, so the stake cannot be taken twice.
- If a round is already running (for example after a page reload), Start resumes it.

## Status

Done: lobby, Crash end to end, wallet, recent history, help.
Not done: Plinko, Mines, Dice. Sign-in code exists but is disabled (`VITE_AUTH_ENABLED=false`).
