import { apiRequest } from './http';
import type { Wallet } from './types';

/** Demo wallet: balance plus the most recent ledger entries. */
export function getWallet(signal?: AbortSignal): Promise<Wallet> {
  return apiRequest<Wallet>('/api/wallet', { signal });
}
