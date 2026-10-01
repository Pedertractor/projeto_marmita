const storageKey = (userId: string) => `marmita-restaurant-chat-seen:${userId}`;

function readIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function writeIds(userId: string, ids: Set<string>) {
  localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
}

export function getSeenRestaurantOrderIds(userId: string): Set<string> {
  return readIds(userId);
}

export function markRestaurantOrdersSeen(userId: string, orderIds: string[]) {
  const next = readIds(userId);
  for (const id of orderIds) next.add(id);
  writeIds(userId, next);
  return next;
}
