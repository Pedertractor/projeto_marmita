import type { OrderFulfillmentType, OrderStatus } from '@/types/domain';



export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Solicitado',
  ACCEPTED: 'Aceito',
  READY: 'Pronto',
};

/** Texto do botão de transição (ação), distinto do rótulo de estado. */
export const ORDER_STATUS_ACTION_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Salvar rascunho',
  SUBMITTED: 'Solicitar',
  ACCEPTED: 'Aceitar',
  READY: 'Marcar pronto',
};

export const ORDER_FULFILLMENT_LABELS: Record<OrderFulfillmentType, string> = {
  PICKUP: 'Retirada',
  DELIVERY: 'Entrega',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

export function orderStatusActionLabel(status: string): string {
  return ORDER_STATUS_ACTION_LABELS[status as OrderStatus] ?? status;
}



export function orderFulfillmentLabel(

  type: OrderFulfillmentType | null | undefined,

): string {

  if (!type) return '—';

  return ORDER_FULFILLMENT_LABELS[type] ?? type;

}

