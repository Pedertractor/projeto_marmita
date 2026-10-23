import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChefHat,
  FileDown,
  Printer,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { dashboardApi } from '@/services/dashboard';
import { menusApi } from '@/services/menus';
import { ordersApi } from '@/services/orders';
import { adminOrderPath, ROUTES } from '@/routes/constants';
import {
  formatDate,
  parseISODateLocal,
  todayISODate,
  toISODate,
} from '@/utils/format';
import { DatePicker } from '@/components/ui/date-picker';
import { orderFulfillmentLabel, orderStatusLabel } from '@/utils/status-labels';
import { canRestaurantStartPrep } from '@/utils/order-status';
import type { OrderFulfillmentType, OrderStatus } from '@/types/domain';
import { cn } from '@/lib/utils';
import { OrderSpecialBadge } from '@/components/OrderSpecialBadge';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const ACTIVE: OrderStatus[] = ['SUBMITTED', 'ACCEPTED', 'READY'];

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

export function RestaurantDashboardPage() {
  const queryClient = useQueryClient();
  const [menuDate, setMenuDate] = useState(todayISODate());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-restaurant', menuDate],
    queryFn: () => dashboardApi.restaurant({ menuDate }),
  });

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', menuDate],
    queryFn: () => menusApi.getByDate(menuDate),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', 'restaurant', menuDate],
    queryFn: () => ordersApi.list({ menuDate }),
  });

  const menuMissing = !menuLoading && menu === null;
  const isToday = menuDate === todayISODate();
  const prepWindowOpen = canRestaurantStartPrep(new Date(now));

  const submittedCount = orders.filter((o) => o.status === 'SUBMITTED').length;
  const acceptedCount = orders.filter((o) => o.status === 'ACCEPTED').length;
  const printableCount = orders.filter((o) => o.status !== 'DRAFT').length;

  const counts = Object.fromEntries(
    (stats?.byStatus ?? []).map((r) => [r.status, r]),
  ) as Partial<
    Record<OrderStatus, { orders: number; quantity: number }>
  >;

  async function invalidateDay() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['orders', 'restaurant', menuDate] }),
      queryClient.invalidateQueries({
        queryKey: ['dashboard-restaurant', menuDate],
      }),
    ]);
  }

  const startPrepMutation = useMutation({
    mutationFn: () => ordersApi.startPrepAndPrint(),
    onSuccess: async () => {
      await invalidateDay();
      toast.success('Preparo iniciado. PDF baixado para impressão.');
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : 'Não foi possível iniciar o preparo.';
      toast.error(message);
    },
  });

  const markReadyMutation = useMutation({
    mutationFn: () => ordersApi.markBatchReady(),
    onSuccess: async (result) => {
      await invalidateDay();
      toast.success(
        `${result.updated} pedido(s) marcado(s) como pronto(s).`,
      );
    },
  });

  const simulatePdfMutation = useMutation({
    mutationFn: () => ordersApi.simulatePrepPdf(),
    onSuccess: () => {
      toast.success('PDF de simulação baixado.');
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : 'Não foi possível gerar o PDF de simulação.';
      toast.error(message);
    },
  });

  const canStartPrep =
    isToday && prepWindowOpen && submittedCount > 0 && !startPrepMutation.isPending;
  const canMarkReady =
    isToday && acceptedCount > 0 && !markReadyMutation.isPending;
  const canSimulatePdf =
    isToday && printableCount > 0 && !simulatePdfMutation.isPending;

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold'>Operação do restaurante</h1>
        </div>
        <div className='flex flex-col gap-1'>
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

      {menuMissing ? (
        <div className='relative overflow-hidden rounded-2xl bg-amber-50 ring-1 ring-amber-200/80'>
          <div className='relative z-10 flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3'>
            <div className='min-w-0 space-y-0.5'>
              <p className='text-sm font-semibold leading-snug text-amber-950'>
                {isToday
                  ? 'Cardápio de hoje ainda não foi lançado'
                  : `Cardápio de ${formatDate(menuDate)} ainda não foi lançado`}
              </p>
              <p className='text-xs leading-snug text-amber-900/75'>
                {isToday
                  ? 'Os solicitantes já podem estar aguardando. Publique o cardápio o quanto antes para liberar os pedidos.'
                  : 'Publique o cardápio desta data para que os solicitantes consigam fazer pedidos.'}
              </p>
            </div>
            <Button asChild size='sm' className='shrink-0 self-start sm:self-center'>
              <Link to={`${ROUTES.MENU_EDIT}?date=${menuDate}`}>
                <BookOpen className='mr-1.5 size-3.5' />
                Lançar cardápio
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className='text-sm text-muted-foreground'>Carregando…</p>
      ) : (
        <div className='grid items-stretch gap-3 sm:grid-cols-3'>
          {ACTIVE.map((status) => {
            const ordersCount = counts[status]?.orders ?? 0;
            const quantity = counts[status]?.quantity ?? 0;
            return (
              <div
                key={status}
                className='relative flex h-36 overflow-hidden rounded-3xl bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/5'
              >
                <div className='relative z-10 flex flex-1 flex-col justify-between p-5'>
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
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader className='space-y-3'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <CardTitle>Fila do dia</CardTitle>
              <CardDescription>
                Pendentes: {stats?.pending.orders ?? 0} pedidos /{' '}
                {stats?.pending.quantity ?? 0} marmitas
              </CardDescription>
            </div>
            {isToday ? (
              <div className='flex flex-wrap gap-2'>
                <Button
                  type='button'
                  disabled={!canStartPrep}
                  onClick={() => startPrepMutation.mutate()}
                >
                  <FileDown className='mr-1.5 size-4' />
                  {startPrepMutation.isPending
                    ? 'Gerando…'
                    : 'Iniciar preparo e imprimir'}
                </Button>
                <Button
                  type='button'
                  variant='secondary'
                  disabled={!canMarkReady}
                  onClick={() => markReadyMutation.mutate()}
                >
                  <ChefHat className='mr-1.5 size-4' />
                  {markReadyMutation.isPending
                    ? 'Atualizando…'
                    : 'Marcar pedidos prontos'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  disabled={!canSimulatePdf}
                  onClick={() => simulatePdfMutation.mutate()}
                >
                  <Printer className='mr-1.5 size-4' />
                  {simulatePdfMutation.isPending
                    ? 'Gerando…'
                    : 'Simular PDF'}
                </Button>
              </div>
            ) : null}
          </div>
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
                  <p className='flex flex-wrap items-center gap-1.5 font-medium'>
                    <span>
                      {order.companyName} · {order.quantity} marmitas
                    </span>
                    {order.isSpecial ? <OrderSpecialBadge compact /> : null}
                  </p>
                  <p className='flex items-center gap-1.5 text-muted-foreground'>
                    <FulfillmentLabel type={order.fulfillmentType} />
                    {order.fulfillmentType ? (
                      <span aria-hidden>·</span>
                    ) : null}
                    <span>{order.requesterName}</span>
                  </p>
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
