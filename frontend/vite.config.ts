import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // Forward /api requests to NestJS: the browser only talks to Vite, so
    // there is a single origin and no CORS to configure.
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:3000',
    },
  },
});
