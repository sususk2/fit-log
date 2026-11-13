// [패턴] Singleton — 처음 호출할 때 한 번만 만들고, 이후에는 같은 인스턴스를 돌려준다.
// Firebase 앱·Auth·Firestore 연결이 화면마다 새로 만들어지지 않도록 firebase.js에서 사용한다.
export function createSingleton(factory) {
  let instance;
  let created = false;
  return function getInstance() {
    if (!created) {
      instance = factory();
      created = true;
    }
    return instance;
  };
}
