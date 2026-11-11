import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' → 빌드 결과를 웹서버의 어느 경로에 올려도 동작하도록 상대 경로 사용
export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
