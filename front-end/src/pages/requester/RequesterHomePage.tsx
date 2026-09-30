import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Plus } from 'lucide-react';
import { BestPracticesCarousel } from '@/components/BestPracticesCarousel';
import { MesaSoupIcon } from '@/components/mesa-soup-icon';
import { MenuItemIcon } from '@/components/MenuItemIcon';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { useAuth } from '@/contexts/useAuth';
import { menusApi } from '@/services/menus';
import { ordersApi } from '@/services/orders';
import { ROUTES, requesterOrderPath, requesterOrderWizardPath } from '@/routes/constants';
import type { Order } from '@/types/domain';
import { todayISODate, formatDate } from '@/utils/format';
import { orderFulfillmentLabel } from '@/utils/status-labels';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function pickTodayOrder(orders: Order[]) {
  return orders.find((order) => order.status !== 'DRAFT') ?? orders.find((order) => order.status === 'DRAFT');
}

export function RequesterHomePage() {
  const { user } = useAuth();
  const today = todayISODate();
  const firstName = user?.name?.trim().split(/\s+/)[0];

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', today],
    queryFn: () => menusApi.getByDate(today),
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'mine', today],
    queryFn: () => ordersApi.list({ menuDate: today }),
  });

  const todayOrder = pickTodayOrder(orders);
  const hasRequestedToday = Boolean(
    todayOrder && todayOrder.status !== 'DRAFT',
  );
  const requestLabel = hasRequestedToday
    ? 'Solicitar mais marmitas'
    : 'Solicitar marmitas';
  const availableItems = menu?.items.filter((item) => item.available) ?? [];
  const canRequest = Boolean(menu && availableItems.length > 0);
  const waitingForMenu = menuLoading || !menu;
  const todayOrderHref = todayOrder
    ? todayOrder.status === 'DRAFT'
      ? requesterOrderWizardPath(todayOrder.id)
      : requesterOrderPath(todayOrder.id)
    : null;

  const todayOrderCard = (
    <Card
      className={cn(
        todayOrderHref &&
          'cursor-pointer transition-colors hover:bg-primary/[0.04]',
      )}
    >
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>Pedido de hoje</CardTitle>
      </CardHeader>
      <CardContent>
        {ordersLoading ? (
          <p className='text-sm text-muted-foreground'>Carregando…</p>
        ) : !todayOrder ? (
          <p className='text-sm text-muted-foreground'>
            Você ainda não solicitou marmitas hoje.
          </p>
        ) : todayOrder.status === 'DRAFT' ? (
          <div className='flex items-center justify-between gap-3'>
            <div>
              <p className='text-sm font-medium'>Pedido em rascunho</p>
              <p className='text-xs text-muted-foreground'>
                #{todayOrder.orderCode} · continue de onde parou
              </p>
            </div>
            <span className='inline-flex items-center text-sm font-medium text-primary'>
              Continuar
              <ChevronRight className='size-4' />
            </span>
          </div>
        ) : (
          <div className='flex items-center justify-between gap-3'>
            <div>
              <p className='font-medium tracking-tight'>#{todayOrder.orderCode}</p>
              <p className='text-xs text-muted-foreground'>
                {todayOrder.quantity} marmita{todayOrder.quantity > 1 ? 's' : ''}
                {todayOrder.fulfillmentType
                  ? ` · ${orderFulfillmentLabel(todayOrder.fulfillmentType)}`
                  : ''}
              </p>
            </div>
            <OrderStatusBadge status={todayOrder.status} />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className='space-y-5'>
      <header>
        <h1 className='text-xl font-semibold tracking-tight'>
          Bem-vindo{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className='text-sm text-muted-foreground'>Solicite as marmitas de hoje.</p>
      </header>

      {todayOrderHref ? (
        <Link
          to={todayOrderHref}
          className='block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          aria-label={
            todayOrder?.status === 'DRAFT'
              ? 'Continuar pedido de hoje'
              : 'Ver pedido de hoje'
          }
        >
          {todayOrderCard}
        </Link>
      ) : (
        todayOrderCard
      )}

      <div className='grid gap-5 lg:grid-cols-2 lg:items-stretch'>
        <Card variant='promo' className='h-full'>
          <CardHeader className='pb-2'>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <MesaSoupIcon size={20} className='text-primary' />
              Cardápio de hoje
            </CardTitle>
            <CardDescription>{formatDate(today)}</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-1 flex-col space-y-3'>
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
            <div className='mt-auto'>
              {canRequest ? (
                <Button asChild className='w-full'>
                  <Link to={ROUTES.REQUESTER_ORDER_NEW}>
                    <Plus className='mr-2 size-4' />
                    {requestLabel}
                  </Link>
                </Button>
              ) : (
                <Button className='w-full' disabled>
                  {waitingForMenu ? 'Aguardando cardápio' : requestLabel}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <BestPracticesCarousel className='h-full' />
      </div>
    </div>
  );
}
