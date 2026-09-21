import type { OrderStatus } from '@/types/domain';
import api from '@/utils/axiosConfig';

export interface RhDashboardStats {
  byStatus: Array<{
    status: OrderStatus;
    orders: number;
    quantity: number;
    totalPrice: string | number;
  }>;
  byCompany: Array<{
    companyId: string;
    companyName: string;
    orders: number;
    quantity: number;
    totalPrice: string | number;
  }>;
  totals: {
    orders: number;
    quantity: number;
    totalPrice: string | number;
  };
}

export interface RestaurantDashboardStats {
  menuDate: string;
  restaurantId: string;
  byStatus: Array<{
    status: OrderStatus;
    orders: number;
    quantity: number;
  }>;
  pending: {
    orders: number;
    quantity: number;
  };
}

export const dashboardApi = {
  async rh(params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<RhDashboardStats> {
    const { data } = await api.get<{ stats: RhDashboardStats }>(
      '/dashboard/rh',
      { params },
    );
    return data.stats;
  },

  async restaurant(params?: {
    menuDate?: string;
  }): Promise<RestaurantDashboardStats> {
    const { data } = await api.get<{ stats: RestaurantDashboardStats }>(
      '/dashboard/restaurant',
      { params },
    );
    return data.stats;
  },
};
