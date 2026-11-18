import { defineConfig } from 'vitest/config';

// Security Rules 테스트 전용 설정 (Firestore 에뮬레이터가 켜져 있어야 한다)
// 일반 단위 테스트(npm test)와 분리해, 에뮬레이터 없이도 npm test는 바로 돌게 한다.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
