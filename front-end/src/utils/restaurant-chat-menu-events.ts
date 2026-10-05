export type RestaurantMenuChatEvent =
  | {
      id: string;
      type: 'menu_missing';
      menuDate: string;
      createdAt: string;
    }
  | {
      id: string;
      type: 'menu_registered';
      menuDate: string;
      menuId: string;
      registeredByName: string;
      createdAt: string;
    };

const FALLBACK_REGISTERED_BY = 'alguém da equipe';

const eventsKey = (userId: string) =>
  `marmita-restaurant-chat-menu-events:${userId}`;
const seenKey = (userId: string) =>
  `marmita-restaurant-chat-menu-seen:${userId}`;

function readEvents(userId: string): RestaurantMenuChatEvent[] {
  try {
    const raw = localStorage.getItem(eventsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMenuChatEvent);
  } catch {
    return [];
  }
}

function writeEvents(userId: string, events: RestaurantMenuChatEvent[]) {
  localStorage.setItem(eventsKey(userId), JSON.stringify(events));
}

function isMenuChatEvent(value: unknown): value is RestaurantMenuChatEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  if (typeof event.id !== 'string' || typeof event.menuDate !== 'string') {
    return false;
  }
  if (typeof event.createdAt !== 'string') return false;
  if (event.type === 'menu_missing') return true;
  return (
    event.type === 'menu_registered' &&
    typeof event.menuId === 'string' &&
    typeof event.registeredByName === 'string'
  );
}

function readSeen(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function writeSeen(userId: string, ids: Set<string>) {
  localStorage.setItem(seenKey(userId), JSON.stringify([...ids]));
}

function resolveRegisteredByName(menu: {
  createdBy?: { name: string } | null;
  updatedBy?: { name: string } | null;
}): string | null {
  const name =
    menu.createdBy?.name?.trim() || menu.updatedBy?.name?.trim() || '';
  return name || null;
}

function upsertRegisteredEvent(
  events: RestaurantMenuChatEvent[],
  input: {
    menuDate: string;
    menuId: string;
    registeredByName: string;
    createdAt: string;
  },
): { events: RestaurantMenuChatEvent[]; changed: boolean } {
  const next = [...events];
  const existingIndex = next.findIndex(
    (event) =>
      event.type === 'menu_registered' &&
      event.menuDate === input.menuDate &&
      event.menuId === input.menuId,
  );

  if (existingIndex === -1) {
    const missingAt = next.find(
      (event) =>
        event.type === 'menu_missing' && event.menuDate === input.menuDate,
    )?.createdAt;
    const createdAt =
      missingAt &&
      new Date(input.createdAt).getTime() <= new Date(missingAt).getTime()
        ? new Date(new Date(missingAt).getTime() + 1000).toISOString()
        : input.createdAt;

    next.push({
      id: `menu-registered:${input.menuId}`,
      type: 'menu_registered',
      menuDate: input.menuDate,
      menuId: input.menuId,
      registeredByName: input.registeredByName,
      createdAt,
    });
    return { events: next, changed: true };
  }

  const existing = next[existingIndex];
  if (
    existing?.type === 'menu_registered' &&
    existing.registeredByName !== input.registeredByName
  ) {
    next[existingIndex] = {
      ...existing,
      registeredByName: input.registeredByName,
    };
    return { events: next, changed: true };
  }

  return { events: next, changed: false };
}

/** Garante eventos persistidos do dia: alerta de falta e confirmação de lançamento. */
export function syncRestaurantMenuChatEvents(
  userId: string,
  menuDate: string,
  menu: {
    id: string;
    createdAt?: string;
    createdBy?: { name: string } | null;
    updatedBy?: { name: string } | null;
  } | null,
): RestaurantMenuChatEvent[] {
  const all = readEvents(userId);
  let next = [...all];
  let changed = false;

  if (!menu) {
    const hasMissing = next.some(
      (event) => event.type === 'menu_missing' && event.menuDate === menuDate,
    );
    if (!hasMissing) {
      next.push({
        id: `menu-missing:${menuDate}`,
        type: 'menu_missing',
        menuDate,
        createdAt: new Date().toISOString(),
      });
      changed = true;
    }
  } else {
    const registeredByName = resolveRegisteredByName(menu);
    if (registeredByName) {
      const result = upsertRegisteredEvent(next, {
        menuDate,
        menuId: menu.id,
        registeredByName,
        createdAt: menu.createdAt ?? new Date().toISOString(),
      });
      next = result.events;
      changed = result.changed;
    } else {
      const hasRegistered = next.some(
        (event) =>
          event.type === 'menu_registered' &&
          event.menuDate === menuDate &&
          event.menuId === menu.id,
      );
      if (!hasRegistered) {
        const result = upsertRegisteredEvent(next, {
          menuDate,
          menuId: menu.id,
          registeredByName: FALLBACK_REGISTERED_BY,
          createdAt: menu.createdAt ?? new Date().toISOString(),
        });
        next = result.events;
        changed = result.changed;
      }
    }
  }

  if (changed) writeEvents(userId, next);

  return next
    .filter((event) => event.menuDate === menuDate)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

/** Registra/atualiza a confirmação com o nome de quem acabou de salvar o cardápio. */
export function recordMenuRegisteredChatEvent(
  userId: string,
  input: {
    menuDate: string;
    menuId: string;
    registeredByName: string;
    createdAt?: string;
  },
) {
  const name = input.registeredByName.trim();
  if (!name) return;

  const result = upsertRegisteredEvent(readEvents(userId), {
    menuDate: input.menuDate,
    menuId: input.menuId,
    registeredByName: name,
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
  if (result.changed) writeEvents(userId, result.events);
}

export function getSeenRestaurantMenuChatIds(userId: string): Set<string> {
  return readSeen(userId);
}

export function markRestaurantMenuChatSeen(
  userId: string,
  eventIds: string[],
) {
  const next = readSeen(userId);
  for (const id of eventIds) next.add(id);
  writeSeen(userId, next);
  return next;
}
