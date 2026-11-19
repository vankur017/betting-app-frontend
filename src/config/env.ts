function readString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function readBool(value: string | undefined, fallback: boolean): boolean {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
}

function readInt(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

/** Public, browser-visible configuration. Never place secrets here. */
export const env = {
  appName: readString(import.meta.env.VITE_APP_NAME, 'Mintline'),
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, ''),
  coinDecimals: readInt(import.meta.env.VITE_COIN_DECIMALS, 2, 0, 6),
  supportEmail: readString(import.meta.env.VITE_SUPPORT_EMAIL, ''),
  /** Off until the backend supports sign-in. When off, everyone plays as one guest player. */
  authEnabled: readBool(import.meta.env.VITE_AUTH_ENABLED, false),
} as const;
