import type { Menu } from '@/types/domain';
import api from '@/utils/axiosConfig';

const BASE = '/menus';

export interface UpsertMenuPayload {
  date: string;
  restaurantId?: string;
  items: Array<{
    name: string;
    description?: string | null;
    iconKey?: string | null;
    available?: boolean;
    sortOrder?: number;
  }>;
}

export const menusApi = {
  async getByDate(date: string, restaurantId?: string): Promise<Menu | null> {
    try {
      const { data } = await api.get<{ menu: Menu | null }>(`${BASE}/by-date`, {
        params: { date, restaurantId },
        skipErrorToast: true,
      });
      return data.menu;
    } catch (err: unknown) {
      const status =
        err && typeof err === 'object' && 'status' in err
          ? Number((err as { status: number }).status)
          : undefined;
      if (status === 404) return null;
      throw err;
    }
  },

  async list(fromDate?: string, restaurantId?: string): Promise<Menu[]> {
    const { data } = await api.get<{ menus: Menu[] }>(BASE, {
      params: { fromDate, restaurantId },
    });
    return data.menus;
  },

  async upsert(payload: UpsertMenuPayload): Promise<Menu> {
    const { data } = await api.post<{ menu: Menu }>(BASE, payload);
    return data.menu;
  },
};
