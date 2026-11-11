import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, setupError } from './firebase.js';
import { errorMessage } from './errors.js';

// 로그인 상태를 Firebase에서 받아 온다. (7주차 실습 코드의 useAuth 방식)
export function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (setupError) return undefined;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setMessage('');
      setReady(true);
    }, (error) => {
      setUser(null);
      setMessage(errorMessage(error));
      setReady(true);
    });
    return unsubscribe; // 화면이 사라지면 관찰 종료
  }, []);

  return { user, ready, message };
}
