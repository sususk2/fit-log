// [패턴] Repository (메모리 구현) — Firestore 저장소와 같은 인터페이스를 메모리 Map으로 구현한다.
// 단위 테스트에서 Firebase 없이 화면 흐름·Command 되돌리기·저장 실패 처리를 확인하는 데 쓴다.
// 변경 알림은 Observer(Subject)로 보낸다.
import { Subject } from '../lib/Subject.js';

function storeError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export class MemoryRecordRepository {
  constructor({ now = () => Date.now() } = {}) {
    this.items = new Map();
    this.subject = new Subject();
    this.now = now;
    this.seq = 0;
    this.nextError = null;
  }

  /** 다음 쓰기 요청 한 번을 실패시킨다 (저장 실패 화면 검증용) */
  failNext(code = 'unavailable') {
    this.nextError = storeError(code);
  }

  checkFailure() {
    if (this.nextError) {
      const error = this.nextError;
      this.nextError = null;
      throw error;
    }
  }

  list() {
    return [...this.items.values()];
  }

  watchByDate(date, onData) {
    const emit = () => onData(this.list().filter((item) => item.date === date));
    emit();
    return this.subject.subscribe(emit);
  }

  watchRecentDates(onData) {
    const emit = () => onData(this.list().map((item) => item.date).sort().reverse());
    emit();
    return this.subject.subscribe(emit);
  }

  async add(fields) {
    this.checkFailure();
    this.seq += 1;
    const id = `mem-${this.seq}`;
    this.items.set(id, { ...fields, id, createdAtMs: this.now() });
    this.subject.notify();
    return id;
  }

  async put(id, fields) {
    this.checkFailure();
    // Firestore Rules와 같이: 이미 있는 고정 ID 문서를 새로 만들 수 없다
    if (this.items.has(id)) throw storeError('permission-denied');
    this.items.set(id, { ...fields, id, createdAtMs: this.now() });
    this.subject.notify();
    return id;
  }

  async update(id, patch) {
    this.checkFailure();
    const current = this.items.get(id);
    if (!current) throw storeError('not-found');
    this.items.set(id, { ...current, ...patch });
    this.subject.notify();
  }

  async remove(id) {
    this.checkFailure();
    this.items.delete(id);
    this.subject.notify();
  }

  async restore(item) {
    // eslint-disable-next-line no-unused-vars
    const { id, createdAt, createdAtMs, ...fields } = item;
    await this.put(id, fields);
  }
}

export class MemoryProfileRepository {
  constructor(initial = null) {
    this.value = initial;
    this.subject = new Subject();
  }

  watch(onData) {
    const emit = () => onData(this.value);
    emit();
    return this.subject.subscribe(emit);
  }

  async save(fields) {
    this.value = { ...(this.value ?? {}), ...fields };
    this.subject.notify();
  }
}

export function createMemoryRepositories(initialProfile = null) {
  return {
    profile: new MemoryProfileRepository(initialProfile),
    workouts: new MemoryRecordRepository(),
    meals: new MemoryRecordRepository(),
    plans: new MemoryRecordRepository(),
  };
}
