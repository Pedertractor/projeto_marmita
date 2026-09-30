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

/** Pedidos SUBMITTED só podem ser editados nos primeiros 5 minutos após o envio. */
export function canEditSubmittedOrder(
  order: Pick<Order, 'status' | 'createdAt' | 'statusHistory'>,
  now = new Date(),
): boolean {
  return getOrderEditRemainingMs(order, now) > 0;
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
