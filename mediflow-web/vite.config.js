import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api/patients': 'http://localhost:4000',
      '/api/billing': 'http://localhost:4001',
      '/api/doctors': 'http://localhost:4002',
      '/api/appointments': 'http://localhost:4003',
      '/api/inventory': 'http://localhost:4004',
      '/api/pharmacy': 'http://localhost:4006',
      '/api/laboratory': 'http://localhost:4007',
      '/api/notifications': 'http://localhost:4008',
      '/auth': 'http://localhost:4005'
    }
  },
  build: {
    cssMinify: false
  }
});
