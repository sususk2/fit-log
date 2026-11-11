import { describe, it, expect } from 'vitest';
import { errorMessage, validateCredentials } from './errors.js';

describe('errorMessage', () => {
  it('알려진 오류 코드는 한국어 안내로 바꾼다', () => {
    expect(errorMessage({ code: 'auth/email-already-in-use' })).toBe('이미 가입된 이메일입니다. 로그인해 주세요.');
    expect(errorMessage({ code: 'permission-denied' })).toMatch('권한이 없는 요청');
  });
  it('모르는 오류는 코드와 함께 일반 안내를 보여 준다', () => {
    expect(errorMessage({ code: 'auth/unknown' })).toBe('요청을 처리하지 못했습니다. (auth/unknown)');
    expect(errorMessage(undefined)).toBe('요청을 처리하지 못했습니다. (unknown)');
  });
});

describe('validateCredentials', () => {
  const pw = 'abcdefghijkl'; // 12자
  const ok = { email: 'a@b.com', password: pw, passwordConfirm: pw };
  it('정상 입력은 통과한다', () => {
    expect(validateCredentials(ok, true)).toBeNull();
    expect(validateCredentials({ email: 'a@b.com', password: 'x' })).toBeNull(); // 로그인은 길이 검사 안 함
  });
  it('빈 이메일·잘못된 형식·빈 비밀번호를 막는다', () => {
    expect(validateCredentials({ ...ok, email: ' ' })).toBe('이메일을 입력해 주세요.');
    expect(validateCredentials({ ...ok, email: 'abc' })).toBe('이메일 형식을 확인해 주세요.');
    expect(validateCredentials({ ...ok, password: '' })).toBe('비밀번호를 입력해 주세요.');
  });
  it('회원가입은 12자 미만과 확인 불일치를 막는다', () => {
    expect(validateCredentials({ ...ok, password: 'abcdefghijk', passwordConfirm: 'abcdefghijk' }, true)).toBe('비밀번호는 12자 이상이어야 합니다.');
    expect(validateCredentials({ ...ok, passwordConfirm: 'abcdefghijkm' }, true)).toBe('비밀번호 확인이 일치하지 않습니다.');
  });
});
