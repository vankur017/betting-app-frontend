import { RecentRounds } from '../games/RecentRounds';

/** Recent Crash rounds. Reloads whenever `version` changes (after each round ends). */
export function CrashRecentRounds({ version }: { version: number }) {
  return <RecentRounds game="crash" version={version} />;
}
