import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { ToastContext, type ToastApi, type ToastInput, type ToastTone } from './toast-context';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

const LIFETIME_MS = 3500;
const MAX_VISIBLE = 3;

const TONE_BAR: Record<ToastTone, string> = {
  info: 'before:bg-sky-400',
  success: 'before:bg-mint-400',
  error: 'before:bg-rose-400',
};

/** Renders up to three toasts under the header; each disappears after a few seconds. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const item: ToastItem = {
        id,
        tone: input.tone ?? 'info',
        title: input.title,
        message: input.message,
      };
      setToasts((list) => [...list.slice(-(MAX_VISIBLE - 1)), item]);
      window.setTimeout(() => dismiss(id), LIFETIME_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-20 z-50 flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-6 sm:items-end sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cx(
              'pointer-events-auto relative w-full max-w-sm animate-toast overflow-hidden rounded-xl border border-white/10 bg-night-800 py-3 pl-5 pr-10 text-sm shadow-[0_16px_40px_-16px_rgb(0_0_0/0.9)] before:absolute before:inset-y-0 before:left-0 before:w-1',
              TONE_BAR[toast.tone],
            )}
          >
            <p className="font-semibold text-night-100">{toast.title}</p>
            {toast.message ? <p className="mt-0.5 text-night-300">{toast.message}</p> : null}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="absolute right-2 top-2 rounded-md px-1.5 text-base leading-6 text-night-400 hover:text-night-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
