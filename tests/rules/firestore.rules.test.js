// Firestore Security Rules 자동 테스트 (Firestore 에뮬레이터에서 실행)
// 실행: npm run test:rules  (firebase-tools가 에뮬레이터를 켜고 이 테스트를 돌린 뒤 끈다)
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';

const DATE = '2026-11-13';
let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-fitlog',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const dbOf = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());
const alice = () => dbOf('alice');
const bob = () => dbOf('bob');
const guest = () => dbOf(null);

/** 규칙을 끄고 미리 데이터를 넣는다 */
async function seed(path, data) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), { ...data, createdAt: new Date() });
  });
}

const workout = () => ({ date: DATE, type: 'cardio', name: '걷기', durationMin: 30, kcal: 105, createdAt: serverTimestamp() });
const meal = (mealType = 'lunch') => ({ date: DATE, mealType, food: '김밥 1줄', kcal: 485, proteinG: 13, createdAt: serverTimestamp() });
const plan = () => ({ date: DATE, title: '하체 운동', status: 'planned', createdAt: serverTimestamp() });

describe('로그인·주인 확인', () => {
  it('비로그인 사용자는 읽기·쓰기 모두 거절', async () => {
    await seed('users/alice', { nickname: 'A' });
    await assertFails(getDoc(doc(guest(), 'users/alice')));
    await assertFails(addDoc(collection(guest(), 'users/alice/workouts'), workout()));
  });
  it('다른 사람(bob)은 alice의 데이터를 읽거나 쓸 수 없다', async () => {
    await seed('users/alice', { nickname: 'A' });
    await seed('users/alice/workouts/w1', { date: DATE, type: 'cardio', name: '걷기', durationMin: 30, kcal: 105 });
    await assertFails(getDoc(doc(bob(), 'users/alice')));
    await assertFails(getDoc(doc(bob(), 'users/alice/workouts/w1')));
    await assertFails(deleteDoc(doc(bob(), 'users/alice/workouts/w1')));
    await assertFails(addDoc(collection(bob(), 'users/alice/meals'), meal('snack')));
  });
  it('본인은 자기 데이터를 읽을 수 있다', async () => {
    await seed('users/alice', { nickname: 'A' });
    await assertSucceeds(getDoc(doc(alice(), 'users/alice')));
  });
  it('규칙에 없는 경로는 거절', async () => {
    await assertFails(setDoc(doc(alice(), 'admin/config'), { open: true }));
  });
});

describe('프로필 users/{uid}', () => {
  it('회원가입 때 닉네임만으로 만들 수 있다', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice'), { nickname: '민준', createdAt: serverTimestamp() }));
  });
  it('목표를 저장할 수 있고, 범위를 벗어나거나 모르는 필드는 거절', async () => {
    await seed('users/alice', { nickname: '민준' });
    const ref = doc(alice(), 'users/alice');
    await assertSucceeds(updateDoc(ref, { weightKg: 70.5, goalType: 'lose', calorieGoal: 1800, proteinGoal: 120 }));
    await assertFails(updateDoc(ref, { calorieGoal: 99999 }));
    await assertFails(updateDoc(ref, { goalType: 'bulk' }));
    await assertFails(updateDoc(ref, { isAdmin: true }));
    await assertFails(updateDoc(ref, { createdAt: serverTimestamp() }));
  });
  it('프로필 삭제는 거절', async () => {
    await seed('users/alice', { nickname: '민준' });
    await assertFails(deleteDoc(doc(alice(), 'users/alice')));
  });
});

describe('운동 기록', () => {
  it('유산소·근력 기록을 만들 수 있다', async () => {
    const col = collection(alice(), 'users/alice/workouts');
    await assertSucceeds(addDoc(col, { ...workout(), distanceKm: 2.5 }));
    await assertSucceeds(addDoc(col, {
      date: DATE, type: 'strength', name: '스쿼트', sets: 5, reps: 10, weightKg: 60, kcal: 58, createdAt: serverTimestamp(),
    }));
  });
  it('잘못된 값·종류와 맞지 않는 필드·클라이언트 시각은 거절', async () => {
    const col = collection(alice(), 'users/alice/workouts');
    await assertFails(addDoc(col, { ...workout(), durationMin: 0 }));
    await assertFails(addDoc(col, { ...workout(), date: '11/13' }));
    await assertFails(addDoc(col, { ...workout(), sets: 3 }));            // 유산소에 세트 필드
    await assertFails(addDoc(col, { ...workout(), type: 'yoga' }));
    await assertFails(addDoc(col, { ...workout(), createdAt: new Date(0) }));
  });
  it('운동 기록은 수정할 수 없고 삭제만 된다', async () => {
    await seed('users/alice/workouts/w1', { date: DATE, type: 'cardio', name: '걷기', durationMin: 30, kcal: 105 });
    const ref = doc(alice(), 'users/alice/workouts/w1');
    await assertFails(updateDoc(ref, { kcal: 9999 }));
    await assertSucceeds(deleteDoc(ref));
  });
});

