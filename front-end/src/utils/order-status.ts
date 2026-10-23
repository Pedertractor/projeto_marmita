import type { Order, OrderStatus } from '@/types/domain';

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['ACCEPTED'],
  ACCEPTED: ['READY'],
  READY: [],
};

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

export type RequesterOrderWindowPhase =
  | 'morning'
  | 'afternoon'
  | 'before_afternoon'
  | 'after_hours';

export function getRequesterOrderWindowPhase(
  now = new Date(),
): RequesterOrderWindowPhase {
  const minutes = getSaoPauloMinutesOfDay(now);
  if (minutes < 9 * 60) return 'morning';
  if (minutes < 14 * 60) return 'before_afternoon';
  if (minutes < 17 * 60) return 'afternoon';
  return 'after_hours';
}

/** Texto curto da faixa atual ou da próxima. */
export function requesterOrderWindowHint(now = new Date()): string {
  switch (getRequesterOrderWindowPhase(now)) {
    case 'morning':
      return 'Disponível até as 9h';
    case 'afternoon':
      return 'Disponível das 14h às 17h';
    case 'before_afternoon':
      return 'Próxima janela: das 14h às 17h';
    case 'after_hours':
      return 'Próxima janela: até as 9h (amanhã)';
  }
}

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

/** Texto de disponibilidade do botão de preparo em lote. */
export function restaurantStartPrepHint(now = new Date()): string {
  const minutes = getSaoPauloMinutesOfDay(now);
  if (minutes < 9 * 60) return 'Disponível a partir das 9h';
  if (minutes < 14 * 60) return 'Disponível agora';
  if (minutes < 17 * 60) return 'Disponível a partir das 17h';
  return 'Disponível agora';
}

export function canTransitionStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/** Opções de avanço para restaurante/RH (não inclui DRAFT → SUBMITTED). */
export function nextStatusOptions(from: OrderStatus): OrderStatus[] {
  if (from === 'DRAFT') return [];
  return ORDER_STATUS_TRANSITIONS[from];
}

export type RequesterEditBlockReason =
  | 'accepted'
  | 'ready'
  | 'outside_window'
  | 'not_editable';

/** Motivo pelo qual o solicitante não pode editar; null se ainda puder. */
export function getRequesterEditBlockReason(
  order: Pick<Order, 'status' | 'createdAt' | 'statusHistory'>,
  now = new Date(),
): RequesterEditBlockReason | null {
  if (order.status === 'ACCEPTED') return 'accepted';
  if (order.status === 'READY') return 'ready';
  if (order.status !== 'SUBMITTED') return 'not_editable';
  if (!isRequesterOrderWindowOpen(now)) return 'outside_window';
  return null;
}

export function requesterEditBlockMessage(
  reason: RequesterEditBlockReason,
): string {
  switch (reason) {
    case 'accepted':
      return 'O restaurante já iniciou o preparo; o pedido não pode mais ser editado.';
    case 'ready':
      return 'O pedido já está pronto e não pode mais ser editado.';
    case 'outside_window':
      return REQUESTER_ORDER_WINDOW_MESSAGE;
    case 'not_editable':
      return 'Só é possível editar pedidos enviados.';
  }
}

/** Solicitante só edita pedido enviado dentro da janela do dia. */
export function canRequesterEditOrder(
  order: Pick<Order, 'status' | 'createdAt' | 'statusHistory'>,
  now = new Date(),
): boolean {
  return getRequesterEditBlockReason(order, now) === null;
}

/** Converte a mensagem da API na mesma frase mostrada na interface. */
export function requesterEditBlockMessageFromApi(
  apiMessage: string,
): string | null {
  const text = apiMessage.toLowerCase();
  if (text.includes('em preparo')) return requesterEditBlockMessage('accepted');
  if (text.includes('finalizado')) return requesterEditBlockMessage('ready');
  if (
    text.includes('até as 9h') ||
    text.includes('das 14h') ||
    text.includes('fora do horário')
  ) {
    return requesterEditBlockMessage('outside_window');
  }
  return null;
}
