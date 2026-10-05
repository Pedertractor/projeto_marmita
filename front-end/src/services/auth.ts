import type { AuthUser, LoginCredentials } from '@/types/auth';
import api from '@/utils/axiosConfig';

export type EmailChallengeSendResult = {
  sent: boolean;
  retryAfterSeconds: number;
  maskedEmail: string;
  expiresAt: string | null;
};

export type EmailChallengeForceResult = {
  user: AuthUser;
  emailSent: boolean;
  retryAfterSeconds: number;
  maskedEmail: string | null;
  expiresAt: string | null;
  sendError: string | null;
};

const challengeRequest = { skipErrorToast: true } as const;

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

  async sendEmailChallenge() {
    const { data } = await api.post<EmailChallengeSendResult>(
      '/users/me/email-challenge/send',
      {},
      challengeRequest,
    );
    return data;
  },

  async verifyEmailChallenge(code: string) {
    const { data } = await api.post<{ user: AuthUser }>(
      '/users/me/email-challenge/verify',
      { code },
      challengeRequest,
    );
    return data;
  },

  async forceEmailChallenge() {
    const { data } = await api.post<EmailChallengeForceResult>(
      '/users/me/email-challenge/force',
      {},
    );
    return data;
  },

  async updateMyEmail(email: string) {
    const { data } = await api.patch<{ user: AuthUser }>(
      '/users/me/email',
      { email },
      challengeRequest,
    );
    return data;
  },

  async forgotPassword(email: string) {
    const { data } = await api.post<{
      message: string;
      retryAfterSeconds: number;
    }>('/users/forgot-password', { email }, challengeRequest);
    return data;
  },

  async previewPasswordReset(token: string) {
    const { data } = await api.get<{
      name: string;
      maskedEmail: string;
    }>('/users/reset-password/preview', {
      params: { token },
      ...challengeRequest,
    });
    return data;
  },

  async resetPasswordWithToken(input: {
    token: string;
    newPassword: string;
  }) {
    const { data } = await api.post<{ message: string }>(
      '/users/reset-password',
      input,
      challengeRequest,
    );
    return data;
  },
};
