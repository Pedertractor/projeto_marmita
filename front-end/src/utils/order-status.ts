import type { Order, OrderStatus } from '@/types/domain';

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['ACCEPTED'],
  ACCEPTED: ['READY'],
  READY: [],
};

/** Janela em que o solicitante pode editar um pedido já enviado. */
export const ORDER_EDIT_WINDOW_MS = 5 * 60 * 1000;

export function canTransitionStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/** Opções de avanço para restaurante/RH (não inclui DRAFT → SUBMITTED). */
export function nextStatusOptions(from: OrderStatus): OrderStatus[] {
  if (from === 'DRAFT') return [];
  return ORDER_STATUS_TRANSITIONS[from];
}

export function getOrderSubmittedAt(
  order: Pick<Order, 'createdAt' | 'statusHistory'>,
): Date | null {
  const submitted = order.statusHistory
    ?.filter((entry) => entry.toStatus === 'SUBMITTED')
    .at(-1);
  if (submitted?.createdAt) {
    const date = new Date(submitted.createdAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (!order.createdAt) return null;
  const fallback = new Date(order.createdAt);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export type RequesterEditBlockReason =
  | 'accepted'
  | 'ready'
  | 'expired'
  | 'not_editable';

/** Motivo pelo qual o solicitante não pode editar; null se ainda puder. */
export function getRequesterEditBlockReason(
  order: Pick<Order, 'status' | 'createdAt' | 'statusHistory'>,
  now = new Date(),
): RequesterEditBlockReason | null {
  if (order.status === 'ACCEPTED') return 'accepted';
  if (order.status === 'READY') return 'ready';
  if (order.status !== 'SUBMITTED') return 'not_editable';
  if (getOrderEditRemainingMs(order, now) <= 0) return 'expired';
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
    case 'expired':
      return 'O prazo de 5 minutos para editar o pedido expirou.';
    case 'not_editable':
      return 'Só é possível editar pedidos enviados.';
  }
}

/** Solicitante só edita pedido enviado, e apenas dentro da janela de 5 minutos. */
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
  if (text.includes('expirou') || text.includes('5 minutos')) {
    return requesterEditBlockMessage('expired');
  }
  return null;
}

/** Tempo restante (ms) da janela de edição; 0 se não puder editar. */
export function getOrderEditRemainingMs(
  order: Pick<Order, 'status' | 'createdAt' | 'statusHistory'>,
  now = new Date(),
): number {
  if (order.status !== 'SUBMITTED') return 0;
  const submittedAt = getOrderSubmittedAt(order);
  if (!submittedAt) return 0;
  return Math.max(
    0,
    ORDER_EDIT_WINDOW_MS - (now.getTime() - submittedAt.getTime()),
  );
}

/** Formata ms restantes como m:ss. */
export function formatEditCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
