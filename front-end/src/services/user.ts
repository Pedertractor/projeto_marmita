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
  password: string;
  role: UserRole;
  companyId?: string | null;
  restaurantId?: string | null;
  active?: boolean;
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

  async register(payload: RegisterUserPayload): Promise<UserDetail> {
    const { data } = await api.post<{ user: UserDetail }>(
      `${BASE}/register`,
      payload,
    );
    return data.user;
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
  ): Promise<{ user: AuthUser }> {
    const { data } = await api.put<{ user: AuthUser }>(
      `${BASE}/me/change-password`,
      { newPassword },
    );
    return data;
  },
};
