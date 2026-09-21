import type { Order, OrderStatus } from '@/types/domain';
import { ORDER_STATUSES } from '@/types/domain';

export const ORDERS_SORT_COLUMNS = [
  'menuDate',
  'company',
  'requester',
  'quantity',
  'total',
  'status',
] as const;

export type OrdersSortColumn = (typeof ORDERS_SORT_COLUMNS)[number];

export type SortDirection = 'asc' | 'desc';

export const DEFAULT_ORDERS_SORT: OrdersSortColumn = 'menuDate';
export const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';

export function isOrdersSortColumn(value: string): value is OrdersSortColumn {
  return (ORDERS_SORT_COLUMNS as readonly string[]).includes(value);
}

export function isSortDirection(value: string): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

const STATUS_RANK: Record<OrderStatus, number> = ORDER_STATUSES.reduce(
  (acc, status, index) => {
    acc[status] = index;
    return acc;
  },
  {} as Record<OrderStatus, number>,
);

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b), 'pt-BR', {
    sensitivity: 'base',
    numeric: true,
  });
}

function getSortValue(order: Order, column: OrdersSortColumn): string | number {
  switch (column) {
    case 'menuDate':
      return order.menuDate.slice(0, 10);
    case 'company':
      return order.companyName;
    case 'requester':
      return order.requesterName;
    case 'quantity':
      return order.quantity;
    case 'total':
      return Number(order.totalPrice) || 0;
    case 'status':
      return STATUS_RANK[order.status] ?? 0;
    default:
      return '';
  }
}

export function sortOrders(
  orders: Order[],
  column: OrdersSortColumn,
  direction: SortDirection,
): Order[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...orders].sort((a, b) => {
    const cmp = compareValues(getSortValue(a, column), getSortValue(b, column));
    if (cmp !== 0) return cmp * factor;
    return a.id.localeCompare(b.id);
  });
}

export function ordersSortColumnLabel(column: OrdersSortColumn): string {
  switch (column) {
    case 'menuDate':
      return 'Data';
    case 'company':
      return 'Empresa';
    case 'requester':
      return 'Solicitante';
    case 'quantity':
      return 'Qtd';
    case 'total':
      return 'Total';
    case 'status':
      return 'Status';
    default:
      return column;
  }
}

export function nextSortDirection(
  currentColumn: OrdersSortColumn,
  clickedColumn: OrdersSortColumn,
  currentDirection: SortDirection,
): SortDirection {
  if (currentColumn !== clickedColumn) return 'asc';
  return currentDirection === 'asc' ? 'desc' : 'asc';
}
