// [패턴] Repository — 저장 위치(Firestore)를 숨기고 "기록 저장소" 인터페이스만 화면에 보여 준다.
// 변경 전: HomePage가 collection/doc/addDoc/onSnapshot을 직접 호출하고 경로 문자열을 곳곳에서 조립했다.
// 변경 후: 화면은 repos.meals.watchByDate(...) / repos.meals.add(...)만 안다.
//          같은 인터페이스의 메모리 구현(memoryRepository.js)으로 바꿔 끼워 테스트한다.
//
// 기록 저장소 인터페이스
//   watchByDate(date, onData, onError) → 해제 함수   // where('date','==',date)만 사용 → 복합 색인 불필요
//   watchRecentDates(onData, onError) → 해제 함수    // 연속 기록일 계산용 최근 날짜 목록
//   add(fields) → id          // 자동 ID
//   put(id, fields) → id      // 정해진 ID로 새로 만들기 (끼니 문서)
//   update(id, patch)
//   remove(id)
//   restore(item)             // 삭제 실행 취소: 같은 ID로 다시 만든다
import {
  collection, deleteDoc, doc, getDoc, limit, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc, where, addDoc,
} from 'firebase/firestore';
import { fromSnapshot, toStoredFields } from './adapters.js';

export class FirestoreRecordRepository {
  constructor(db, uid, name) {
    this.db = db;
    this.uid = uid;
    this.name = name;
  }

  collectionRef() {
    return collection(this.db, 'users', this.uid, this.name);
  }

  docRef(id) {
    return doc(this.db, 'users', this.uid, this.name, id);
  }

  watchByDate(date, onData, onError) {
    const q = query(this.collectionRef(), where('date', '==', date));
    return onSnapshot(q, (snap) => onData(snap.docs.map(fromSnapshot)), onError);
  }

  watchRecentDates(onData, onError, max = 200) {
    const q = query(this.collectionRef(), orderBy('date', 'desc'), limit(max));
    return onSnapshot(q, (snap) => onData(snap.docs.map((d) => d.data().date)), onError);
  }

  async add(fields) {
    const ref = await addDoc(this.collectionRef(), { ...fields, createdAt: serverTimestamp() });
    return ref.id;
  }

  async put(id, fields) {
    // 이미 있는 문서에 setDoc을 하면 Rules에서 update로 판단되고, createdAt 변경이라 거절된다.
    await setDoc(this.docRef(id), { ...fields, createdAt: serverTimestamp() });
    return id;
  }

  async update(id, patch) {
    await updateDoc(this.docRef(id), patch);
  }

  async remove(id) {
    await deleteDoc(this.docRef(id));
  }

  async restore(item) {
    await this.put(item.id, toStoredFields(item));
  }
}

export class FirestoreProfileRepository {
  constructor(db, uid) {
    this.ref = doc(db, 'users', uid);
  }

  watch(onData, onError) {
    return onSnapshot(this.ref, (snap) => onData(snap.exists() ? fromSnapshot(snap) : null), onError);
  }

  async save(fields) {
    const snap = await getDoc(this.ref);
    if (snap.exists()) await updateDoc(this.ref, fields);
    else await setDoc(this.ref, { ...fields, createdAt: serverTimestamp() });
  }
}

export function createFirestoreRepositories(db, uid) {
  return {
    profile: new FirestoreProfileRepository(db, uid),
    workouts: new FirestoreRecordRepository(db, uid, 'workouts'),
    meals: new FirestoreRecordRepository(db, uid, 'meals'),
    plans: new FirestoreRecordRepository(db, uid, 'plans'),
  };
}
