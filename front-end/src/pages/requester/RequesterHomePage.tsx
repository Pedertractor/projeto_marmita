import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { MesaSoupIcon } from '@/components/mesa-soup-icon';
import { MenuItemIcon } from '@/components/MenuItemIcon';
import { menusApi } from '@/services/menus';
import { ordersApi } from '@/services/orders';
import { ROUTES, requesterOrderPath, requesterOrderWizardPath } from '@/routes/constants';
import { todayISODate, formatDate } from '@/utils/format';
import { orderFulfillmentLabel } from '@/utils/status-labels';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function RequesterHomePage() {
  const today = todayISODate();

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', today],
    queryFn: () => menusApi.getByDate(today),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: () => ordersApi.list(),
  });

  const recent = orders.slice(0, 5);
  const availableItems = menu?.items.filter((i) => i.available) ?? [];

  return (
    <div className='space-y-5'>
      <Card variant='promo'>
        <CardHeader className='pb-2'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <MesaSoupIcon size={20} className='text-primary' />
            Cardápio de hoje
          </CardTitle>
          <CardDescription>{formatDate(today)}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {menuLoading ? (
            <p className='text-sm text-muted-foreground'>Carregando…</p>
          ) : !menu ? (
            <p className='text-sm text-muted-foreground'>
              Ainda não há cardápio publicado para hoje.
            </p>
          ) : availableItems.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              Nenhum item disponível no momento.
            </p>
          ) : (
            <ul className='flex flex-wrap gap-2'>
              {availableItems.map((item) => (
                <li
                  key={item.id}
                  className='inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-sm shadow-sm'
                >
                  <MenuItemIcon iconKey={item.iconKey} size={16} className='text-primary' />
                  {item.name}
                </li>
              ))}
            </ul>
          )}
          <Button asChild className='w-full' disabled={!menu || availableItems.length === 0}>
            <Link to={ROUTES.REQUESTER_ORDER_NEW}>
              <Plus className='mr-2 size-4' />
              Solicitar marmitas
            </Link>
          </Button>
        </CardContent>
      </Card>

      <section className='space-y-3'>
        <div className='flex items-center justify-between'>
          <h2 className='text-base font-semibold'>Pedidos recentes</h2>
          <Button asChild variant='link' className='h-auto p-0'>
            <Link to={ROUTES.REQUESTER_ORDERS}>Ver todos</Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <p className='text-sm text-muted-foreground'>Nenhum pedido ainda.</p>
        ) : (
          <ul className='space-y-2'>
            {recent.map((order) => (
              <li key={order.id}>
                <Link
                  to={
                    order.status === 'DRAFT'
                      ? requesterOrderWizardPath(order.id)
                      : requesterOrderPath(order.id)
                  }
                  className='surface-row flex items-center justify-between'
                >
                  <div>
                    <p className='font-medium tracking-tight'>
                      #{order.orderCode}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {order.quantity} marmita{order.quantity > 1 ? 's' : ''}
                      {order.fulfillmentType
                        ? ` · ${orderFulfillmentLabel(order.fulfillmentType)}`
                        : ''}{' '}
                      · {formatDate(order.menuDate)}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
