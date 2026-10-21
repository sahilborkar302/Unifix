import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the React app (5173) talks to the Express API (5000) through this proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
