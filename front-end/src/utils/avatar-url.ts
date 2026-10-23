import { resolveApiOrigin } from '@/utils/resolve-api-url';

/** Resolve avatar path/URL against the API origin when needed. */
export function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
): string | undefined {
  if (!avatarUrl) return undefined;
  if (
    avatarUrl.startsWith('http://') ||
    avatarUrl.startsWith('https://') ||
    avatarUrl.startsWith('data:')
  ) {
    return avatarUrl;
  }
  const origin = resolveApiOrigin();
  if (!origin) return avatarUrl;
  return `${origin}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
}
