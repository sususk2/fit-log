// [패턴] Observer — 값이 바뀌면 구독자(화면·훅)에게 알린다.
// 로그인 상태(authStore)와 메모리 저장소(memoryRepository)가 이 Subject로 변경을 알리고,
// Firestore 저장소는 onSnapshot(Firebase가 제공하는 Observer)을 같은 "구독 → 해제 함수" 모양으로 감싼다.
export class Subject {
  constructor() {
    this.observers = new Set();
  }

  /** @returns 구독 해제 함수 */
  subscribe(observer) {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  notify(value) {
    // 알리는 도중 구독 해제가 일어나도 안전하도록 복사본으로 돈다
    [...this.observers].forEach((observer) => observer(value));
  }

  get size() {
    return this.observers.size;
  }
}
