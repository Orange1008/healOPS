import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api/patients': process.env.VITE_PATIENT_URL || 'http://localhost:4000',
      '/api/billing': process.env.VITE_BILLING_URL || 'http://localhost:4001',
      '/api/doctors': process.env.VITE_DOCTOR_URL || 'http://localhost:4002',
      '/api/appointments': process.env.VITE_APPOINTMENT_URL || 'http://localhost:4003',
      '/api/inventory': process.env.VITE_INVENTORY_URL || 'http://localhost:4004',
      '/api/pharmacy': process.env.VITE_PHARMACY_URL || 'http://localhost:4006',
      '/api/laboratory': process.env.VITE_LABORATORY_URL || 'http://localhost:4007',
      '/api/notifications': process.env.VITE_NOTIFICATION_URL || 'http://localhost:4008',
      '/auth': process.env.VITE_AUTH_URL || 'http://localhost:4005',
      '/healops': {
        target: process.env.VITE_HEALOPS_URL || 'http://localhost:8090',
        rewrite: (path) => path.replace(/^\/healops/, '')
      }
    }
  },
  build: {
    cssMinify: false
  }
});
