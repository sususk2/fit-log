// 요청이 너무 오래 걸리면 기다리기를 멈추고 timeout 오류를 낸다.
// Firestore는 인터넷이 끊기면 쓰기 요청을 끝내지 않고 연결될 때까지 붙잡아 두기 때문에,
// 기다리기만 하면 "저장 중…" 버튼이 풀리지 않는다.
export const TIMEOUT_CODE = 'fitlog/timeout';

export function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('요청 시간이 초과되었습니다.');
      error.code = TIMEOUT_CODE;
      reject(error);
    }, ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}
