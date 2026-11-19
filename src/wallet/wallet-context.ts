import { createContext, useContext } from 'react';
import type { Wallet } from '../api/types';

export interface WalletContextValue {
  wallet: Wallet | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  /** Re-reads the server balance. Call after any round settles. */
  refresh: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used inside <WalletProvider>');
  return context;
}
