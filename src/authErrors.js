// Firebase Authentication 오류 코드를 사용자에게 보여 줄 한국어 문장으로 바꾼다.
const MESSAGES = {
  'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
  'auth/missing-password': '비밀번호를 입력해 주세요.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않습니다.',
  'auth/wrong-password': '이메일 또는 비밀번호가 맞지 않습니다.',
  'auth/user-not-found': '이메일 또는 비밀번호가 맞지 않습니다.',
  'auth/email-already-in-use': '이미 가입된 이메일입니다.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/too-many-requests': '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'auth/network-request-failed': '네트워크 연결을 확인해 주세요.',
};

export function authErrorMessage(error) {
  const code = error?.code;
  return MESSAGES[code] || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

// 서버에 보내기 전에 화면에서 먼저 검사한다. 문제가 없으면 null.
export function validateCredentials({ email, password, passwordConfirm }, isSignup = false) {
  if (!email?.trim()) return '이메일을 입력해 주세요.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return '이메일 형식이 올바르지 않습니다.';
  if (!password) return '비밀번호를 입력해 주세요.';
  if (isSignup && password.length < 6) return '비밀번호는 6자 이상이어야 합니다.';
  if (isSignup && password !== passwordConfirm) return '비밀번호 확인이 일치하지 않습니다.';
  return null;
}
