import { useState } from 'react';
import { GOAL_STRATEGIES, getGoalStrategy } from '../domain/goalStrategies.js';
import { profileToForm, validateProfile } from '../domain/profile.js';
import { isNum } from '../lib/validators.js';

export default function ProfilePanel({ profile, busy, onSave, onCancel, onError }) {
  const [form, setForm] = useState(() => profileToForm(profile));
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const complete = Boolean(profile?.weightKg);

  function fillRecommended() {
    if (!isNum(form.weightKg, 30, 250)) return onError('체중을 30~250kg 사이로 먼저 입력해 주세요.');
    // Strategy: 목표에 맞는 계산 전략을 골라 권장값을 받는다
    const { calorieGoal, proteinGoal } = getGoalStrategy(form.goalType).recommend(Number(form.weightKg));
    setForm({ ...form, calorieGoal, proteinGoal });
    return true;
  }

  async function submit(e) {
    e.preventDefault();
    const result = validateProfile(form);
    if (result.error) return onError(result.error);
    return onSave(result.data);
  }

  return (
    <section className="panel">
      <h2>프로필·목표 설정</h2>
      {!complete && <p className="muted">기록을 시작하기 전에 체중과 목표를 입력해 주세요. 소모 칼로리 계산에 사용됩니다.</p>}
      <form className="grid-form" onSubmit={submit} noValidate>
        <label>닉네임
          <input value={form.nickname} maxLength={20} disabled={busy} onChange={set('nickname')} />
        </label>
        <label>체중 (kg)
          <input type="number" inputMode="decimal" step="0.1" value={form.weightKg} disabled={busy} onChange={set('weightKg')} />
        </label>
        <label>목표
          <select value={form.goalType} disabled={busy} onChange={set('goalType')}>
            {Object.values(GOAL_STRATEGIES).map((g) => <option key={g.type} value={g.type}>{g.label}</option>)}
          </select>
        </label>
        <label>목표 칼로리 (kcal)
          <input type="number" inputMode="numeric" value={form.calorieGoal} disabled={busy} onChange={set('calorieGoal')} />
        </label>
        <label>목표 단백질 (g)
          <input type="number" inputMode="numeric" value={form.proteinGoal} disabled={busy} onChange={set('proteinGoal')} />
        </label>
        <div className="form-actions">
          <button type="button" className="btn-ghost" disabled={busy} onClick={fillRecommended}>권장값 채우기</button>
          {complete && <button type="button" className="btn-ghost" disabled={busy} onClick={onCancel}>취소</button>}
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
        </div>
      </form>
    </section>
  );
}
