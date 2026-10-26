/** True when the API target is the local backend (loopback). */
function isLocalApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '[::1]' ||
      parsed.hostname === '::1'
    );
  } catch {
    return false;
  }
}

/**
 * Origin of the API (no trailing slash, no `/api` suffix).
 * In Vite DEV against a loopback API, returns '' so requests use the
 * same-origin proxy (avoids Windows localhost→IPv6 ::1 connection delay).
 */
export function resolveApiOrigin(): string {
  const raw = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3404').trim();
  let url = raw.replace(/\/$/, '');

  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    url.startsWith('http:')
  ) {
    url = `https:${url.slice('http:'.length)}`;
  }

  url = url.replace(/\/api\/?$/, '');

  // Prefer Vite proxy in local development.
  if (import.meta.env.DEV && isLocalApiUrl(url || 'http://127.0.0.1:3404')) {
    return '';
  }

  // Avoid Windows delay: localhost resolves to ::1 first, and the API
  // often listens only on IPv4.
  url = url.replace(/^(https?:\/\/)localhost(?=[:/]|$)/i, '$1127.0.0.1');

  return url;
}

/** Axios `baseURL` including `/api`. */
export function resolveApiBaseUrl(): string {
  const origin = resolveApiOrigin();
  return origin ? `${origin}/api` : '/api';
}
