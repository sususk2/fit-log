import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Vite가 .env.local에서 읽은 웹 앱 설정값 4개 (7주차 실습 코드와 같은 구성)
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 값이 비었거나 YOUR_ 예시값이 남아 있으면 연결하지 않고 안내 화면을 보여 준다.
export const setupError = Object.values(config).some(
  (value) => !value || value.includes('YOUR_'),
);

const app = setupError ? null : initializeApp(config);
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
