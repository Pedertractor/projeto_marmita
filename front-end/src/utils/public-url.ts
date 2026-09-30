import { resolveApiOrigin } from '@/utils/resolve-api-url';

/** URL absoluta para arquivo em `uploads/...` servido pelo back-end. */
export function receiptAbsoluteUrl(imgPath: string | null): string | null {
  if (!imgPath) return null;
  const path = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
  const origin = resolveApiOrigin();
  // Em DEV com proxy, origin é '' → URL relativa same-origin.
  return origin ? `${origin}/${path}` : `/${path}`;
}
