// [패턴] Adapter — Firebase가 주는 모양(User 객체, DocumentSnapshot, Timestamp)을
// 앱이 쓰는 단순한 객체 모양으로 바꾼다. 화면·도메인 코드는 Firebase 타입을 몰라도 된다.

/** Firestore Timestamp · Date · 숫자 → 밀리초 숫자 (없으면 null) */
export function toMillis(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1e6);
  return null;
}

/** Firebase Auth User → 앱 사용자 { uid, email, displayName } */
export function toAppUser(firebaseUser) {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    displayName: firebaseUser.displayName ?? '',
  };
}

/** DocumentSnapshot → { ...필드, id, createdAtMs } */
export function fromSnapshot(snapshot) {
  const data = snapshot.data();
  return { ...data, id: snapshot.id, createdAtMs: toMillis(data.createdAt) };
}

/** 앱 객체 → 저장할 필드만 (id·createdAt·createdAtMs 제거) */
export function toStoredFields(item) {
  // eslint-disable-next-line no-unused-vars
  const { id, createdAt, createdAtMs, ...fields } = item;
  return fields;
}
