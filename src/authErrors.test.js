import { describe, it, expect } from 'vitest';
import { authErrorMessage, validateCredentials } from './authErrors.js';

describe('authErrorMessage', () => {
  it('알려진 오류 코드는 한국어 안내로 바꾼다', () => {
    expect(authErrorMessage({ code: 'auth/email-already-in-use' })).toBe('이미 가입된 이메일입니다.');
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe('이메일 또는 비밀번호가 맞지 않습니다.');
  });
  it('모르는 오류는 일반 안내를 보여 준다', () => {
    expect(authErrorMessage({ code: 'auth/unknown' })).toMatch('요청을 처리하지 못했습니다');
    expect(authErrorMessage(undefined)).toMatch('요청을 처리하지 못했습니다');
  });
});

describe('validateCredentials', () => {
  const ok = { email: 'a@b.com', password: '123456', passwordConfirm: '123456' };
  it('정상 입력은 통과한다', () => {
    expect(validateCredentials(ok, true)).toBeNull();
    expect(validateCredentials({ email: 'a@b.com', password: 'x' })).toBeNull();
  });
  it('빈 이메일·잘못된 형식·빈 비밀번호를 막는다', () => {
    expect(validateCredentials({ ...ok, email: ' ' })).toBe('이메일을 입력해 주세요.');
    expect(validateCredentials({ ...ok, email: 'abc' })).toBe('이메일 형식이 올바르지 않습니다.');
    expect(validateCredentials({ ...ok, password: '' })).toBe('비밀번호를 입력해 주세요.');
  });
  it('회원가입은 6자 미만과 확인 불일치를 막는다', () => {
    expect(validateCredentials({ ...ok, password: '123', passwordConfirm: '123' }, true)).toBe('비밀번호는 6자 이상이어야 합니다.');
    expect(validateCredentials({ ...ok, passwordConfirm: '654321' }, true)).toBe('비밀번호 확인이 일치하지 않습니다.');
  });
});