describe('식단 기록 (끼니 규칙)', () => {
  it('아침·점심·저녁은 "날짜_끼니" ID로만 만들 수 있다', async () => {
    await assertSucceeds(setDoc(doc(alice(), `users/alice/meals/${DATE}_lunch`), meal('lunch')));
    await assertFails(setDoc(doc(alice(), `users/alice/meals/${DATE}_dinner`), meal('lunch')));
    await assertFails(addDoc(collection(alice(), 'users/alice/meals'), meal('lunch')));
  });
  it('같은 날 같은 끼니를 다시 만들면(덮어쓰기) 거절', async () => {
    const ref = doc(alice(), `users/alice/meals/${DATE}_lunch`);
    await assertSucceeds(setDoc(ref, meal('lunch')));
    await assertFails(setDoc(ref, { ...meal('lunch'), food: '라면 1봉지' }));
  });
  it('간식은 자동 ID로 여러 개 만들 수 있고, 끼니 ID 모양은 쓸 수 없다', async () => {
    const col = collection(alice(), 'users/alice/meals');
    await assertSucceeds(addDoc(col, meal('snack')));
    await assertSucceeds(addDoc(col, meal('snack')));
    await assertFails(setDoc(doc(alice(), `users/alice/meals/${DATE}_breakfast`), meal('snack')));
  });
  it('음식·칼로리·단백질만 수정할 수 있다', async () => {
    await seed(`users/alice/meals/${DATE}_lunch`, { date: DATE, mealType: 'lunch', food: '김밥', kcal: 485, proteinG: 13 });
    const ref = doc(alice(), `users/alice/meals/${DATE}_lunch`);
    await assertSucceeds(updateDoc(ref, { food: '김밥 2줄', kcal: 970, proteinG: 26 }));
    await assertFails(updateDoc(ref, { mealType: 'dinner' }));
    await assertFails(updateDoc(ref, { date: '2026-11-14' }));
    await assertFails(updateDoc(ref, { kcal: -1 }));
  });
});

describe('운동 계획 (상태 규칙)', () => {
  const path = 'users/alice/plans/p1';
  const seedPlan = (status) => seed(path, { date: DATE, title: '하체 운동', status });

  it('새 계획은 "예정" 상태로만 만들 수 있다', async () => {
    const col = collection(alice(), 'users/alice/plans');
    await assertSucceeds(addDoc(col, plan()));
    await assertFails(addDoc(col, { ...plan(), status: 'done' }));
  });
  it('예정: 제목 수정·완료 처리 가능, 바로 보관은 거절', async () => {
    await seedPlan('planned');
    const ref = doc(alice(), path);
    await assertSucceeds(updateDoc(ref, { title: '상체 운동' }));
    await assertFails(updateDoc(ref, { status: 'archived' }));
    await assertSucceeds(updateDoc(ref, { status: 'done' }));
  });
  it('완료: 제목 수정·되돌리기·삭제는 거절, 보관만 가능', async () => {
    await seedPlan('done');
    const ref = doc(alice(), path);
    await assertFails(updateDoc(ref, { title: '바꾼 제목' }));
    await assertFails(updateDoc(ref, { status: 'planned' }));
    await assertFails(deleteDoc(ref));
    await assertSucceeds(updateDoc(ref, { status: 'archived' }));
  });
  it('보관: 어떤 수정도 거절, 삭제는 가능', async () => {
    await seedPlan('archived');
    const ref = doc(alice(), path);
    await assertFails(updateDoc(ref, { status: 'planned' }));
    await assertFails(updateDoc(ref, { title: 'x' }));
    await assertSucceeds(deleteDoc(ref));
  });
});
