// ─────────────────────────────────────────────────────────────
// [변경 전 버전] 모든 기능을 컴포넌트 하나에 넣은 구현
// 보고서의 "패턴 적용 전" 비교용으로 남겨 두는 커밋입니다.
// - 칼로리 계산·권장값·입력 검사가 if/else로 섞여 있음
// - Firestore 호출이 화면 코드 안에 직접 들어 있음
// - 계획 상태 변경 규칙이 버튼 조건문으로 흩어져 있음
// 다음 단계에서 Strategy·Factory·State·Repository 등으로 분리합니다.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, getDoc, limit, onSnapshot, orderBy,
  query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { errorMessage } from '../errors.js';

const GOAL_LABEL = { lose: '감량', maintain: '유지', gain: '증량' };
const MEAL_LABEL = { breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식' };
const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const CARDIO_MET = { 걷기: 3.5, 달리기: 9.8, 자전거: 7.5, 수영: 8.0, 줄넘기: 12.3, 기타: 6.0 };
const FOOD_PRESETS = [
  { food: '공기밥 1공기', kcal: 300, proteinG: 6 },
  { food: '닭가슴살 100g', kcal: 109, proteinG: 23 },
  { food: '삶은 달걀 1개', kcal: 77, proteinG: 6 },
  { food: '바나나 1개', kcal: 93, proteinG: 1 },
  { food: '고구마 150g', kcal: 192, proteinG: 2 },
  { food: '김밥 1줄', kcal: 485, proteinG: 13 },
  { food: '라면 1봉지', kcal: 500, proteinG: 10 },
  { food: '샐러드 1접시', kcal: 150, proteinG: 4 },
  { food: '우유 200ml', kcal: 130, proteinG: 6 },
  { food: '프로틴 쉐이크 1회', kcal: 120, proteinG: 24 },
];

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function shiftDay(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + days));
}
function createdMillis(item) {
  return item.createdAt?.toMillis ? item.createdAt.toMillis() : Number.MAX_SAFE_INTEGER;
}
function isInt(value, min, max) {
  const n = Number(value);
  return value !== '' && Number.isInteger(n) && n >= min && n <= max;
}
function isNum(value, min, max) {
  const n = Number(value);
  return value !== '' && Number.isFinite(n) && n >= min && n <= max;
}

const EMPTY_WORKOUT = { type: 'cardio', name: '걷기', durationMin: '', distanceKm: '', sets: '', reps: '', weightKg: '' };
const EMPTY_MEAL = { mealType: 'breakfast', food: '', kcal: '', proteinG: '' };

