import { FilePenLine, ShoppingBag, Ticket, TicketCheck, type LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import type { OrderStatus } from '@/types/domain';

import { orderStatusLabel } from '@/utils/status-labels';

import { cn } from '@/lib/utils';



export const ORDER_STATUS_VARIANT: Record<OrderStatus, string> = {

  DRAFT: 'bg-amber-100 text-amber-900 hover:bg-amber-100',

  SUBMITTED: 'bg-sky-100 text-sky-800 hover:bg-sky-100',

  ACCEPTED: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',

  READY: 'bg-violet-100 text-violet-800 hover:bg-violet-100',

};



export const ORDER_STATUS_ICON: Record<OrderStatus, LucideIcon> = {

  DRAFT: FilePenLine,

  SUBMITTED: Ticket,

  ACCEPTED: TicketCheck,

  READY: ShoppingBag,

};



export function OrderStatusBadge({

  status,

  compact = false,

}: {

  status: OrderStatus;

  compact?: boolean;

}) {

  const Icon = ORDER_STATUS_ICON[status];



  return (

    <Badge

      className={cn(

        'justify-center gap-1 rounded-full border-0 font-medium',

        compact ? 'w-[5.75rem] px-1.5 py-0 text-[0.6875rem]' : 'w-[6.75rem] px-2.5 py-0.5',

        ORDER_STATUS_VARIANT[status],

      )}

    >

      <Icon className={cn(compact ? 'size-3' : 'size-3.5')} aria-hidden />

      {orderStatusLabel(status)}

    </Badge>

  );

}

