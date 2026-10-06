import type {
  CreateOrderPayload,
  Order,
  OrderStatus,
} from '@/types/domain';
import api from '@/utils/axiosConfig';

const BASE = '/orders';

export interface ListOrdersParams {
  status?: OrderStatus;
  menuDate?: string;
  fromDate?: string;
  toDate?: string;
  companyId?: string;
}

export const ordersApi = {
  async list(params?: ListOrdersParams): Promise<Order[]> {
    const { data } = await api.get<{ orders: Order[] }>(BASE, { params });
    return data.orders;
  },

  async getById(orderId: string): Promise<Order> {
    const { data } = await api.get<{ order: Order }>(`${BASE}/${orderId}`);
    return data.order;
  },

  async start(menuId: string): Promise<Order> {
    const { data } = await api.post<{ order: Order }>(`${BASE}/start`, {
      menuId,
    });
    return data.order;
  },

  async create(
    payload: CreateOrderPayload,
    options?: { skipErrorToast?: boolean },
  ): Promise<Order> {
    const { data } = await api.post<{ order: Order }>(BASE, payload, {
      skipErrorToast: options?.skipErrorToast,
    });
    return data.order;
  },

  async update(
    orderId: string,
    payload: CreateOrderPayload,
    options?: { skipErrorToast?: boolean },
  ): Promise<Order> {
    const { data } = await api.put<{ order: Order }>(
      `${BASE}/${orderId}`,
      payload,
      { skipErrorToast: options?.skipErrorToast },
    );
    return data.order;
  },

  async submit(orderId: string): Promise<Order> {
    const { data } = await api.post<{ order: Order }>(
      `${BASE}/${orderId}/submit`,
    );
    return data.order;
  },

  async changeStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const { data } = await api.patch<{ order: Order }>(
      `${BASE}/${orderId}/status`,
      { status },
    );
    return data.order;
  },
};
