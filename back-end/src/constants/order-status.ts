import type { $Enums } from '../generated/prisma/client.js';

/** Janela em que o solicitante pode editar um pedido já enviado. */
export const ORDER_EDIT_WINDOW_MS = 5 * 60 * 1000;

export const ORDER_STATUS_TRANSITIONS: Record<
  $Enums.OrderStatus,
  $Enums.OrderStatus[]
> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['ACCEPTED'],
  ACCEPTED: ['READY'],
  READY: [],
};

export function canTransitionStatus(
  from: $Enums.OrderStatus,
  to: $Enums.OrderStatus,
): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}
