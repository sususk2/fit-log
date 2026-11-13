import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, setupError } from './firebase.js';
import { createAuthStore } from './data/authStore.js';

// 로그인 상태를 Firebase에서 받아 온다. (7주차 실습 useAuth를 Observer 저장소 구독 방식으로 바꿈)
const authStore = setupError ? null : createAuthStore({ auth, observe: onAuthStateChanged });

export function useAuth() {
  const [state, setState] = useState(() => authStore?.getState() ?? { user: null, ready: false, message: '' });

  useEffect(() => {
    if (!authStore) return undefined;
    return authStore.subscribe(setState); // 화면이 사라지면 구독 해제
  }, []);

  return state;
}
