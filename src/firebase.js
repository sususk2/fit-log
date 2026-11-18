import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { createSingleton } from './lib/singleton.js';

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

// [패턴] Singleton — 앱 전체에서 Firebase 연결은 하나만 만든다.
export const getFirebase = createSingleton(() => {
  if (setupError) return Object.freeze({ app: null, auth: null, db: null });
  const app = initializeApp(config);
  return Object.freeze({ app, auth: getAuth(app), db: getFirestore(app) });
});

export const { auth, db } = getFirebase();
