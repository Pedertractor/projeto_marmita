import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { ordersApi } from '@/services/orders';
import { ROUTES, requesterOrderPath, requesterOrderWizardPath } from '@/routes/constants';
import { formatDate } from '@/utils/format';
import { orderFulfillmentLabel } from '@/utils/status-labels';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Button } from '@/components/ui/button';

const RECENT_ORDERS_LIMIT = 5;

export function MyOrdersPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: () => ordersApi.list(),
  });
  const recentOrders = orders.slice(0, RECENT_ORDERS_LIMIT);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-2'>
        <h1 className='text-xl font-semibold'>Meus pedidos</h1>
        <Button asChild size='sm'>
          <Link to={ROUTES.REQUESTER_ORDER_NEW}>
            <Plus className='mr-1 size-4' />
            Novo
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className='text-sm text-muted-foreground'>Carregando…</p>
      ) : recentOrders.length === 0 ? (
        <p className='text-sm text-muted-foreground'>Nenhum pedido encontrado.</p>
      ) : (
        <ul className='space-y-2'>
          {recentOrders.map((order) => (
            <li key={order.id}>
              <Link
                to={
                  order.status === 'DRAFT'
                    ? requesterOrderWizardPath(order.id)
                    : requesterOrderPath(order.id)
                }
                className='block rounded-lg border bg-card px-3 py-3 transition hover:bg-accent/40'
              >
                <div className='flex items-start justify-between gap-2'>
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
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
