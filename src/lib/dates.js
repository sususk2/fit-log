// 날짜는 "YYYY-MM-DD" 문자열(사용자 기기 기준 날짜)로 다룬다.
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDay(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + days));
}

export function isDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** 기록할 날짜 검사: 형식이 맞고 오늘 이후가 아니어야 한다. 문제가 없으면 null. */
export function checkRecordDate(key, today = todayKey()) {
  if (!isDateKey(key)) return '날짜 형식이 올바르지 않습니다.';
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return '존재하지 않는 날짜입니다.';
  if (key > today) return '미래 날짜에는 기록할 수 없습니다.';
  return null;
}
