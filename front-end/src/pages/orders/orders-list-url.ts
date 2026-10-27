import { ROUTES } from '@/routes/constants';

import { ORDER_STATUSES, type OrderStatus } from '@/types/domain';

import { todayISODate } from '@/utils/format';

import {

  DEFAULT_ORDERS_SORT,

  DEFAULT_SORT_DIRECTION,

  isOrdersSortColumn,

  isSortDirection,

  type OrdersSortColumn,

  type SortDirection,

} from '@/pages/orders/orders-list-sort';



const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;



export type OrdersListFilters = {

  menuDate: string;

  status: string;

  page: number;

  sort: OrdersSortColumn;

  sortDir: SortDirection;

};



export type OrdersListLocationState = {

  ordersListReturnTo?: string;

};

/** Aceita apenas caminhos internos relativos (começam com `/`, sem `//`). */
export function safeInternalPath(
  value: string | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback;
  return trimmed;
}



export function parseOrdersListFilters(

  searchParams: URLSearchParams,

): OrdersListFilters {

  const dataParam = searchParams.get('data');

  const menuDate =

    dataParam && ISO_DATE.test(dataParam) ? dataParam : todayISODate();



  const statusParam = searchParams.get('status');

  const status =

    statusParam &&

    (statusParam === 'ALL' ||

      ORDER_STATUSES.includes(statusParam as OrderStatus))

      ? statusParam

      : 'ALL';



  const pageRaw = Number(searchParams.get('page'));

  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;



  const sortParam = searchParams.get('sort');

  const sort =

    sortParam && isOrdersSortColumn(sortParam)

      ? sortParam

      : DEFAULT_ORDERS_SORT;



  const sortDirParam = searchParams.get('sortDir');

  const sortDir =

    sortDirParam && isSortDirection(sortDirParam)

      ? sortDirParam

      : DEFAULT_SORT_DIRECTION;



  return { menuDate, status, page, sort, sortDir };

}



export function buildOrdersListSearch(filters: OrdersListFilters): string {

  const params = new URLSearchParams();

  params.set('data', filters.menuDate);

  if (filters.status !== 'ALL') {

    params.set('status', filters.status);

  }

  if (filters.page > 1) {

    params.set('page', String(filters.page));

  }

  if (

    filters.sort !== DEFAULT_ORDERS_SORT ||

    filters.sortDir !== DEFAULT_SORT_DIRECTION

  ) {

    params.set('sort', filters.sort);

    params.set('sortDir', filters.sortDir);

  }

  const qs = params.toString();

  return qs ? `?${qs}` : '';

}



export function ordersListPath(filters: Partial<OrdersListFilters> = {}): string {

  const full: OrdersListFilters = {

    menuDate: filters.menuDate ?? todayISODate(),

    status: filters.status ?? 'ALL',

    page: filters.page ?? 1,

    sort: filters.sort ?? DEFAULT_ORDERS_SORT,

    sortDir: filters.sortDir ?? DEFAULT_SORT_DIRECTION,

  };

  return `${ROUTES.ORDERS}${buildOrdersListSearch(full)}`;

}

