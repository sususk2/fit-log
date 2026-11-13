// 입력 값 검사에 쓰는 작은 도구 함수 (화면 입력은 문자열로 들어온다)
export function isInt(value, min, max) {
  if (value === '' || value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max;
}

export function isNum(value, min, max) {
  if (value === '' || value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
}

export function cleanText(value) {
  return String(value ?? '').trim();
}
