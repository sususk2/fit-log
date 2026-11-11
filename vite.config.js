import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: 사이트 루트에 올리면 '/' (JCloud Nginx), 하위 경로면 VITE_BASE_PATH로 지정
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
