import { ArrowLeft, Pencil, ShoppingBag, Truck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MealIngredientsBadges,
  mealObservationText,
} from '@/components/MealIngredientsBadges';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { menusApi } from '@/services/menus';
import { ordersApi } from '@/services/orders';
import {
  ROUTES,
  requesterOrderEditPath,
  requesterOrderWizardPath,
} from '@/routes/constants';
import { formatDate, formatDateTime } from '@/utils/format';
import {
  canEditSubmittedOrder,
  formatEditCountdown,
  getOrderEditRemainingMs,
} from '@/utils/order-status';
import { orderFulfillmentLabel } from '@/utils/status-labels';
import { cn } from '@/lib/utils';
import type { OrderFulfillmentType } from '@/types/domain';

function FulfillmentLabel({
  type,
  className,
}: {
  type?: OrderFulfillmentType | null;
  className?: string;
}) {
  if (!type) return null;
  const Icon = type === 'DELIVERY' ? Truck : ShoppingBag;
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Icon className='size-3.5 shrink-0' aria-hidden />
      {orderFulfillmentLabel(type)}
    </span>
  );
}

export function RequesterOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId!),
    enabled: Boolean(orderId),
  });

  const menuDate = order?.menuDate?.slice(0, 10);
  const { data: menu } = useQuery({
    queryKey: ['menu', menuDate, order?.restaurantId],
    queryFn: () => menusApi.getByDate(menuDate!, order?.restaurantId),
    enabled: Boolean(menuDate),
  });

  useEffect(() => {
    if (order?.status === 'DRAFT') {
      navigate(requesterOrderWizardPath(order.id), { replace: true });
    }
  }, [order, navigate]);

  useEffect(() => {
    if (!order || order.status !== 'SUBMITTED') return;
    if (getOrderEditRemainingMs(order) <= 0) return;

    const timer = window.setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (getOrderEditRemainingMs(order, new Date(next)) <= 0) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [order]);

  if (isLoading || order?.status === 'DRAFT') {
    return <p className='text-sm text-muted-foreground'>Carregando…</p>;
  }

  if (!order) {
    return (
      <div className='space-y-3'>
        <p>Pedido não encontrado.</p>
        <Button asChild variant='outline'>
          <Link to={ROUTES.REQUESTER_ORDERS}>Voltar</Link>
        </Button>
      </div>
    );
  }

  const editRemainingMs = getOrderEditRemainingMs(order, new Date(now));
  const canEdit = canEditSubmittedOrder(order, new Date(now));
  const showEditButton = order.status === 'SUBMITTED';

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <Button
          variant='ghost'
          size='icon-sm'
          onClick={() => navigate(ROUTES.REQUESTER_ORDERS)}
        >
          <ArrowLeft className='size-4' />
        </Button>
        <div className='flex-1'>
          <h1 className='text-xl font-semibold tracking-tight'>
            #{order.orderCode}
          </h1>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base'>Resumo</CardTitle>
          <CardDescription className='space-y-0.5'>
            <p>
              {order.createdAt
                ? formatDateTime(order.createdAt)
                : formatDate(order.menuDate)}
            </p>
            <p>
              {order.quantity} marmita{order.quantity > 1 ? 's' : ''}
            </p>
            <p>
              <FulfillmentLabel type={order.fulfillmentType} />
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {order.meals.map((meal) => {
            const observation = mealObservationText(meal.notes);
            return (
              <div key={meal.id} className='rounded-2xl border p-3 text-sm'>
                <p className='mb-2 font-medium'>{meal.recipientName}</p>
                <MealIngredientsBadges
                  items={meal.items}
                  menuItems={menu?.items}
                  notes={meal.notes}
                />
                {observation ? (
                  <p className='mt-2 text-xs text-muted-foreground'>
                    {observation}
                  </p>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base'>Acompanhamento</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusTimeline items={order.statusHistory ?? []} />
        </CardContent>
      </Card>

      {showEditButton ? (
        <div className='flex justify-end'>
          {canEdit ? (
            <Button asChild className='h-auto min-h-9 py-1.5'>
              <Link
                to={requesterOrderEditPath(order.id)}
                className='inline-flex items-center gap-3 leading-tight'
              >
                <Pencil className='size-4 shrink-0' />
                <span className='flex flex-col items-start gap-0.5'>
                  <span>Editar pedido</span>
                  <span className='text-[11px] font-normal tabular-nums opacity-90'>
                    {formatEditCountdown(editRemainingMs)} restantes
                  </span>
                </span>
              </Link>
            </Button>
          ) : (
            <Button
              disabled
              className='h-auto min-h-9 gap-3 py-1.5'
              aria-label='Editar pedido — tempo esgotado'
            >
              <Pencil className='size-4 shrink-0' />
              <span className='flex flex-col items-start gap-0.5 leading-tight'>
                <span>Editar pedido</span>
                <span className='text-[11px] font-normal tabular-nums opacity-90'>
                  Tempo esgotado
                </span>
              </span>
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
