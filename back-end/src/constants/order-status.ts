import type { $Enums } from '../generated/prisma/client.js';

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
