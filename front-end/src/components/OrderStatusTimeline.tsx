import {
  ORDER_STATUS_ICON,
  ORDER_STATUS_VARIANT,
} from '@/components/OrderStatusBadge';
import type { OrderStatusHistory } from '@/types/domain';
import { formatDateTime } from '@/utils/format';
import { orderStatusLabel } from '@/utils/status-labels';
import { cn } from '@/lib/utils';

type OrderStatusTimelineProps = {
  items: OrderStatusHistory[];
  className?: string;
};

export function OrderStatusTimeline({
  items,
  className,
}: OrderStatusTimelineProps) {
  if (items.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>Nenhum registro ainda.</p>
    );
  }

  return (
    <ol className={cn('relative', className)}>
      {items.map((entry, index) => {
        const Icon = ORDER_STATUS_ICON[entry.toStatus];
        const isLast = index === items.length - 1;

        return (
          <li key={entry.id} className='relative flex gap-3 pb-6 last:pb-0'>
            {!isLast ? (
              <span
                className='absolute left-[11px] top-7 bottom-0 w-px bg-border'
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full',
                ORDER_STATUS_VARIANT[entry.toStatus],
              )}
            >
              <Icon className='size-3.5' aria-hidden />
            </span>
            <div className='min-w-0 flex-1 pt-0.5'>
              <p className='text-sm font-medium leading-tight'>
                {orderStatusLabel(entry.toStatus)}
              </p>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                {formatDateTime(entry.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
