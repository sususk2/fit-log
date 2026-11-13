// [변경 후] 화면 조립만 담당한다.
// - 계산·규칙: src/domain (Strategy·Factory·State·Chain of Responsibility·Facade·Command)
// - 저장: src/data (Repository·Adapter·Observer), Firebase 연결은 Singleton
// - 변경 전 단일 컴포넌트 버전은 커밋 "feat: 프로필·운동·계획·식단·요약 기능 (변경 전 …)"에 남아 있다.
import { useMemo, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase.js';
import { createFirestoreRepositories } from '../data/firestoreRepository.js';
import { useDayRecords, useProfile, useRecentDates } from '../hooks/useRecords.js';
import { useActionRunner } from '../hooks/useActionRunner.js';
import { createWorkout } from '../domain/workoutFactory.js';
import { validateMeal } from '../domain/mealValidation.js';
import { MEAL_LABEL, mealDocId } from '../domain/meals.js';
import { planStateOf, validatePlanTitle } from '../domain/planState.js';
import { summaryService } from '../domain/DailySummaryService.js';
import { CommandHistory, DeleteRecordCommand } from '../domain/commands.js';
import { isProfileComplete } from '../domain/profile.js';
import { shiftDay, todayKey } from '../lib/dates.js';
import ProfilePanel from '../components/ProfilePanel.jsx';
import SummaryPanel from '../components/SummaryPanel.jsx';
import WorkoutPanel from '../components/WorkoutPanel.jsx';
import PlanPanel from '../components/PlanPanel.jsx';
import MealPanel from '../components/MealPanel.jsx';

const TABS = [['summary', '요약'], ['workouts', '운동'], ['plans', '계획'], ['meals', '식단']];

export default function HomePage({ user, repositories }) {
  // Repository: 기본은 Firestore, 테스트에서는 메모리 저장소를 넘길 수 있다
  const repos = useMemo(() => repositories ?? createFirestoreRepositories(db, user.uid), [repositories, user.uid]);
  const recentSources = useMemo(() => [repos.workouts, repos.meals], [repos]);

  const [date, setDate] = useState(todayKey());
  const [tab, setTab] = useState('summary');
  const [editingProfile, setEditingProfile] = useState(false);
  const [undoLabel, setUndoLabel] = useState('');
  const history = useRef(new CommandHistory());

  const { busy, message, notice, run, fail, clear } = useActionRunner();
  const profileState = useProfile(repos.profile);
  const workouts = useDayRecords(repos.workouts, date);
  const meals = useDayRecords(repos.meals, date);
  const plans = useDayRecords(repos.plans, date);
  const recordedDates = useRecentDates(recentSources);

  const profile = profileState.profile;
  const needsProfile = !profileState.loading && !isProfileComplete(profile);
  const loadError = profileState.error || workouts.error || meals.error || plans.error;

  // Facade: 요약 계산은 한 번의 호출로
  const summary = summaryService.summarize({
    profile, meals: meals.items, workouts: workouts.items, plans: plans.items, recordedDates,
  });

  const today = todayKey();
  const dayLabel = date === today ? '오늘' : date;

  // ── 프로필 ──
  async function saveProfile(data) {
    const ok = await run(() => repos.profile.save(data), '프로필을 저장했습니다.');
    if (ok) setEditingProfile(false);
    return ok;
  }

  // ── 운동 (Factory) ──
  function addWorkout(input) {
    const { record, error } = createWorkout(input, { date, bodyWeightKg: profile?.weightKg });
    if (error) return fail(error);
    return run(() => repos.workouts.add(record), `${record.name} 기록을 저장했습니다. (${record.kcal}kcal)`);
  }

  // ── 식단 (Chain of Responsibility) ──
  function addMeal(input) {
    const { record, error } = validateMeal(input, { date, existingMeals: meals.items, forCreate: true });
    if (error) return fail(error);
    const id = mealDocId(date, record.mealType);
    const label = MEAL_LABEL[record.mealType];
    return run(() => (id ? repos.meals.put(id, record) : repos.meals.add(record)), `${label}을(를) 기록했습니다.`);
  }

  function editMeal(meal, input) {
    const { record, error } = validateMeal({ ...input, mealType: meal.mealType }, { date: meal.date, forCreate: false });
    if (error) return fail(error);
    const { food, kcal, proteinG } = record;
    return run(() => repos.meals.update(meal.id, { food, kcal, proteinG }), '식단을 수정했습니다.');
  }

  // ── 계획 (State) ──
  function addPlan(value) {
    const { title, error } = validatePlanTitle(value);
    if (error) return fail(error);
    return run(() => repos.plans.add({ date, title, status: 'planned' }), '계획을 추가했습니다.');
  }

  function renamePlan(plan, value) {
    if (!planStateOf(plan.status).canEdit()) return fail('완료한 계획은 수정할 수 없습니다.');
    const { title, error } = validatePlanTitle(value);
    if (error) return fail(error);
    return run(() => repos.plans.update(plan.id, { title }), '계획을 수정했습니다.');
  }

  function changePlanStatus(plan, next) {
    let status;
    try {
      status = planStateOf(plan.status).transition(next);
    } catch (error) {
      return fail(error.message);
    }
    return run(() => repos.plans.update(plan.id, { status }),
      status === 'done' ? '계획을 완료했습니다.' : '계획을 보관했습니다.');
  }

  // ── 삭제와 실행 취소 (Command) ──
  async function deleteRecord(repository, item, label, { undoable = true } = {}) {
    if (!undoable && !window.confirm(`"${label}"을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return false;
    const command = new DeleteRecordCommand(repository, item, label, { undoable });
    const ok = await run(() => history.current.run(command), `"${label}" 기록을 삭제했습니다.`);
    if (ok) setUndoLabel(undoable ? label : '');
    return ok;
  }

  function deletePlan(plan) {
    const state = planStateOf(plan.status);
    if (!state.canDelete()) return fail('완료한 계획은 보관한 뒤 삭제할 수 있습니다.');
    return deleteRecord(repos.plans, plan, plan.title, { undoable: state.canUndoDelete() });
  }

  async function undo() {
    const ok = await run(async () => {
      const command = await history.current.undo();
      if (command) setUndoLabel(history.current.peek()?.label ?? '');
    }, '삭제를 되돌렸습니다.');
    return ok;
  }

  async function logout() {
    history.current.clear();
    await run(() => signOut(auth));
  }

  function moveDay(next) {
    clear();
    setDate(next);
  }

  if (profileState.loading) {
    return <div className="center-screen"><p className="muted" role="status">프로필을 불러오는 중…</p></div>;
  }

  const showProfile = editingProfile || needsProfile;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />FitLog</div>
        <div className="topbar-right">
          <span className="muted">{profile?.nickname || user.displayName || user.email}님</span>
          <button className="btn-ghost" disabled={busy} onClick={() => { clear(); setEditingProfile(true); }}>프로필</button>
          <button className="btn-ghost" disabled={busy} onClick={logout}>로그아웃</button>
        </div>
      </header>

      <main className="content">
        {loadError && <p className="form-error" role="alert">{loadError}</p>}
        {message && <p className="form-error" role="alert">{message}</p>}
        {notice && (
          <p className="form-ok" role="status">
            {notice}
            {undoLabel && history.current.canUndo() && (
              <button className="link-button" disabled={busy} onClick={undo}>실행 취소</button>
            )}
          </p>
        )}

        {showProfile ? (
          <ProfilePanel key={profile?.id ?? 'new'} profile={profile} busy={busy}
            onSave={saveProfile} onCancel={() => setEditingProfile(false)} onError={fail} />
        ) : (
          <>
            <div className="day-bar">
              <button className="btn-ghost" disabled={busy} onClick={() => moveDay(shiftDay(date, -1))} aria-label="이전 날">◀</button>
              <input type="date" aria-label="날짜 선택" value={date} max={today}
                onChange={(e) => e.target.value && moveDay(e.target.value)} />
              <button className="btn-ghost" disabled={busy || date >= today} onClick={() => moveDay(shiftDay(date, 1))} aria-label="다음 날">▶</button>
              {date !== today && <button className="btn-ghost" onClick={() => moveDay(today)}>오늘로</button>}
            </div>

            <nav className="tabs" aria-label="기록 종류">
              {TABS.map(([key, label]) => (
                <button key={key} className={tab === key ? 'tab active' : 'tab'} aria-pressed={tab === key}
                  onClick={() => setTab(key)}>{label}</button>
              ))}
            </nav>

            {tab === 'summary' && <SummaryPanel summary={summary} dayLabel={dayLabel} />}
            {tab === 'workouts' && (
              <WorkoutPanel dayLabel={dayLabel} items={workouts.items} loading={workouts.loading} busy={busy}
                onAdd={addWorkout} onDelete={(w) => deleteRecord(repos.workouts, w, w.name)} />
            )}
            {tab === 'plans' && (
              <PlanPanel dayLabel={dayLabel} items={plans.items} loading={plans.loading} busy={busy}
                onAdd={addPlan} onRename={renamePlan} onChangeStatus={changePlanStatus} onDelete={deletePlan} />
            )}
            {tab === 'meals' && (
              <MealPanel dayLabel={dayLabel} items={meals.items} loading={meals.loading} busy={busy}
                onAdd={addMeal} onEdit={editMeal}
                onDelete={(m) => deleteRecord(repos.meals, m, `${MEAL_LABEL[m.mealType]} · ${m.food}`)} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
