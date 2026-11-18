// [패턴] Observer — 로그인 상태 저장소.
// Firebase onAuthStateChanged를 한 번만 구독하고, 여러 화면(구독자)에게 { user, ready, message }를 알린다.
// observe 함수를 밖에서 받기 때문에 테스트에서는 가짜 observe로 바꿔 끼울 수 있다.
import { Subject } from '../lib/Subject.js';
import { toAppUser } from './adapters.js';
import { errorMessage } from '../errors.js';

export function createAuthStore({ auth, observe, adapt = toAppUser }) {
  const subject = new Subject();
  let state = { user: null, ready: false, message: '' };
  let stop = null;

  function setState(next) {
    state = next;
    subject.notify(state);
  }

  function start() {
    if (stop) return;
    stop = observe(auth,
      (firebaseUser) => setState({ user: adapt(firebaseUser), ready: true, message: '' }),
      (error) => setState({ user: null, ready: true, message: errorMessage(error) }));
  }

  return {
    getState: () => state,
    subscribe(observer) {
      const unsubscribe = subject.subscribe(observer);
      start();
      observer(state);
      return () => {
        unsubscribe();
        // 마지막 구독자가 떠나면 Firebase 관찰도 끝낸다
        if (subject.size === 0 && stop) {
          stop();
          stop = null;
        }
      };
    },
  };
}
