import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '../lib/errors';

export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

interface QueryOptions {
  /** Keep showing the last data while reloading, instead of going back to "loading". */
  keepPreviousData?: boolean;
}

/**
 * Runs `load` on mount and whenever its identity changes. Memoize `load` with useCallback.
 * In-flight requests are aborted when superseded or unmounted.
 */
export function useApiQuery<T>(
  load: (signal: AbortSignal) => Promise<T>,
  options: QueryOptions = {},
): QueryState<T> & { retry: () => void } {
  const keepPreviousData = options.keepPreviousData ?? false;
  const [state, setState] = useState<QueryState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) =>
      keepPreviousData && current.status === 'success' ? current : { status: 'loading' },
    );
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', error: messageOf(error) });
      },
    );
    return () => controller.abort();
  }, [load, attempt, keepPreviousData]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  return { ...state, retry };
}
