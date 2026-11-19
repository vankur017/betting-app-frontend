import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Wallet } from '../api/types';
import { getWallet } from '../api/wallet';
import { useAuth } from '../auth/auth-context';
import { messageOf } from '../lib/errors';
import { WalletContext, type WalletContextValue } from './wallet-context';

interface WalletState {
  wallet: Wallet | null;
  status: WalletContextValue['status'];
  error: string | null;
}

const IDLE: WalletState = { wallet: null, status: 'idle', error: null };

/** Holds the server-reported balance. The client never calculates balances itself. */
export function WalletProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth();
  const [state, setState] = useState<WalletState>(IDLE);
  // Ignores responses that arrive after sign-out or after a newer request.
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setState((current) => ({ ...current, status: 'loading', error: null }));
    try {
      const wallet = await getWallet();
      if (requestId === latestRequest.current) setState({ wallet, status: 'ready', error: null });
    } catch (error) {
      if (requestId === latestRequest.current) {
        setState((current) => ({
          ...current,
          status: 'error',
          error: messageOf(error, 'Balance unavailable.'),
        }));
      }
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      void refresh();
    } else {
      latestRequest.current++;
      setState(IDLE);
    }
  }, [authStatus, refresh]);

  const value = useMemo<WalletContextValue>(() => ({ ...state, refresh }), [state, refresh]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
