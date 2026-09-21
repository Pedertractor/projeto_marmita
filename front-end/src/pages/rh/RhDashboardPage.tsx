import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Loader2,
  Package,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { dashboardApi } from '@/services/dashboard';
import { ordersApi } from '@/services/orders';
import { adminOrderPath } from '@/routes/constants';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  parseISODateLocal,
  todayISODate,
  toISODate,
} from '@/utils/format';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { ReportByCompanySection } from '@/pages/rh/ReportByCompanySection';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function formatPeriodLabel(fromDate: string, toDate: string): string {
  if (fromDate === toDate) return formatDate(fromDate);
  return `${formatDate(fromDate)} a ${formatDate(toDate)}`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <Card variant='compact' className={className}>
      <CardContent className='flex items-center justify-between px-4 py-3'>
        <div className='min-w-0'>
          <p className='text-sm text-muted-foreground'>{label}</p>
          <p className='text-lg font-semibold tabular-nums tracking-tight'>
            {value}
          </p>
        </div>
        <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
          <Icon className='size-4' aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
}

export function RhDashboardPage() {
  const today = todayISODate();
  const [fromDate, setFromDate] = useState(today.slice(0, 8) + '01');
  const [toDate, setToDate] = useState(today);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-rh', fromDate, toDate],
    queryFn: () => dashboardApi.rh({ fromDate, toDate }),
  });

  const {
    data: periodOrders = [],
    isLoading: periodOrdersLoading,
  } = useQuery({
    queryKey: ['orders', 'rh-home-period', fromDate, toDate],
    queryFn: () => ordersApi.list({ fromDate, toDate }),
  });

  const periodLabel = formatPeriodLabel(fromDate, toDate);
  const showMenuDateInList = fromDate !== toDate;

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='font-semibold tracking-tight'>Home</h1>
        <p className='mt-1.5 text-sm text-muted-foreground'>
          Visão de custos e volume de marmitas
        </p>
        <div className='mt-3 flex flex-wrap items-end gap-x-4 gap-y-3'>
          <div className='grid gap-1.5'>
            <Label htmlFor='from'>De</Label>
            <DatePicker
              id='from'
              value={parseISODateLocal(fromDate)}
              onChange={(date) => {
                if (!date) return;
                const iso = toISODate(date);
                setFromDate(iso);
                if (iso > toDate) setToDate(iso);
              }}
            />
          </div>
          <div className='grid gap-1.5'>
            <Label htmlFor='to'>Até</Label>
            <DatePicker
              id='to'
              value={parseISODateLocal(toDate)}
              onChange={(date) => {
                if (!date) return;
                const iso = toISODate(date);
                setToDate(iso);
                if (iso < fromDate) setFromDate(iso);
              }}
            />
          </div>
        </div>
      </div>

      <ReportByCompanySection fromDate={fromDate} toDate={toDate} />

      {isLoading ? (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='size-4 animate-spin text-primary' aria-hidden />
          Carregando resumo…
        </div>
      ) : (
        <div className='grid gap-3 sm:grid-cols-3'>
          <MetricCard
            icon={ClipboardList}
            label='Pedidos no período'
            value={stats?.totals.orders ?? 0}
          />
          <MetricCard
            icon={Package}
            label='Marmitas'
            value={stats?.totals.quantity ?? 0}
          />
          <MetricCard
            icon={Wallet}
            label='Custo total'
            value={formatCurrency(stats?.totals.totalPrice)}
          />
        </div>
      )}

      <Card variant='compact'>
        <CardHeader className='flex flex-row items-center justify-between gap-3 px-4 pt-4 pb-0'>
          <div className='space-y-0.5'>
            <CardTitle className='flex items-center gap-1.5 text-sm font-medium'>
              <CalendarDays className='size-3.5 text-primary' aria-hidden />
              Pedidos do período
            </CardTitle>
            <CardDescription className='text-xs'>
              {periodOrders.length} pedido(s) · {periodLabel}
            </CardDescription>
          </div>
          <Button asChild variant='outline' size='sm' className='h-8 gap-1 text-xs'>
            <Link to='/pedidos'>
              Ver todos
              <ArrowRight className='size-3.5' aria-hidden />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className='space-y-1.5 px-4 pb-4 pt-3'>
          {periodOrdersLoading ? (
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Loader2 className='size-4 animate-spin text-primary' aria-hidden />
              Carregando pedidos…
            </div>
          ) : periodOrders.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              Nenhum pedido no período ({periodLabel}).
            </p>
          ) : (
            periodOrders.slice(0, 8).map((order) => (
              <Link
                key={order.id}
                to={adminOrderPath(order.id)}
                className='surface-row flex items-center justify-between gap-2 text-sm'
              >
                <div className='min-w-0'>
                  <p className='truncate font-medium'>{order.companyName}</p>
                  <p className='truncate text-xs text-muted-foreground'>
                    {order.quantity} marmitas · {order.requesterName}
                    {showMenuDateInList ? (
                      <> · cardápio {formatDate(order.menuDate)}</>
                    ) : null}
                    {' · '}
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                  <span className='text-sm font-medium tabular-nums'>
                    {formatCurrency(order.totalPrice)}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
