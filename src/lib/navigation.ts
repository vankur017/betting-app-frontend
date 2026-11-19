const AUTH_PATHS = ['/login', '/register'];

/** Only allows same-app relative paths, so a crafted link cannot redirect off-site after sign-in. */
export function safeRedirectPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (AUTH_PATHS.some((path) => value === path || value.startsWith(`${path}?`))) return fallback;
  return value;
}
