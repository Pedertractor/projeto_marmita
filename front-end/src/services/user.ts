import type { AuthUser, ListUser, UserRole } from '@/types/auth';
import api from '@/utils/axiosConfig';

export interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cardNumber?: string | null;
  unit?: string | null;
  role: UserRole;
  mustChangePassword: boolean;
  requiresWorkLocation?: boolean;
  active: boolean;
  avatarUrl?: string | null;
  companyId?: string | null;
  restaurantId?: string | null;
  company?: {
    id: string;
    name: string;
    code?: string | null;
    active: boolean;
  } | null;
  createdAt?: string;
}

export interface RegisterUserPayload {
  email: string;
  name: string;
  role: UserRole;
  companyId?: string | null;
  restaurantId?: string | null;
  active?: boolean;
  requiresWorkLocation?: boolean;
}

export type CardUnit = 'PEDERTRACTOR' | 'TRACTOR';

export interface LookupEmployeeResult {
  name: string;
  cardNumber: string;
  unit: string;
  status: boolean;
  employeeExternalId: string;
}

export interface RegisterByCardPayload {
  cardNumber: string;
  unit: CardUnit;
  role: UserRole;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  restaurantId?: string | null;
  requiresWorkLocation?: boolean;
}

export interface UpdateUserByAdminPayload {
  name?: string;
  phone?: string | null;
  role?: UserRole;
  active?: boolean;
  requiresWorkLocation?: boolean;
  companyId?: string | null;
  restaurantId?: string | null;
}

const BASE = '/users';

export const userApi = {
  async listAll(): Promise<ListUser[]> {
    const { data } = await api.get<{ users: ListUser[] }>(BASE);
    return data.users;
  },

  async register(payload: RegisterUserPayload): Promise<{
    user: UserDetail;
    temporaryPassword: string;
  }> {
    const { data } = await api.post<{
      user: UserDetail;
      temporaryPassword: string;
    }>(`${BASE}/register`, payload);
    return data;
  },

  async lookupEmployee(
    cardNumber: string,
    unit: CardUnit,
  ): Promise<LookupEmployeeResult> {
    const { data } = await api.post<{ employee: LookupEmployeeResult }>(
      `${BASE}/lookup-employee`,
      { cardNumber, unit },
    );
    return data.employee;
  },

  async registerByCard(payload: RegisterByCardPayload): Promise<{
    user: UserDetail;
    temporaryPassword: string;
  }> {
    const { data } = await api.post<{
      user: UserDetail;
      temporaryPassword: string;
    }>(`${BASE}/register-by-card`, payload);
    return data;
  },

  async getById(userId: string): Promise<UserDetail> {
    const { data } = await api.get<{ user: UserDetail }>(`${BASE}/${userId}`);
    return data.user;
  },

  async updateByAdmin(
    userId: string,
    payload: UpdateUserByAdminPayload,
  ): Promise<UserDetail> {
    const { data } = await api.patch<{ user: UserDetail }>(
      `${BASE}/${userId}`,
      payload,
    );
    return data.user;
  },

  async resetPasswordByAdmin(userId: string): Promise<{
    user: UserDetail;
    temporaryPassword?: string;
  }> {
    const { data } = await api.post<{
      user: UserDetail;
      temporaryPassword?: string;
    }>(`${BASE}/${encodeURIComponent(userId)}/reset-password`);
    return data;
  },

  async deleteByAdmin(userId: string): Promise<{ ok: boolean }> {
    const { data } = await api.delete<{ ok: boolean }>(
      `${BASE}/${encodeURIComponent(userId)}`,
    );
    return data;
  },

  async changePasswordFirstLogin(
    newPassword: string,
  ): Promise<{ user: AuthUser; token: string }> {
    const { data } = await api.put<{ user: AuthUser; token: string }>(
      `${BASE}/me/change-password`,
      { newPassword },
    );
    return data;
  },
};
