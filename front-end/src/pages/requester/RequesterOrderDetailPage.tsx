import { ArrowLeft, Pencil, ShoppingBag, Truck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
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
import { formatDate } from '@/utils/format';
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

  const canEdit = order.status === 'SUBMITTED';

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
          <p className='flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground'>
            <span>{formatDate(order.menuDate)}</span>
            <span aria-hidden>·</span>
            <FulfillmentLabel type={order.fulfillmentType} />
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base'>Resumo</CardTitle>
          <CardDescription className='flex flex-wrap items-center gap-x-1'>
            <span>
              {order.quantity} marmita{order.quantity > 1 ? 's' : ''}
            </span>
            <span aria-hidden>·</span>
            <FulfillmentLabel type={order.fulfillmentType} />
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

      {canEdit ? (
        <Button asChild>
          <Link to={requesterOrderEditPath(order.id)}>
            <Pencil className='mr-2 size-4' />
            Editar pedido
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
