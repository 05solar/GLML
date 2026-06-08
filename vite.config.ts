import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 프론트(/api/*) → 백엔드(Flask, http://localhost:8000) 프록시 (CORS 불필요)
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
