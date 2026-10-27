import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ShoppingBag, Truck } from 'lucide-react';
import {
  MealIngredientsBadges,
  mealObservationText,
} from '@/components/MealIngredientsBadges';
import { OrderSpecialBadge } from '@/components/OrderSpecialBadge';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  canCreateSpecialOrder,
  canUpdateOrderStatus,
  canViewOrderPricing,
} from '@/config/permissions';
import { useAuth } from '@/contexts/useAuth';
import {
  ordersListPath,
  safeInternalPath,
  type OrdersListLocationState,
} from '@/pages/orders/orders-list-url';
import { menusApi } from '@/services/menus';
import { ordersApi } from '@/services/orders';
import type { OrderFulfillmentType, OrderStatus } from '@/types/domain';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { nextStatusOptions } from '@/utils/order-status';
import {
  orderFulfillmentLabel,
  orderStatusActionLabel,
  orderStatusLabel,
} from '@/utils/status-labels';
import { specialOrderEditPath } from '@/routes/constants';

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

export function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) =>
      ordersApi.changeStatus(orderId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-restaurant'] });
      toast.success('Status atualizado.');
    },
  });

  if (isLoading) {
    return <p className='text-sm text-muted-foreground'>Carregando…</p>;
  }

  if (!order) {
    return <p>Pedido não encontrado.</p>;
  }

  const canUpdate = user?.role != null && canUpdateOrderStatus(user.role);
  const showPricing = user?.role != null && canViewOrderPricing(user.role);
  const next = nextStatusOptions(order.status);

  const ordersListReturnTo = safeInternalPath(
    (location.state as OrdersListLocationState | null)?.ordersListReturnTo,
    ordersListPath(),
  );

  const orderTime = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <Button asChild variant='ghost' size='icon-sm'>
          <Link to={ordersListReturnTo}>
            <ArrowLeft className='size-4' />
          </Link>
        </Button>
        <h1 className='flex flex-1 flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight'>
          #{order.orderCode}
          {order.isSpecial ? <OrderSpecialBadge /> : null}
        </h1>
        {order.isSpecial &&
        order.status === 'SUBMITTED' &&
        user?.role &&
        canCreateSpecialOrder(user.role) &&
        order.requesterId === user.id ? (
          <Button asChild variant='outline' size='sm'>
            <Link to={specialOrderEditPath(order.id)}>Editar</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
          <CardAction>
            <OrderStatusBadge status={order.status} />
          </CardAction>
        </CardHeader>
        <CardContent className='space-y-2 text-sm'>
          {order.isSpecial ? (
            <p className='text-amber-800'>
              Solicitação especial do RH (fora da janela normal).
            </p>
          ) : null}
          <p>
            Empresa: <strong>{order.companyName}</strong>
          </p>
          <p>
            Data:{' '}
            <strong>
              {formatDate(order.menuDate)} - {orderTime}
            </strong>
          </p>
          <p>
            Solicitante: <strong>{order.requesterName}</strong>
          </p>
          <p className='flex flex-wrap items-center gap-x-1'>
            <span>Atendimento:</span>
            <strong>
              <FulfillmentLabel type={order.fulfillmentType} />
            </strong>
          </p>
          <p>
            Quantidade: <strong>{order.quantity}</strong>
          </p>
          {showPricing ? (
            <>
              <p>
                Unitário: <strong>{formatCurrency(order.unitPrice)}</strong>
              </p>
              <p>
                Total: <strong>{formatCurrency(order.totalPrice)}</strong>
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marmitas</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {order.meals.map((meal) => {
            const observation = mealObservationText(meal.notes);
            return (
              <div key={meal.id} className='rounded-2xl border p-3 text-sm'>
                <p className='mb-2 font-medium'>{meal.recipientName}</p>
                {meal.workLocation?.trim() ? (
                  <p className='mb-2 text-xs text-muted-foreground'>
                    Local: {meal.workLocation.trim()}
                  </p>
                ) : null}
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
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusTimeline items={order.statusHistory ?? []} />
        </CardContent>
      </Card>

      {canUpdate && next.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Atualizar status</CardTitle>
            <CardDescription>
              Atual: {orderStatusLabel(order.status)}
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-wrap gap-2'>
            {next.map((status) => (
              <Button
                key={status}
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate(status)}
              >
                {orderStatusActionLabel(status)}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
