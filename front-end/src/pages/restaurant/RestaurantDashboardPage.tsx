import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/dashboard';
import { ordersApi } from '@/services/orders';
import { adminOrderPath } from '@/routes/constants';
import { parseISODateLocal, todayISODate, toISODate } from '@/utils/format';
import { DatePicker } from '@/components/ui/date-picker';
import { orderStatusLabel } from '@/utils/status-labels';
import type { OrderStatus } from '@/types/domain';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const ACTIVE: OrderStatus[] = ['SUBMITTED', 'ACCEPTED', 'READY'];

const STATUS_MASCOT: Partial<Record<OrderStatus, string>> = {
  SUBMITTED: '/tigela_waiting.png',
  ACCEPTED: '/tigela_cooking.png',
  READY: '/tigela_check.png',
};

export function RestaurantDashboardPage() {
  const [menuDate, setMenuDate] = useState(todayISODate());

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-restaurant', menuDate],
    queryFn: () => dashboardApi.restaurant({ menuDate }),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', 'restaurant', menuDate],
    queryFn: () => ordersApi.list({ menuDate }),
  });

  const counts = Object.fromEntries(
    (stats?.byStatus ?? []).map((r) => [r.status, r]),
  ) as Partial<
    Record<OrderStatus, { orders: number; quantity: number }>
  >;

  const leadingStatus = ACTIVE.reduce<OrderStatus | null>((leading, status) => {
    const currentOrders = counts[status]?.orders ?? 0;
    if (currentOrders <= 0) return leading;
    if (!leading) return status;
    return currentOrders > (counts[leading]?.orders ?? 0) ? status : leading;
  }, null);

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold'>Operação do restaurante</h1>
        </div>
        <div className='space-y-1'>
          <Label htmlFor='menuDate'>Data</Label>
          <DatePicker
            id='menuDate'
            value={parseISODateLocal(menuDate)}
            onChange={(date) => {
              if (date) setMenuDate(toISODate(date));
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <p className='text-sm text-muted-foreground'>Carregando…</p>
      ) : (
        <div className='grid items-stretch gap-3 sm:grid-cols-3'>
          {ACTIVE.map((status) => {
            const ordersCount = counts[status]?.orders ?? 0;
            const quantity = counts[status]?.quantity ?? 0;
            const mascotSrc =
              status === leadingStatus ? STATUS_MASCOT[status] : undefined;

            return (
              <div
                key={status}
                className='relative flex h-36 overflow-hidden rounded-3xl bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/5'
              >
                <div
                  className={`relative z-10 flex flex-1 flex-col justify-between p-5 ${mascotSrc ? 'pr-28' : ''}`}
                >
                  <p className='text-sm font-medium text-slate-500'>
                    {orderStatusLabel(status)}
                  </p>
                  <p className='text-4xl font-bold leading-none tracking-tight text-slate-900'>
                    {ordersCount}
                  </p>
                  <p className='text-xs text-slate-400'>
                    {quantity} marmitas
                  </p>
                </div>
                {mascotSrc ? (
                  <img
                    src={mascotSrc}
                    alt=''
                    className='pointer-events-none absolute right-0 bottom-0 h-32 w-auto max-w-[50%] object-contain object-right-bottom select-none'
                    draggable={false}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fila do dia</CardTitle>
          <CardDescription>
            Pendentes: {stats?.pending.orders ?? 0} pedidos /{' '}
            {stats?.pending.quantity ?? 0} marmitas
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-2'>
          {orders.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Sem pedidos nesta data.</p>
          ) : (
            orders.map((order) => (
              <Link
                key={order.id}
                to={adminOrderPath(order.id)}
                className='flex items-center justify-between rounded-md border px-3 py-3 text-sm hover:bg-accent/40'
              >
                <div>
                  <p className='font-medium'>
                    {order.companyName} · {order.quantity} marmitas
                  </p>
                  <p className='text-muted-foreground'>{order.requesterName}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
