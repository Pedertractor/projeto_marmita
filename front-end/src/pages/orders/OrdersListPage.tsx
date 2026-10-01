import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { ordersApi } from '@/services/orders';
import { adminOrderPath } from '@/routes/constants';
import { canViewOrderPricing } from '@/config/permissions';
import { useAuth } from '@/contexts/useAuth';
import {
  formatCurrency,
  formatDate,
  parseISODateLocal,
  toISODate,
} from '@/utils/format';
import type { OrderStatus } from '@/types/domain';
import { ORDER_STATUSES } from '@/types/domain';
import { orderStatusLabel } from '@/utils/status-labels';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { TABLE_PAGE_SIZE } from '@/constants/table';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { TablePagination } from '@/components/ui/table-pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyRow, TableSection } from '@/components/ui/table-section';
import {
  ordersListPath,
  parseOrdersListFilters,
  type OrdersListLocationState,
} from '@/pages/orders/orders-list-url';
import {
  DEFAULT_ORDERS_SORT,
  nextSortDirection,
  sortOrders,
  type OrdersSortColumn,
} from '@/pages/orders/orders-list-sort';
import { OrdersListSortableHead } from '@/pages/orders/OrdersListSortableHead';

export function OrdersListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const showPricing = user?.role != null && canViewOrderPricing(user.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const { menuDate, status, page, sort: sortRaw, sortDir } =
    parseOrdersListFilters(searchParams);
  const sort =
    !showPricing && sortRaw === 'total' ? DEFAULT_ORDERS_SORT : sortRaw;

  const patchFilters = (patch: {
    menuDate?: string;
    status?: string;
    page?: number;
    sort?: OrdersSortColumn;
    sortDir?: 'asc' | 'desc';
  }) => {
    const next = {
      menuDate: patch.menuDate ?? menuDate,
      status: patch.status ?? status,
      page: patch.page ?? page,
      sort: patch.sort ?? sort,
      sortDir: patch.sortDir ?? sortDir,
    };
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('data', next.menuDate);
        if (next.status === 'ALL') params.delete('status');
        else params.set('status', next.status);
        if (next.page <= 1) params.delete('page');
        else params.set('page', String(next.page));
        params.set('sort', next.sort);
        params.set('sortDir', next.sortDir);
        return params;
      },
      { replace: true },
    );
  };

  const handleSort = (column: OrdersSortColumn) => {
    patchFilters({
      sort: column,
      sortDir: nextSortDirection(sort, column, sortDir),
      page: 1,
    });
  };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', 'admin', menuDate, status],
    queryFn: () =>
      ordersApi.list({
        menuDate: menuDate || undefined,
        status: status === 'ALL' ? undefined : (status as OrderStatus),
      }),
  });

  const sortedOrders = useMemo(
    () => sortOrders(orders, sort, sortDir),
    [orders, sort, sortDir],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(sortedOrders.length / TABLE_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * TABLE_PAGE_SIZE;
    return sortedOrders.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedOrders, safePage]);

  const openOrderDetail = (orderId: string) => {
    const returnTo = ordersListPath({
      menuDate,
      status,
      page: safePage,
      sort,
      sortDir,
    });
    navigate(adminOrderPath(orderId), {
      state: { ordersListReturnTo: returnTo } satisfies OrdersListLocationState,
    });
  };

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='font-semibold tracking-tight'>Pedidos</h1>
        <p className='mt-1.5 text-sm text-muted-foreground'>
          Lista operacional e administrativa
        </p>
        <div className='mt-3 flex flex-wrap items-end gap-x-4 gap-y-3'>
          <div className='grid gap-1.5'>
            <Label htmlFor='orders-menu-date' className='text-sm'>
              Data do cardápio
            </Label>
            <DatePicker
              id='orders-menu-date'
              className='h-10! min-h-10 w-auto rounded-2xl px-3 py-2'
              value={parseISODateLocal(menuDate)}
              onChange={(date) => {
                if (date) patchFilters({ menuDate: toISODate(date), page: 1 });
              }}
            />
          </div>
          <div className='grid gap-1.5'>
            <Label htmlFor='orders-status' className='text-sm'>
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(v) => patchFilters({ status: v, page: 1 })}
            >
              <SelectTrigger id='orders-status' className='h-10 w-40'>
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>Todos</SelectItem>
                {ORDER_STATUSES.filter((s) => s !== 'DRAFT').map((s) => (
                  <SelectItem key={s} value={s}>
                    {orderStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='size-4 animate-spin text-primary' aria-hidden />
          Carregando pedidos…
        </div>
      ) : (
        <>
        <div className='space-y-2 md:hidden'>
          {pageItems.length === 0 ? (
            <Card>
              <CardContent className='py-8 text-center text-sm text-muted-foreground'>
                Nenhum pedido encontrado.
              </CardContent>
            </Card>
          ) : (
            pageItems.map((order) => (
              <Card
                key={order.id}
                className='cursor-pointer transition hover:bg-primary/4'
                onClick={() => openOrderDetail(order.id)}
              >
                <CardContent className='space-y-2 px-4 py-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <p className='text-sm font-semibold tracking-tight'>
                      #{order.orderCode}
                    </p>
                    <OrderStatusBadge status={order.status} compact />
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {formatDate(order.menuDate)}
                  </p>
                  <p className='truncate text-sm' title={order.companyName}>
                    {order.companyName}
                  </p>
                  <p
                    className='truncate text-sm text-muted-foreground'
                    title={order.requesterName}
                  >
                    {order.requesterName}
                  </p>
                  <div className='flex items-center justify-between gap-2 text-sm'>
                    <span className='text-muted-foreground'>
                      {order.quantity} marmita{order.quantity > 1 ? 's' : ''}
                    </span>
                    {showPricing ? (
                      <span className='font-medium tabular-nums'>
                        {formatCurrency(order.totalPrice)}
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          <div className='overflow-hidden rounded-2xl border-0 bg-card shadow-card'>
            <TablePagination
              page={safePage}
              totalPages={totalPages}
              onPageChange={(p) => patchFilters({ page: p })}
              summary={
                <span className='text-xs text-muted-foreground'>
                  {sortedOrders.length} pedido(s)
                </span>
              }
            />
          </div>
        </div>

        <TableSection
          className='hidden text-sm md:block'
          tableClassName='table-auto'
          pagination={{
            page: safePage,
            totalPages,
            onPageChange: (p) => patchFilters({ page: p }),
            summary: (
              <span className='text-xs text-muted-foreground'>
                {sortedOrders.length} pedido(s)
              </span>
            ),
          }}
        >
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='px-3 py-2 text-xs font-medium'>
                Código
              </TableHead>
              <OrdersListSortableHead
                label='Data'
                column='menuDate'
                activeColumn={sort}
                direction={sortDir}
                onSort={handleSort}
              />
              <OrdersListSortableHead
                label='Empresa'
                column='company'
                activeColumn={sort}
                direction={sortDir}
                onSort={handleSort}
              />
              <OrdersListSortableHead
                label='Solicitante'
                column='requester'
                activeColumn={sort}
                direction={sortDir}
                onSort={handleSort}
              />
              <OrdersListSortableHead
                label='Qtd'
                column='quantity'
                activeColumn={sort}
                direction={sortDir}
                onSort={handleSort}
                className='text-center [&_button]:mx-auto'
              />
              {showPricing ? (
                <OrdersListSortableHead
                  label='Total'
                  column='total'
                  activeColumn={sort}
                  direction={sortDir}
                  onSort={handleSort}
                />
              ) : null}
              <OrdersListSortableHead
                label='Status'
                column='status'
                activeColumn={sort}
                direction={sortDir}
                onSort={handleSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableEmptyRow colSpan={showPricing ? 7 : 6}>
                Nenhum pedido encontrado.
              </TableEmptyRow>
            ) : (
              pageItems.map((order) => (
                <TableRow
                  key={order.id}
                  className='cursor-pointer hover:bg-primary/4'
                  onClick={() => openOrderDetail(order.id)}
                >
                  <TableCell className='px-3 py-2 text-sm font-medium tracking-tight'>
                    #{order.orderCode}
                  </TableCell>
                  <TableCell className='px-3 py-2 text-sm'>
                    {formatDate(order.menuDate)}
                  </TableCell>
                  <TableCell
                    className='max-w-48 truncate px-3 py-2 text-sm'
                    title={order.companyName}
                  >
                    {order.companyName}
                  </TableCell>
                  <TableCell
                    className='max-w-48 truncate px-3 py-2 text-sm text-muted-foreground'
                    title={order.requesterName}
                  >
                    {order.requesterName}
                  </TableCell>
                  <TableCell className='px-3 py-2 text-center text-sm tabular-nums'>
                    {order.quantity}
                  </TableCell>
                  {showPricing ? (
                    <TableCell className='px-3 py-2 text-sm tabular-nums font-medium'>
                      {formatCurrency(order.totalPrice)}
                    </TableCell>
                  ) : null}
                  <TableCell className='px-3 py-2'>
                    <OrderStatusBadge status={order.status} compact />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableSection>
        </>
      )}
    </div>
  );
}

