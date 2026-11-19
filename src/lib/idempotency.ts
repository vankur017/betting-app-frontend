/**
 * One key per user intent (e.g. one "start round" click). Reuse the same key when retrying
 * that intent so the backend can reject duplicates instead of debiting twice.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
