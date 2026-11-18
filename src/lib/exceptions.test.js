import { describe, it, expect } from 'vitest';
import { TIMEOUT_CODE, withTimeout } from './withTimeout.js';
import { checkRecordDate } from './dates.js';
import { errorMessage } from '../errors.js';

describe('예외 처리: 저장 지연(timeout)', () => {
  it('제시간에 끝나면 결과를 그대로 돌려준다', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok');
  });
  it('끝나지 않는 요청은 timeout 오류로 멈춘다 (오프라인 Firestore 쓰기)', async () => {
    const never = new Promise(() => {});
    let error;
    try { await withTimeout(never, 20); } catch (e) { error = e; }
    expect(error.code).toBe(TIMEOUT_CODE);
    expect(errorMessage(error)).toMatch('저장이 지연');
  });
  it('요청이 실패하면 원래 오류를 그대로 전달한다', async () => {
    const fail = Promise.reject(Object.assign(new Error('x'), { code: 'permission-denied' }));
    let error;
    try { await withTimeout(fail, 50); } catch (e) { error = e; }
    expect(error.code).toBe('permission-denied');
  });
});

describe('예외 처리: 오류 안내 문구', () => {
  it('오프라인·서버 지연 오류를 한국어로 안내한다', () => {
    expect(errorMessage({ code: 'fitlog/offline' })).toMatch('인터넷 연결이 끊겨');
    expect(errorMessage({ code: 'deadline-exceeded' })).toMatch('응답이 늦습니다');
    expect(errorMessage({ code: 'unavailable' })).toMatch('서버에 연결할 수 없습니다');
  });
});

describe('예외 처리: 기록 날짜 검사', () => {
  const today = '2026-11-18';
  it('오늘과 지난 날짜는 통과', () => {
    expect(checkRecordDate('2026-11-18', today)).toBeNull();
    expect(checkRecordDate('2025-02-28', today)).toBeNull();
  });
  it('미래·잘못된 형식·없는 날짜는 거절', () => {
    expect(checkRecordDate('2026-11-19', today)).toMatch('미래');
    expect(checkRecordDate('2026/11/18', today)).toMatch('형식');
    expect(checkRecordDate('', today)).toMatch('형식');
    expect(checkRecordDate('2026-02-30', today)).toMatch('존재하지 않는');
  });
});
