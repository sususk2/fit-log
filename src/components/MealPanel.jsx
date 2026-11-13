import { useState } from 'react';
import { FOOD_PRESETS, MEAL_LABEL, MEAL_TYPES, sortMeals } from '../domain/meals.js';

const EMPTY = { mealType: 'breakfast', food: '', kcal: '', proteinG: '' };

export default function MealPanel({ dayLabel, items, loading, busy, onAdd, onEdit, onDelete }) {
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ food: '', kcal: '', proteinG: '' });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const sorted = sortMeals(items);

  async function submit(e) {
    e.preventDefault();
    if (await onAdd(form)) setForm({ ...EMPTY, mealType: form.mealType });
  }

  async function saveEdit(e, meal) {
    e.preventDefault();
    if (await onEdit(meal, edit)) setEditingId(null);
  }

  return (
    <section className="panel">
      <h2>{dayLabel}의 식단</h2>
      <div className="presets" aria-label="자주 먹는 음식">
        {FOOD_PRESETS.map((p) => (
          <button key={p.food} type="button" className="chip" disabled={busy}
            onClick={() => setForm({ ...form, food: p.food, kcal: String(p.kcal), proteinG: String(p.proteinG) })}>
            {p.food}
          </button>
        ))}
      </div>
      <form className="grid-form" onSubmit={submit} noValidate>
        <label>끼니
          <select value={form.mealType} disabled={busy} onChange={set('mealType')}>
            {MEAL_TYPES.map((t) => <option key={t} value={t}>{MEAL_LABEL[t]}</option>)}
          </select>
        </label>
        <label>음식
          <input value={form.food} maxLength={40} disabled={busy} onChange={set('food')} />
        </label>
        <label>칼로리 (kcal)
          <input type="number" inputMode="numeric" value={form.kcal} disabled={busy} onChange={set('kcal')} />
        </label>
        <label>단백질 (g)
          <input type="number" inputMode="decimal" step="0.1" value={form.proteinG} disabled={busy} onChange={set('proteinG')} />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? '저장 중…' : '기록 추가'}</button>
        </div>
      </form>

      {loading ? <p className="empty" role="status">식단을 불러오는 중…</p>
        : !sorted.length && <p className="empty">아직 식단 기록이 없습니다. 위의 자주 먹는 음식을 눌러 빠르게 입력해 보세요.</p>}
      <ul className="item-list">
        {sorted.map((meal) => (
          <li key={meal.id}>
            {editingId === meal.id ? (
              <form className="add-form wide" onSubmit={(e) => saveEdit(e, meal)} noValidate>
                <input value={edit.food} maxLength={40} aria-label="음식 수정" disabled={busy}
                  onChange={(e) => setEdit({ ...edit, food: e.target.value })} />
                <input type="number" className="narrow" value={edit.kcal} aria-label="칼로리 수정" disabled={busy}
                  onChange={(e) => setEdit({ ...edit, kcal: e.target.value })} />
                <input type="number" className="narrow" value={edit.proteinG} aria-label="단백질 수정" disabled={busy}
                  onChange={(e) => setEdit({ ...edit, proteinG: e.target.value })} />
                <button className="btn-primary" disabled={busy}>저장</button>
                <button type="button" className="btn-ghost" disabled={busy} onClick={() => setEditingId(null)}>취소</button>
              </form>
            ) : (
              <>
                <div>
                  <span className={`badge ${meal.mealType}`}>{MEAL_LABEL[meal.mealType]}</span>
                  <strong>{meal.food}</strong>
                  <span className="muted"> 단백질 {meal.proteinG}g</span>
                </div>
                <div className="item-actions">
                  <span className="kcal">{meal.kcal}kcal</span>
                  <button className="btn-small" disabled={busy} aria-label={`${meal.food} 수정`}
                    onClick={() => { setEditingId(meal.id); setEdit({ food: meal.food, kcal: String(meal.kcal), proteinG: String(meal.proteinG) }); }}>수정</button>
                  <button className="btn-small danger" disabled={busy} onClick={() => onDelete(meal)} aria-label={`${meal.food} 삭제`}>삭제</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="hint">아침·점심·저녁은 하루 하나씩, 간식은 여러 개 기록할 수 있습니다.</p>
    </section>
  );
}
