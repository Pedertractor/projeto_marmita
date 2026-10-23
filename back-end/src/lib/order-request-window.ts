/** Fuso usado para as janelas de solicitação/edição do solicitante. */
export const ORDER_REQUEST_TIMEZONE = 'America/Sao_Paulo';

export const REQUESTER_ORDER_WINDOW_MESSAGE =
  'Pedidos só podem ser feitos ou editados até as 9h e das 14h às 17h.';

/** Minutos desde meia-noite no fuso de São Paulo. */
export function getSaoPauloMinutesOfDay(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ORDER_REQUEST_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

/**
 * Janelas abertas (America/Sao_Paulo):
 * - 00:00 inclusive até 09:00 exclusive
 * - 14:00 inclusive até 17:00 exclusive
 */
export function isRequesterOrderWindowOpen(now = new Date()): boolean {
  const minutes = getSaoPauloMinutesOfDay(now);
  const morningOpen = minutes < 9 * 60;
  const afternoonOpen = minutes >= 14 * 60 && minutes < 17 * 60;
  return morningOpen || afternoonOpen;
}

export const RESTAURANT_START_PREP_WINDOW_MESSAGE =
  'O preparo em lote só pode ser iniciado a partir das 9h (até 14h) ou a partir das 17h.';

/**
 * Restaurante pode iniciar preparo (America/Sao_Paulo):
 * - 09:00 inclusive até 14:00 exclusive
 * - 17:00 inclusive em diante
 */
export function canRestaurantStartPrep(now = new Date()): boolean {
  const minutes = getSaoPauloMinutesOfDay(now);
  const morningBatch = minutes >= 9 * 60 && minutes < 14 * 60;
  const afternoonBatch = minutes >= 17 * 60;
  return morningBatch || afternoonBatch;
}

export type RestaurantPrepBatch = 'morning' | 'afternoon';

export function getRestaurantPrepBatch(
  now = new Date(),
): RestaurantPrepBatch {
  return getSaoPauloMinutesOfDay(now) < 14 * 60 ? 'morning' : 'afternoon';
}

/** Data de hoje em America/Sao_Paulo como Date UTC (YYYY-MM-DD). */
export function todaySaoPauloDateOnly(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ORDER_REQUEST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatSaoPauloDateIso(now = new Date()): string {
  const d = todaySaoPauloDateOnly(now);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
