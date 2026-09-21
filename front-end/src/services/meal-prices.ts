import type { MealPrice } from '@/types/domain';
import api from '@/utils/axiosConfig';

const BASE = '/meal-prices';

export const mealPricesApi = {
  async getCurrent(companyId: string): Promise<MealPrice | null> {
    try {
      const { data } = await api.get<{ mealPrice: MealPrice | null }>(
        `${BASE}/current`,
        {
          params: { companyId },
          skipErrorToast: true,
        },
      );
      return data.mealPrice;
    } catch (err: unknown) {
      const status =
        err && typeof err === 'object' && 'status' in err
          ? Number((err as { status: number }).status)
          : undefined;
      if (status === 404) return null;
      throw err;
    }
  },

  async history(companyId: string): Promise<MealPrice[]> {
    const { data } = await api.get<{ history: MealPrice[] }>(`${BASE}/history`, {
      params: { companyId },
    });
    return data.history;
  },

  async create(payload: {
    companyId: string;
    amount: number;
    effectiveFrom?: string;
  }): Promise<MealPrice> {
    const { data } = await api.post<{ mealPrice: MealPrice }>(BASE, payload);
    return data.mealPrice;
  },
};
