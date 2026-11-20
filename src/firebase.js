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

// [패턴] Singleton — 앱 전체에서 Firebase 연결(App·Auth·Firestore)은 하나만 만든다.
// - 인스턴스 보관: 클래스의 비공개 정적 필드 #instance
// - 생성 제한: JavaScript에는 private 생성자가 없으므로, 모듈 안에서만 아는 CREATE_KEY 없이 new 하면 오류
// - 접근: FirebaseClient.getInstance() — 처음 호출 때만 만들고 이후에는 같은 객체를 돌려준다 (Lazy)
const CREATE_KEY = Symbol('FirebaseClient.create');

export class FirebaseClient {
  static #instance = null;

  constructor(key) {
    if (key !== CREATE_KEY) {
      throw new Error('FirebaseClient는 new로 만들 수 없습니다. FirebaseClient.getInstance()를 사용하세요.');
    }
    if (setupError) {
      this.app = null;
      this.auth = null;
      this.db = null;
    } else {
      this.app = initializeApp(config);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
    }
    Object.freeze(this);
  }

  static getInstance() {
    if (FirebaseClient.#instance === null) {
      FirebaseClient.#instance = new FirebaseClient(CREATE_KEY);
    }
    return FirebaseClient.#instance;
  }
}

export const { auth, db } = FirebaseClient.getInstance();
