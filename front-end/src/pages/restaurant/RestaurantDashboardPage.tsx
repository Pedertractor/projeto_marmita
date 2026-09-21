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

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold'>Operação do restaurante</h1>
          <p className='text-sm text-muted-foreground'>
            Pedidos do dia e contagem por status
          </p>
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
        <div className='grid gap-3 sm:grid-cols-3'>
          {ACTIVE.map((status) => (
            <Card key={status}>
              <CardHeader className='pb-2'>
                <CardDescription>{orderStatusLabel(status)}</CardDescription>
                <CardTitle className='text-2xl'>
                  {counts[status]?.orders ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className='text-xs text-muted-foreground'>
                {counts[status]?.quantity ?? 0} marmitas
              </CardContent>
            </Card>
          ))}
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
