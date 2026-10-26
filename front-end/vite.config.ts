/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const localApiTarget = 'http://127.0.0.1:3404';

// https://vite.dev/config/
export default defineConfig({
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
});
