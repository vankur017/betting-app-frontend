import { createContext, useContext } from 'react';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  message?: string;
}

export interface ToastApi {
  show: (toast: ToastInput) => void;
}

const NOOP: ToastApi = { show: () => undefined };

export const ToastContext = createContext<ToastApi | null>(null);

/** Short, self-dismissing notices. Outside a ToastProvider (e.g. in tests) toasts do nothing. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}
