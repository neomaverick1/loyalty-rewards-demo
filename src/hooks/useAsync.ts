import { useEffect, useState } from 'react';
import { friendlyError } from '@/lib/format';

export interface AsyncState<T> {
  data: T | undefined;
  /** Loading with nothing to show yet. */
  loading: boolean;
  /** Reloading while the previous data stays on screen (pull to refresh). */
  refreshing: boolean;
  error: string | null;
  reload(): void;
}

interface Result<T> {
  load: () => Promise<T>;
  attempt: number;
  data: T | undefined;
  error: string | null;
}

/**
 * Runs `load` and tracks loading, refreshing and error states.
 *
 * Pass a memoized loader (wrap it in `useCallback`): a new loader starts a
 * fresh load. Results are tagged with the loader and attempt that produced
 * them, so a slow, outdated response can never overwrite newer data, for
 * example after switching wallets.
 */
export function useAsync<T>(load: (() => Promise<T>) | null): AsyncState<T> {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  useEffect(() => {
    if (!load) return;
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setResult({ load, attempt, data, error: null });
      },
      (e: unknown) => {
        if (cancelled) return;
        setResult((prev) => ({
          load,
          attempt,
          data: prev?.load === load ? prev.data : undefined,
          error: friendlyError(e),
        }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  // Only trust a result produced by the current loader.
  const current = load && result?.load === load ? result : null;
  const settled = current?.attempt === attempt;
  const data = current?.data;

  return {
    data,
    loading: !!load && !settled && data === undefined,
    refreshing: !settled && data !== undefined,
    error: settled ? current.error : null,
    reload: () => setAttempt((a) => a + 1),
  };
}
