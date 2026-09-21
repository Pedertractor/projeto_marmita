function resolveApiOrigin(): string {
  const raw = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5027';
  let url = raw;
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    url.startsWith('http:')
  ) {
    url = `https:${url.slice('http:'.length)}`;
  }
  return url.replace(/\/api\/?$/, '');
}

const serverOrigin = resolveApiOrigin();

/** URL absoluta para arquivo em `uploads/...` servido pelo back-end. */
export function receiptAbsoluteUrl(imgPath: string | null): string | null {
  if (!imgPath) return null;
  const path = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
  return `${serverOrigin}/${path}`;
}
