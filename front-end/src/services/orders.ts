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

  async start(
    menuId: string,
    options?: { companyId?: string },
  ): Promise<Order> {
    const { data } = await api.post<{ order: Order }>(`${BASE}/start`, {
      menuId,
      ...(options?.companyId ? { companyId: options.companyId } : {}),
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

  async startPrepAndPrint(): Promise<{ filename: string }> {
    return downloadPdfBlob(`${BASE}/batch/start-prep`);
  },

  async simulatePrepPdf(): Promise<{ filename: string }> {
    return downloadPdfBlob(`${BASE}/batch/simulate-pdf`);
  },

  async markBatchReady(): Promise<{ updated: number }> {
    const { data } = await api.post<{ updated: number }>(
      `${BASE}/batch/mark-ready`,
      {},
    );
    return data;
  },
};

async function downloadPdfBlob(path: string): Promise<{ filename: string }> {
  try {
    const response = await api.post(path, {}, {
      responseType: 'blob',
      skipErrorToast: true,
    });
    const disposition = String(
      response.headers['content-disposition'] ?? '',
    );
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const filename =
      match?.[1] ?? `pedidos-${new Date().toISOString().slice(0, 10)}.pdf`;
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return { filename };
  } catch (err: unknown) {
    throw new Error(await readBlobApiError(err));
  }
}

async function readBlobApiError(err: unknown): Promise<string> {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    err.response &&
    typeof err.response === 'object' &&
    'data' in err.response
  ) {
    const data = (err.response as { data: unknown }).data;
    if (data instanceof Blob) {
      try {
        const text = await data.text();
        const parsed = JSON.parse(text) as { error?: string };
        if (parsed.error) return parsed.error;
      } catch {
        /* ignore */
      }
    }
    if (
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
    ) {
      return (data as { error: string }).error;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Não foi possível iniciar o preparo.';
}
