import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In Docker, set VITE_PROXY_TARGET=http://backend:3001 (backend service name)
const proxyTarget = process.env['VITE_PROXY_TARGET'] ?? 'http://localhost:3001';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // listen on 0.0.0.0 so Docker can expose the port
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/health': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
