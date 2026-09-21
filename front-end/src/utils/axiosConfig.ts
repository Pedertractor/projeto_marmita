import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
} from 'axios';
import { toast } from 'sonner';
import { clearAuthStorage, getStoredToken } from '@/utils/auth-storage';

function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5027';
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    raw.startsWith('http:')
  ) {
    return `https:${raw.slice('http:'.length)}`;
  }
  return raw;
}

const api_url = resolveApiBaseUrl();

const instance = axios.create({
  baseURL: `${api_url}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Default JSON Content-Type breaks multipart: browser must set boundary.
  if (config.data instanceof FormData && config.headers) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.delete('Content-Type');
    } else {
      delete (config.headers as Record<string, unknown>)['Content-Type'];
    }
  }
  return config;
});

const INTERNAL_SERVER_ERROR_MESSAGE = 'erro interno do servidor';

function resolveApiErrorMessage(
  status: number,
  apiMessage: string | undefined,
): string {
  if (status === 500) {
    return apiMessage?.trim() || INTERNAL_SERVER_ERROR_MESSAGE;
  }
  return apiMessage?.trim() || 'Erro inesperado, verifique a conexão.';
}

function applyErrorInterceptor(api: AxiosInstance) {
  api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ error?: string }>) => {
      let message: string;
      let status = 500;
      if (error.response) {
        status = error.response.status;
        const apiMessage = error.response.data?.error;
        if (
          status === 401 &&
          error.response.data.error !== 'Credenciais inválidas'
        ) {
          message =
            apiMessage?.trim() || 'Sua sessão expirou, faça login novamente.';
          clearAuthStorage();
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        } else {
          message = resolveApiErrorMessage(status, apiMessage);
        }
      } else {
        message = 'Erro ao conectar com o servidor, tente novamente.';
      }
      if (!error.config?.skipErrorToast) {
        toast.error(message);
      }
      return Promise.reject({ message, status });
    },
  );
}

applyErrorInterceptor(instance);

export default instance;
