/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const defaultApiTarget = 'http://127.0.0.1:3404';

function resolveProxyTarget(apiUrl: string | undefined): string {
  const raw = (apiUrl ?? defaultApiTarget).trim().replace(/\/$/, '');
  return raw.replace(/\/api\/?$/, '') || defaultApiTarget;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const localApiTarget = resolveProxyTarget(env.VITE_API_URL);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // Proxy same-origin avoids Windows localhost→::1 delay and CORS preflight.
      proxy: {
        '/api': {
          target: localApiTarget,
          changeOrigin: true,
        },
        '/health': {
          target: localApiTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: localApiTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'node',
    },
  };
});
