import { describe, it, expect } from 'vitest';
import { FirebaseClient } from './firebase.js';

// 테스트 환경에는 Firebase 설정값이 없으므로 실제 연결 없이 Singleton 동작만 확인한다.
describe('Singleton: FirebaseClient', () => {
  it('getInstance()는 여러 번 불러도 같은 객체를 돌려준다', () => {
    const first = FirebaseClient.getInstance();
    const second = FirebaseClient.getInstance();
    expect(first === second).toBe(true);
  });
  it('밖에서 new로 만들 수 없다', () => {
    expect(() => new FirebaseClient()).toThrow('getInstance()');
  });
  it('인스턴스는 바꿀 수 없다 (freeze)', () => {
    const client = FirebaseClient.getInstance();
    expect(Object.isFrozen(client)).toBe(true);
  });
});
