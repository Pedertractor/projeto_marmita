import type { AuthUser, LoginCredentials } from '@/types/auth';
import api from '@/utils/axiosConfig';

export const authApi = {
  async login(credentials: LoginCredentials) {
    const { data } = await api.post<{ user: AuthUser; token: string }>(
      '/users/login',
      credentials,
    );
    return data;
  },

  async getMe(token: string) {
    const { data } = await api.get<{ user: AuthUser }>('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  },
};
