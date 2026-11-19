import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from '../api/auth';
import { ApiError } from '../api/http';
import type { LoginRequest, RegisterRequest, UserProfile } from '../api/types';
import { env } from '../config/env';
import { messageOf } from '../lib/errors';
import { AuthContext, type AuthContextValue, type AuthState } from './auth-context';

// Temporary: while auth is disabled, every visitor acts as this guest player.
// Remove once sign-in is required (VITE_AUTH_ENABLED=true).
const GUEST_USER: UserProfile = {
  id: 'guest',
  username: 'Guest',
  email: '',
  role: 'PLAYER',
  status: 'ACTIVE',
  createdAt: '',
};

const INITIAL_STATE: AuthState = env.authEnabled
  ? { status: 'loading', user: null, error: null }
  : { status: 'authenticated', user: GUEST_USER, error: null };

const AUTH_DISABLED_MESSAGE = 'Sign-in is turned off in this build.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  const loadSession = useCallback(async (signal?: AbortSignal) => {
    try {
      const user = await fetchMe(signal);
      if (signal?.aborted) return;
      setState(
        user
          ? { status: 'authenticated', user, error: null }
          : { status: 'anonymous', user: null, error: null },
      );
    } catch (error) {
      if (signal?.aborted) return;
      setState({
        status: 'error',
        user: null,
        error: messageOf(error, 'We could not check your session.'),
      });
    }
  }, []);

  useEffect(() => {
    if (!env.authEnabled) return;
    const controller = new AbortController();
    void loadSession(controller.signal);
    return () => controller.abort();
  }, [loadSession]);

  const refresh = useCallback(async () => {
    if (!env.authEnabled) return;
    setState((current) => ({ ...current, status: 'loading', error: null }));
    await loadSession();
  }, [loadSession]);

  const login = useCallback(async (request: LoginRequest) => {
    if (!env.authEnabled) throw new Error(AUTH_DISABLED_MESSAGE);
    const user = await apiLogin(request);
    setState({ status: 'authenticated', user, error: null });
  }, []);

  const register = useCallback(async (request: RegisterRequest) => {
    if (!env.authEnabled) throw new Error(AUTH_DISABLED_MESSAGE);
    await apiRegister(request);
    // Sign in explicitly so the flow works whether or not registration opens a session.
    const user = await apiLogin({ email: request.email, password: request.password });
    setState({ status: 'authenticated', user, error: null });
  }, []);

  const logout = useCallback(async () => {
    if (!env.authEnabled) return;
    try {
      await apiLogout();
    } catch (error) {
      // An expired session is already signed out; anything else must be reported.
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    setState({ status: 'anonymous', user: null, error: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, refresh }),
    [state, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
