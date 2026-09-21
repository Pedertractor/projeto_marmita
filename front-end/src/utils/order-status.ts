import type { OrderStatus } from '@/types/domain';

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['ACCEPTED'],
  ACCEPTED: ['READY'],
  READY: [],
};

export function canTransitionStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/** Opções de avanço para restaurante/RH (não inclui DRAFT → SUBMITTED). */
export function nextStatusOptions(from: OrderStatus): OrderStatus[] {
  if (from === 'DRAFT') return [];
  return ORDER_STATUS_TRANSITIONS[from];
}
