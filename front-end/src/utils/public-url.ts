import { resolveApiOrigin } from '@/utils/resolve-api-url';

/**
 * Aceita apenas caminhos relativos seguros (sem protocol-relative `//host`).
 */
function sanitizeUploadPath(imgPath: string): string | null {
  const trimmed = imgPath.trim();
  if (!trimmed || trimmed.includes('..')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  if (trimmed.startsWith('//')) return null;
  const path = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  if (!path || path.startsWith('/')) return null;
  return path;
}

/** URL absoluta para arquivo em `uploads/...` servido pelo back-end. */
export function receiptAbsoluteUrl(imgPath: string | null): string | null {
  if (!imgPath) return null;
  const path = sanitizeUploadPath(imgPath);
  if (!path) return null;
  const origin = resolveApiOrigin();
  // Em DEV com proxy, origin é '' → URL relativa same-origin.
  return origin ? `${origin}/${path}` : `/${path}`;
}
