// Firebase 오류 코드를 사용자에게 보여 줄 한국어 문장으로 바꾼다.
// (7주차 실습 코드의 errors.js를 바탕으로 회원가입·Firestore 항목을 보완)
const MESSAGES = {
  'auth/invalid-email': '이메일 형식을 확인해 주세요.',
  'auth/missing-password': '비밀번호를 입력해 주세요.',
  'auth/invalid-credential': '이메일 또는 비밀번호를 확인해 주세요.',
  'auth/wrong-password': '이메일 또는 비밀번호를 확인해 주세요.',
  'auth/user-not-found': '이메일 또는 비밀번호를 확인해 주세요.',
  'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인해 주세요.',
  'auth/weak-password': '비밀번호가 너무 약합니다. 12자 이상으로 입력해 주세요.',
  'auth/password-does-not-meet-requirements': '비밀번호 정책을 충족하지 않습니다.',
  'auth/operation-not-allowed': 'Firebase에서 이메일/비밀번호 로그인을 켜 주세요.',
  'auth/too-many-requests': '요청이 많습니다. 잠시 뒤 다시 시도해 주세요.',
  'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
  'permission-denied': '권한이 없는 요청입니다. 로그인 상태를 확인해 주세요.',
  unavailable: '서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.',
};

export function errorMessage(error) {
  return MESSAGES[error?.code] || `요청을 처리하지 못했습니다. (${error?.code || 'unknown'})`;
}

export const PASSWORD_MIN = 12;

// 서버에 보내기 전에 화면에서 먼저 검사한다. 문제가 없으면 null.
export function validateCredentials({ email, password, passwordConfirm }, isSignup = false) {
  if (!email?.trim()) return '이메일을 입력해 주세요.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return '이메일 형식을 확인해 주세요.';
  if (!password) return '비밀번호를 입력해 주세요.';
  if (isSignup && password.length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.`;
  if (isSignup && password !== passwordConfirm) return '비밀번호 확인이 일치하지 않습니다.';
  return null;
}
