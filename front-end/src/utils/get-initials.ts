export function getInitials(name: string, fallback = '?'): string {
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