export default function HomePage({ user }) {
  const uid = user.uid;
  const [date, setDate] = useState(todayKey());
  const [tab, setTab] = useState('summary');

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ nickname: '', weightKg: '', goalType: 'maintain', calorieGoal: '', proteinGoal: '' });
  const [editingProfile, setEditingProfile] = useState(false);

  const [workouts, setWorkouts] = useState([]);
  const [meals, setMeals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [dayLoading, setDayLoading] = useState({ workouts: true, meals: true, plans: true });
  const [recentDates, setRecentDates] = useState({ workouts: [], meals: [] });

  const [workoutForm, setWorkoutForm] = useState(EMPTY_WORKOUT);
  const [mealForm, setMealForm] = useState(EMPTY_MEAL);
  const [editingMealId, setEditingMealId] = useState(null);
  const [mealEdit, setMealEdit] = useState({ food: '', kcal: '', proteinG: '' });
  const [planTitle, setPlanTitle] = useState('');
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planEdit, setPlanEdit] = useState('');

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);

  // ── 프로필 구독 ──
  useEffect(() => {
    setProfileLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'users', uid), (snap) => {
      const data = snap.exists() ? snap.data() : null;
      setProfile(data);
      setProfileLoading(false);
      if (!data || !data.weightKg) setEditingProfile(true);
    }, (err) => { setMessage(errorMessage(err)); setProfileLoading(false); });
    return unsubscribe;
  }, [uid]);

  // ── 선택한 날짜의 운동·식단·계획 구독 (where date == 만 사용, 정렬은 화면에서) ──
  useEffect(() => {
    setWorkouts([]); setMeals([]); setPlans([]);
    setDayLoading({ workouts: true, meals: true, plans: true });
    const subs = [];
    const watch = (name, setter) => {
      const q = query(collection(db, 'users', uid, name), where('date', '==', date));
      subs.push(onSnapshot(q, (snap) => {
        setter(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
        setDayLoading((prev) => ({ ...prev, [name]: false }));
      }, (err) => {
        setMessage(errorMessage(err));
        setDayLoading((prev) => ({ ...prev, [name]: false }));
      }));
    };
    watch('workouts', setWorkouts);
    watch('meals', setMeals);
    watch('plans', setPlans);
    return () => subs.forEach((unsubscribe) => unsubscribe());
  }, [uid, date]);

  // ── 연속 기록일 계산용 최근 날짜 (단일 필드 정렬이라 복합 색인 불필요) ──
  useEffect(() => {
    const subs = ['workouts', 'meals'].map((name) => {
      const q = query(collection(db, 'users', uid, name), orderBy('date', 'desc'), limit(200));
      return onSnapshot(q, (snap) => {
        setRecentDates((prev) => ({ ...prev, [name]: snap.docs.map((d) => d.data().date) }));
      }, () => { /* 연속 기록일은 보조 정보라 실패해도 화면을 막지 않는다 */ });
    });
    return () => subs.forEach((unsubscribe) => unsubscribe());
  }, [uid]);

  // 프로필을 읽어 오면 입력 칸을 채운다.
  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      nickname: profile.nickname ?? '',
      weightKg: profile.weightKg ?? '',
      goalType: profile.goalType ?? 'maintain',
      calorieGoal: profile.calorieGoal ?? '',
      proteinGoal: profile.proteinGoal ?? '',
    });
  }, [profile]);

  // 중복 요청 방지 + 오류 표시 (7주차 실습 run() 방식)
  async function run(action, doneText = '') {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true); setMessage(''); setNotice('');
    try {
      await action();
      if (doneText) setNotice(doneText);
      return true;
    } catch (err) {
      setMessage(errorMessage(err));
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function fail(text) { setNotice(''); setMessage(text); return Promise.resolve(false); }

  async function logout() {
    await run(() => signOut(auth));
  }

  // ── 프로필 ──
  function fillRecommended() {
    const weight = Number(profileForm.weightKg);
    if (!isNum(profileForm.weightKg, 30, 250)) return fail('체중을 30~250kg 사이로 먼저 입력해 주세요.');
    let calorie;
    let protein;
    if (profileForm.goalType === 'lose') {
      calorie = weight * 30 - 500;
      protein = weight * 1.8;
    } else if (profileForm.goalType === 'gain') {
      calorie = weight * 30 + 300;
      protein = weight * 2.0;
    } else {
      calorie = weight * 30;
      protein = weight * 1.4;
    }
    if (calorie < 1200) calorie = 1200;
    setProfileForm({ ...profileForm, calorieGoal: Math.round(calorie / 10) * 10, proteinGoal: Math.round(protein) });
    setMessage('');
    return Promise.resolve(true);
  }

  async function saveProfile(e) {
    e.preventDefault();
    const nickname = profileForm.nickname.trim();
    if (!nickname || nickname.length > 20) return fail('닉네임은 1~20자로 입력해 주세요.');
    if (!isNum(profileForm.weightKg, 30, 250)) return fail('체중은 30~250kg 사이로 입력해 주세요.');
    if (!['lose', 'maintain', 'gain'].includes(profileForm.goalType)) return fail('목표를 선택해 주세요.');
    if (!isInt(profileForm.calorieGoal, 1000, 5000)) return fail('목표 칼로리는 1000~5000 사이 정수로 입력해 주세요.');
    if (!isInt(profileForm.proteinGoal, 10, 400)) return fail('목표 단백질은 10~400g 사이 정수로 입력해 주세요.');
    const ref = doc(db, 'users', uid);
    const ok = await run(async () => {
      const data = {
        nickname,
        weightKg: Number(profileForm.weightKg),
        goalType: profileForm.goalType,
        calorieGoal: Number(profileForm.calorieGoal),
        proteinGoal: Number(profileForm.proteinGoal),
      };
      const snap = await getDoc(ref);
      if (snap.exists()) await updateDoc(ref, data);
      else await setDoc(ref, { ...data, createdAt: serverTimestamp() });
    }, '프로필을 저장했습니다.');
    if (ok) setEditingProfile(false);
  }

  // ── 운동 기록 ──
  async function addWorkout(e) {
    e.preventDefault();
    const f = workoutForm;
    const name = f.name.trim();
    const bodyWeight = Number(profile?.weightKg) || 70;
    if (!name || name.length > 30) return fail('운동 이름은 1~30자로 입력해 주세요.');
    let data;
    if (f.type === 'cardio') {
      if (!isInt(f.durationMin, 1, 600)) return fail('운동 시간은 1~600분 사이 정수로 입력해 주세요.');
      if (f.distanceKm !== '' && !isNum(f.distanceKm, 0, 200)) return fail('거리는 0~200km 사이로 입력해 주세요.');
      const met = CARDIO_MET[name] ?? CARDIO_MET['기타'];
      const kcal = Math.round(met * bodyWeight * (Number(f.durationMin) / 60));
      data = { type: 'cardio', name, durationMin: Number(f.durationMin), kcal };
      if (f.distanceKm !== '') data.distanceKm = Number(f.distanceKm);
    } else if (f.type === 'strength') {
      if (!isInt(f.sets, 1, 20)) return fail('세트는 1~20 사이 정수로 입력해 주세요.');
      if (!isInt(f.reps, 1, 100)) return fail('횟수는 1~100 사이 정수로 입력해 주세요.');
      if (!isNum(f.weightKg, 0, 500)) return fail('무게는 0~500kg 사이로 입력해 주세요.');
      // 세트당 휴식 포함 약 2분, 근력 운동 MET 5.0
      const minutes = Number(f.sets) * 2;
      const kcal = Math.round(5.0 * bodyWeight * (minutes / 60));
      data = { type: 'strength', name, sets: Number(f.sets), reps: Number(f.reps), weightKg: Number(f.weightKg), kcal };
    } else {
      return fail('운동 종류를 선택해 주세요.');
    }
    const ok = await run(() => addDoc(collection(db, 'users', uid, 'workouts'), {
      ...data, date, createdAt: serverTimestamp(),
    }), `${name} 기록을 저장했습니다. (${data.kcal}kcal)`);
    if (ok) setWorkoutForm({ ...EMPTY_WORKOUT, type: f.type, name: f.type === 'cardio' ? '걷기' : '' });
  }

  async function removeWorkout(w) {
    if (!window.confirm(`"${w.name}" 기록을 삭제할까요?`)) return;
    await run(() => deleteDoc(doc(db, 'users', uid, 'workouts', w.id)), '운동 기록을 삭제했습니다.');
  }

  // ── 식단 기록 ──
  function checkMeal(m) {
    const food = String(m.food).trim();
    if (!food) return '음식 이름을 입력해 주세요.';
    if (food.length > 40) return '음식 이름은 40자 이하로 입력해 주세요.';
    if (!isInt(m.kcal, 0, 5000)) return '칼로리는 0~5000 사이 정수로 입력해 주세요.';
    if (!isNum(m.proteinG, 0, 300)) return '단백질은 0~300g 사이로 입력해 주세요.';
    return null;
  }

  async function addMeal(e) {
    e.preventDefault();
    const invalid = checkMeal(mealForm);
    if (invalid) return fail(invalid);
    const data = {
      date,
      mealType: mealForm.mealType,
      food: mealForm.food.trim(),
      kcal: Number(mealForm.kcal),
      proteinG: Number(mealForm.proteinG),
      createdAt: serverTimestamp(),
    };
    let ok;
    if (mealForm.mealType === 'snack') {
      ok = await run(() => addDoc(collection(db, 'users', uid, 'meals'), data), '간식을 기록했습니다.');
    } else {
      // 아침·점심·저녁은 하루 하나: 문서 ID를 "날짜_끼니"로 고정
      const id = `${date}_${mealForm.mealType}`;
      if (meals.some((m) => m.id === id)) {
        return fail(`${MEAL_LABEL[mealForm.mealType]}은(는) 하루에 하나만 기록할 수 있습니다. 기존 기록을 수정해 주세요.`);
      }
      ok = await run(() => setDoc(doc(db, 'users', uid, 'meals', id), data), `${MEAL_LABEL[mealForm.mealType]}을(를) 기록했습니다.`);
    }
    if (ok) setMealForm({ ...EMPTY_MEAL, mealType: mealForm.mealType });
  }

  function startMealEdit(m) {
    setEditingMealId(m.id);
    setMealEdit({ food: m.food, kcal: String(m.kcal), proteinG: String(m.proteinG) });
  }

  async function saveMealEdit(e, m) {
    e.preventDefault();
    const invalid = checkMeal(mealEdit);
    if (invalid) return fail(invalid);
    const ok = await run(() => updateDoc(doc(db, 'users', uid, 'meals', m.id), {
      food: mealEdit.food.trim(), kcal: Number(mealEdit.kcal), proteinG: Number(mealEdit.proteinG),
    }), '식단을 수정했습니다.');
    if (ok) setEditingMealId(null);
  }

  async function removeMeal(m) {
    if (!window.confirm(`"${m.food}" 기록을 삭제할까요?`)) return;
    await run(() => deleteDoc(doc(db, 'users', uid, 'meals', m.id)), '식단 기록을 삭제했습니다.');
  }

  // ── 운동 계획 (예정 → 완료 → 보관) ──
  async function addPlan(e) {
    e.preventDefault();
    const title = planTitle.trim();
    if (!title || title.length > 40) return fail('계획은 1~40자로 입력해 주세요.');
    const ok = await run(() => addDoc(collection(db, 'users', uid, 'plans'), {
      date, title, status: 'planned', createdAt: serverTimestamp(),
    }), '계획을 추가했습니다.');
    if (ok) setPlanTitle('');
  }

  async function savePlanEdit(e, p) {
    e.preventDefault();
    if (p.status !== 'planned') return fail('완료한 계획은 수정할 수 없습니다.');
    const title = planEdit.trim();
    if (!title || title.length > 40) return fail('계획은 1~40자로 입력해 주세요.');
    const ok = await run(() => updateDoc(doc(db, 'users', uid, 'plans', p.id), { title }), '계획을 수정했습니다.');
    if (ok) setEditingPlanId(null);
  }

  async function changePlanStatus(p, next) {
    if (p.status === 'planned' && next !== 'done') return fail('예정된 계획은 완료로만 바꿀 수 있습니다.');
    if (p.status === 'done' && next !== 'archived') return fail('완료한 계획은 보관만 할 수 있습니다.');
    if (p.status === 'archived') return fail('보관한 계획은 바꿀 수 없습니다.');
    await run(() => updateDoc(doc(db, 'users', uid, 'plans', p.id), { status: next }),
      next === 'done' ? '계획을 완료했습니다.' : '계획을 보관했습니다.');
  }

  async function removePlan(p) {
    if (p.status === 'done') return fail('완료한 계획은 보관한 뒤 삭제할 수 있습니다.');
    if (!window.confirm(`"${p.title}" 계획을 삭제할까요?`)) return;
    await run(() => deleteDoc(doc(db, 'users', uid, 'plans', p.id)), '계획을 삭제했습니다.');
  }

  // ── 오늘의 요약 (렌더링할 때 계산) ──
  const sortedWorkouts = [...workouts].sort((a, b) => createdMillis(a) - createdMillis(b));
  const sortedMeals = [...meals].sort((a, b) =>
    MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType) || createdMillis(a) - createdMillis(b));
  const sortedPlans = [...plans].sort((a, b) => createdMillis(a) - createdMillis(b));
  const intake = meals.reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);
  const protein = meals.reduce((sum, m) => sum + (Number(m.proteinG) || 0), 0);
  const burned = workouts.reduce((sum, w) => sum + (Number(w.kcal) || 0), 0);
  const calorieGoal = Number(profile?.calorieGoal) || 0;
  const proteinGoal = Number(profile?.proteinGoal) || 0;
  const caloriePct = calorieGoal ? Math.round((intake / calorieGoal) * 100) : 0;
  const proteinPct = proteinGoal ? Math.round((protein / proteinGoal) * 100) : 0;
  const activePlans = plans.filter((p) => p.status !== 'archived');
  const donePlans = activePlans.filter((p) => p.status === 'done').length;

  const recorded = new Set([...recentDates.workouts, ...recentDates.meals]);
  let streak = 0;
  let cursor = todayKey();
  if (!recorded.has(cursor)) cursor = shiftDay(cursor, -1); // 오늘 아직 기록이 없어도 어제까지 이어졌으면 유지
  while (recorded.has(cursor)) { streak += 1; cursor = shiftDay(cursor, -1); }

  const dayLabel = date === todayKey() ? '오늘' : date;
  const displayName = profile?.nickname || user.displayName || user.email;

  if (profileLoading) {
    return <div className="center-screen"><p className="muted" role="status">프로필을 불러오는 중…</p></div>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />FitLog</div>
        <div className="topbar-right">
          <span className="muted">{displayName}님</span>
          <button className="btn-ghost" disabled={busy} onClick={() => setEditingProfile(true)}>프로필</button>
          <button className="btn-ghost" disabled={busy} onClick={logout}>로그아웃</button>
        </div>
      </header>

      <main className="content">
        {message && <p className="form-error" role="alert">{message}</p>}
        {notice && <p className="form-ok" role="status">{notice}</p>}

        {editingProfile ? (
          <section className="panel">
            <h2>프로필·목표 설정</h2>
            {!profile?.weightKg && <p className="muted">기록을 시작하기 전에 체중과 목표를 입력해 주세요. 소모 칼로리 계산에 사용됩니다.</p>}
            <form className="grid-form" onSubmit={saveProfile} noValidate>
              <label>닉네임
                <input value={profileForm.nickname} maxLength={20} disabled={busy}
                  onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })} />
              </label>
              <label>체중 (kg)
                <input type="number" inputMode="decimal" step="0.1" value={profileForm.weightKg} disabled={busy}
                  onChange={(e) => setProfileForm({ ...profileForm, weightKg: e.target.value })} />
              </label>
              <label>목표
                <select value={profileForm.goalType} disabled={busy}
                  onChange={(e) => setProfileForm({ ...profileForm, goalType: e.target.value })}>
                  {Object.entries(GOAL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>목표 칼로리 (kcal)
                <input type="number" inputMode="numeric" value={profileForm.calorieGoal} disabled={busy}
                  onChange={(e) => setProfileForm({ ...profileForm, calorieGoal: e.target.value })} />
              </label>
              <label>목표 단백질 (g)
                <input type="number" inputMode="numeric" value={profileForm.proteinGoal} disabled={busy}
                  onChange={(e) => setProfileForm({ ...profileForm, proteinGoal: e.target.value })} />
              </label>
              <div className="form-actions">
                <button type="button" className="btn-ghost" disabled={busy} onClick={fillRecommended}>권장값 채우기</button>
                {profile?.weightKg && (
                  <button type="button" className="btn-ghost" disabled={busy} onClick={() => setEditingProfile(false)}>취소</button>
                )}
                <button type="submit" className="btn-primary" disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
              </div>
            </form>
          </section>
        ) : (
          <>
            <div className="day-bar">
              <button className="btn-ghost" disabled={busy} onClick={() => setDate(shiftDay(date, -1))} aria-label="이전 날">◀</button>
              <input type="date" aria-label="날짜 선택" value={date} max={todayKey()}
                onChange={(e) => e.target.value && setDate(e.target.value)} />
              <button className="btn-ghost" disabled={busy || date >= todayKey()} onClick={() => setDate(shiftDay(date, 1))} aria-label="다음 날">▶</button>
              {date !== todayKey() && <button className="btn-ghost" onClick={() => setDate(todayKey())}>오늘로</button>}
            </div>

            <nav className="tabs" aria-label="기록 종류">
              {[['summary', '요약'], ['workouts', '운동'], ['plans', '계획'], ['meals', '식단']].map(([key, label]) => (
                <button key={key} className={tab === key ? 'tab active' : 'tab'} aria-pressed={tab === key}
                  onClick={() => setTab(key)}>{label}</button>
              ))}
            </nav>

            {tab === 'summary' && (
              <section className="panel">
                <h2>{dayLabel}의 요약</h2>
                <p className="muted">목표: {GOAL_LABEL[profile?.goalType] ?? '-'} · {calorieGoal}kcal · 단백질 {proteinGoal}g</p>
                <div className="stats">
                  <div className="stat"><span>섭취</span><strong>{intake}<small>kcal</small></strong>
                    <div className="bar"><div style={{ width: `${Math.min(caloriePct, 100)}%` }} /></div>
                    <small>목표의 {caloriePct}%</small></div>
                  <div className="stat"><span>단백질</span><strong>{protein}<small>g</small></strong>
                    <div className="bar"><div style={{ width: `${Math.min(proteinPct, 100)}%` }} /></div>
                    <small>목표의 {proteinPct}%</small></div>
                  <div className="stat"><span>소모</span><strong>{burned}<small>kcal</small></strong>
                    <small>운동 {workouts.length}건</small></div>
                  <div className="stat"><span>순섭취</span><strong>{intake - burned}<small>kcal</small></strong>
                    <small>섭취 − 소모</small></div>
                  <div className="stat"><span>계획 달성</span><strong>{donePlans}/{activePlans.length}</strong>
                    <small>완료/전체</small></div>
                  <div className="stat"><span>연속 기록</span><strong>{streak}<small>일</small></strong>
                    <small>운동 또는 식단</small></div>
                </div>
                {caloriePct > 110 && <p className="muted">목표 칼로리를 {intake - calorieGoal}kcal 넘었습니다.</p>}
              </section>
            )}

            {tab === 'workouts' && (
              <section className="panel">
                <h2>{dayLabel}의 운동</h2>
                <form className="grid-form" onSubmit={addWorkout} noValidate>
                  <label>종류
                    <select value={workoutForm.type} disabled={busy}
                      onChange={(e) => setWorkoutForm({ ...EMPTY_WORKOUT, type: e.target.value, name: e.target.value === 'cardio' ? '걷기' : '' })}>
                      <option value="cardio">유산소</option>
                      <option value="strength">근력</option>
                    </select>
                  </label>
                  {workoutForm.type === 'cardio' ? (
                    <>
                      <label>운동
                        <select value={workoutForm.name} disabled={busy}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, name: e.target.value })}>
                          {Object.keys(CARDIO_MET).map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </label>
                      <label>시간 (분)
                        <input type="number" inputMode="numeric" value={workoutForm.durationMin} disabled={busy}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, durationMin: e.target.value })} />
                      </label>
                      <label>거리 (km, 선택)
                        <input type="number" inputMode="decimal" step="0.1" value={workoutForm.distanceKm} disabled={busy}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, distanceKm: e.target.value })} />
                      </label>
                    </>
                  ) : (
                    <>
                      <label>운동 이름
                        <input value={workoutForm.name} maxLength={30} placeholder="예: 벤치프레스" disabled={busy}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, name: e.target.value })} />
                      </label>
                      <label>세트
                        <input type="number" inputMode="numeric" value={workoutForm.sets} disabled={busy}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, sets: e.target.value })} />
                      </label>
                      <label>횟수
                        <input type="number" inputMode="numeric" value={workoutForm.reps} disabled={busy}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, reps: e.target.value })} />
                      </label>
                      <label>무게 (kg)
                        <input type="number" inputMode="decimal" step="0.5" value={workoutForm.weightKg} disabled={busy}
                          onChange={(e) => setWorkoutForm({ ...workoutForm, weightKg: e.target.value })} />
                      </label>
                    </>
                  )}
                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={busy}>{busy ? '저장 중…' : '기록 추가'}</button>
                  </div>
                </form>
                {dayLoading.workouts ? <p className="empty" role="status">운동 기록을 불러오는 중…</p>
                  : !sortedWorkouts.length && <p className="empty">아직 운동 기록이 없습니다. 첫 운동을 기록해 보세요.</p>}
                <ul className="item-list">
                  {sortedWorkouts.map((w) => (
                    <li key={w.id}>
                      <div>
                        <span className={`badge ${w.type}`}>{w.type === 'cardio' ? '유산소' : '근력'}</span>
                        <strong>{w.name}</strong>
                        <span className="muted">
                          {w.type === 'cardio'
                            ? ` ${w.durationMin}분${w.distanceKm != null ? ` · ${w.distanceKm}km` : ''}`
                            : ` ${w.sets}세트 × ${w.reps}회 · ${w.weightKg}kg`}
                        </span>
                      </div>
                      <div className="item-actions">
                        <span className="kcal">{w.kcal}kcal</span>
                        <button className="btn-small danger" disabled={busy} onClick={() => removeWorkout(w)} aria-label={`${w.name} 삭제`}>삭제</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {tab === 'plans' && (
              <section className="panel">
                <h2>{dayLabel}의 운동 계획</h2>
                <form className="add-form" onSubmit={addPlan} noValidate>
                  <label className="sr-only" htmlFor="new-plan">새 계획</label>
                  <input id="new-plan" value={planTitle} maxLength={40} placeholder="예: 하체 운동 40분" disabled={busy}
                    onChange={(e) => setPlanTitle(e.target.value)} />
                  <button className="btn-primary" disabled={busy || !planTitle.trim()}>추가</button>
                </form>
                {dayLoading.plans ? <p className="empty" role="status">계획을 불러오는 중…</p>
                  : !sortedPlans.length && <p className="empty">아직 계획이 없습니다.</p>}
                {['planned', 'done', 'archived'].map((status) => {
                  const list = sortedPlans.filter((p) => p.status === status);
                  if (!list.length) return null;
                  return (
                    <div key={status}>
                      <h3>{status === 'planned' ? '예정' : status === 'done' ? '완료' : '보관'} ({list.length})</h3>
                      <ul className="item-list">
                        {list.map((p) => (
                          <li key={p.id} className={p.status !== 'planned' ? 'dim' : ''}>
                            {editingPlanId === p.id ? (
                              <form className="add-form wide" onSubmit={(e) => savePlanEdit(e, p)}>
                                <input value={planEdit} maxLength={40} aria-label="계획 수정" disabled={busy}
                                  onChange={(e) => setPlanEdit(e.target.value)} />
                                <button className="btn-primary" disabled={busy}>저장</button>
                                <button type="button" className="btn-ghost" disabled={busy} onClick={() => setEditingPlanId(null)}>취소</button>
                              </form>
                            ) : (
                              <>
                                <span className={p.status === 'done' ? 'done-text' : ''}>{p.title}</span>
                                <div className="item-actions">
                                  {p.status === 'planned' && (
                                    <>
                                      <button className="btn-small" disabled={busy} onClick={() => changePlanStatus(p, 'done')}>완료</button>
                                      <button className="btn-small" disabled={busy}
                                        onClick={() => { setEditingPlanId(p.id); setPlanEdit(p.title); }}>수정</button>
                                      <button className="btn-small danger" disabled={busy} onClick={() => removePlan(p)}>삭제</button>
                                    </>
                                  )}
                                  {p.status === 'done' && (
                                    <button className="btn-small" disabled={busy} onClick={() => changePlanStatus(p, 'archived')}>보관</button>
                                  )}
                                  {p.status === 'archived' && (
                                    <button className="btn-small danger" disabled={busy} onClick={() => removePlan(p)}>삭제</button>
                                  )}
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                <p className="hint">완료한 계획은 수정할 수 없고 보관만 할 수 있습니다.</p>
              </section>
            )}

            {tab === 'meals' && (
              <section className="panel">
                <h2>{dayLabel}의 식단</h2>
                <div className="presets" aria-label="자주 먹는 음식">
                  {FOOD_PRESETS.map((p) => (
                    <button key={p.food} type="button" className="chip" disabled={busy}
                      onClick={() => setMealForm({ ...mealForm, food: p.food, kcal: String(p.kcal), proteinG: String(p.proteinG) })}>
                      {p.food}
                    </button>
                  ))}
                </div>
                <form className="grid-form" onSubmit={addMeal} noValidate>
                  <label>끼니
                    <select value={mealForm.mealType} disabled={busy}
                      onChange={(e) => setMealForm({ ...mealForm, mealType: e.target.value })}>
                      {MEAL_ORDER.map((t) => <option key={t} value={t}>{MEAL_LABEL[t]}</option>)}
                    </select>
                  </label>
                  <label>음식
                    <input value={mealForm.food} maxLength={40} disabled={busy}
                      onChange={(e) => setMealForm({ ...mealForm, food: e.target.value })} />
                  </label>
                  <label>칼로리 (kcal)
                    <input type="number" inputMode="numeric" value={mealForm.kcal} disabled={busy}
                      onChange={(e) => setMealForm({ ...mealForm, kcal: e.target.value })} />
                  </label>
                  <label>단백질 (g)
                    <input type="number" inputMode="decimal" step="0.1" value={mealForm.proteinG} disabled={busy}
                      onChange={(e) => setMealForm({ ...mealForm, proteinG: e.target.value })} />
                  </label>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={busy}>{busy ? '저장 중…' : '기록 추가'}</button>
                  </div>
                </form>
                {dayLoading.meals ? <p className="empty" role="status">식단을 불러오는 중…</p>
                  : !sortedMeals.length && <p className="empty">아직 식단 기록이 없습니다. 위의 자주 먹는 음식을 눌러 빠르게 입력해 보세요.</p>}
                <ul className="item-list">
                  {sortedMeals.map((m) => (
                    <li key={m.id}>
                      {editingMealId === m.id ? (
                        <form className="add-form wide" onSubmit={(e) => saveMealEdit(e, m)} noValidate>
                          <input value={mealEdit.food} maxLength={40} aria-label="음식 수정" disabled={busy}
                            onChange={(e) => setMealEdit({ ...mealEdit, food: e.target.value })} />
                          <input type="number" className="narrow" value={mealEdit.kcal} aria-label="칼로리 수정" disabled={busy}
                            onChange={(e) => setMealEdit({ ...mealEdit, kcal: e.target.value })} />
                          <input type="number" className="narrow" value={mealEdit.proteinG} aria-label="단백질 수정" disabled={busy}
                            onChange={(e) => setMealEdit({ ...mealEdit, proteinG: e.target.value })} />
                          <button className="btn-primary" disabled={busy}>저장</button>
                          <button type="button" className="btn-ghost" disabled={busy} onClick={() => setEditingMealId(null)}>취소</button>
                        </form>
                      ) : (
                        <>
                          <div>
                            <span className={`badge ${m.mealType}`}>{MEAL_LABEL[m.mealType]}</span>
                            <strong>{m.food}</strong>
                            <span className="muted"> 단백질 {m.proteinG}g</span>
                          </div>
                          <div className="item-actions">
                            <span className="kcal">{m.kcal}kcal</span>
                            <button className="btn-small" disabled={busy} onClick={() => startMealEdit(m)} aria-label={`${m.food} 수정`}>수정</button>
                            <button className="btn-small danger" disabled={busy} onClick={() => removeMeal(m)} aria-label={`${m.food} 삭제`}>삭제</button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="hint">아침·점심·저녁은 하루 하나씩, 간식은 여러 개 기록할 수 있습니다.</p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
