// 빌드 전에 Firebase 설정값 4개가 채워졌는지 검사한다. (7주차 실습 코드 방식)
import { loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const keys = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'];
const missing = keys.filter((key) => !env[key] || env[key].includes('YOUR_'));
if (missing.length) {
  console.error('Firebase 설정 누락: ' + missing.join(', '));
  console.error('.env.local 값을 확인하세요.');
  process.exit(1);
}
