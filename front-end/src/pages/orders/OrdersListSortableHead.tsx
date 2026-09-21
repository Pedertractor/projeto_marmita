import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { TableHead } from '@/components/ui/table';
import type { OrdersSortColumn, SortDirection } from '@/pages/orders/orders-list-sort';

type OrdersListSortableHeadProps = {
  label: string;
  column: OrdersSortColumn;
  activeColumn: OrdersSortColumn;
  direction: SortDirection;
  onSort: (column: OrdersSortColumn) => void;
  className?: string;
};

export function OrdersListSortableHead({
  label,
  column,
  activeColumn,
  direction,
  onSort,
  className,
}: OrdersListSortableHeadProps) {
  const active = activeColumn === column;
  const Icon = active
    ? direction === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <TableHead className={cn('h-9 px-3', className)}>
      <button
        type='button'
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
        onClick={() => onSort(column)}
      >
        {label}
        <Icon
          className={cn('size-3 shrink-0', active ? 'opacity-100' : 'opacity-40')}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}
