import { describe, it, expect } from 'vitest';
import { fromSnapshot, toAppUser, toMillis, toStoredFields } from './adapters.js';
import { createAuthStore } from './authStore.js';
import { createSingleton } from '../lib/singleton.js';
import { Subject } from '../lib/Subject.js';

describe('Adapter: Firebase 값 변환', () => {
  it('Timestamp · Date · 숫자 · 없음 을 밀리초로 바꾼다', () => {
    expect(toMillis({ toMillis: () => 1234 })).toBe(1234);
    expect(toMillis({ seconds: 2, nanoseconds: 5e8 })).toBe(2500);
    expect(toMillis(new Date(99))).toBe(99);
    expect(toMillis(7)).toBe(7);
    expect(toMillis(null)).toBeNull(); // serverTimestamp가 아직 안 채워진 경우
  });
  it('Firebase User를 앱 사용자 객체로 바꾼다', () => {
    expect(toAppUser({ uid: 'u1', email: 'a@b.com', displayName: null, providerData: [] }))
      .toEqual({ uid: 'u1', email: 'a@b.com', displayName: '' });
    expect(toAppUser(null)).toBeNull();
  });
  it('문서 스냅샷을 id·createdAtMs가 붙은 객체로 바꾸고, 저장할 때는 다시 뺀다', () => {
    const snap = { id: 'w1', data: () => ({ name: '걷기', createdAt: { toMillis: () => 10 } }) };
    const item = fromSnapshot(snap);
    expect(item).toMatchObject({ id: 'w1', name: '걷기', createdAtMs: 10 });
    expect(toStoredFields(item)).toEqual({ name: '걷기' });
  });
});

describe('Observer: Subject와 로그인 상태 저장소', () => {
  it('구독자 모두에게 알리고, 해제하면 더 알리지 않는다', () => {
    const subject = new Subject();
    const got = [];
    const stopA = subject.subscribe((v) => got.push(`A${v}`));
    subject.subscribe((v) => got.push(`B${v}`));
    subject.notify(1);
    stopA();
    subject.notify(2);
    expect(got).toEqual(['A1', 'B1', 'B2']);
  });

  it('Firebase 관찰은 한 번만 시작하고, 마지막 구독자가 떠나면 끝낸다', () => {
    let started = 0;
    let stopped = 0;
    let emit;
    const observe = (_auth, next) => { started += 1; emit = next; return () => { stopped += 1; }; };
    const store = createAuthStore({ auth: {}, observe });

    const a = [];
    const b = [];
    const stopA = store.subscribe((s) => a.push(s));
    const stopB = store.subscribe((s) => b.push(s));
    expect(started).toBe(1);
    expect(a[0]).toEqual({ user: null, ready: false, message: '' });

    emit({ uid: 'u1', email: 'a@b.com', displayName: '민준' });
    expect(a.at(-1).user).toEqual({ uid: 'u1', email: 'a@b.com', displayName: '민준' });
    expect(b.at(-1).ready).toBe(true);

    stopA();
    expect(stopped).toBe(0);
    stopB();
    expect(stopped).toBe(1);
  });

  it('관찰 오류는 한국어 안내로 바꿔 알린다', () => {
    let fail;
    const store = createAuthStore({ auth: {}, observe: (_a, _n, onError) => { fail = onError; return () => {}; } });
    let state;
    store.subscribe((s) => { state = s; });
    fail({ code: 'auth/network-request-failed' });
    expect(state).toEqual({ user: null, ready: true, message: '인터넷 연결을 확인해 주세요.' });
  });
});

describe('Singleton', () => {
  it('처음 한 번만 만들고 같은 인스턴스를 돌려준다', () => {
    let calls = 0;
    const get = createSingleton(() => { calls += 1; return { id: calls }; });
    expect(get()).toBe(get());
    expect(calls).toBe(1);
  });
});
