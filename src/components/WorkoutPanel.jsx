import { useState } from 'react';
import { CARDIO_MET } from '../domain/burnStrategies.js';
import { WORKOUT_TYPE_LABEL, describeWorkout } from '../domain/workoutFactory.js';

const EMPTY = { type: 'cardio', name: '걷기', durationMin: '', distanceKm: '', sets: '', reps: '', weightKg: '' };

function emptyFor(type) {
  return { ...EMPTY, type, name: type === 'cardio' ? '걷기' : '' };
}

function editFormOf(w) {
  return w.type === 'cardio'
    ? { durationMin: String(w.durationMin), distanceKm: w.distanceKm != null ? String(w.distanceKm) : '' }
    : { sets: String(w.sets), reps: String(w.reps), weightKg: String(w.weightKg) };
}

export default function WorkoutPanel({ dayLabel, items, loading, busy, feedback, onAdd, onEdit, onDelete }) {
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({});
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const sorted = [...items].sort((a, b) => (a.createdAtMs ?? Infinity) - (b.createdAtMs ?? Infinity));

  async function submit(e) {
    e.preventDefault();
    if (await onAdd(form)) setForm(emptyFor(form.type)); // 저장 실패 시 입력 유지
  }

  async function saveEdit(e, w) {
    e.preventDefault();
    if (await onEdit(w, edit)) setEditingId(null);
  }

  function editInput(key, label, step) {
    return (
      <input type="number" className="narrow" inputMode={step ? 'decimal' : 'numeric'} step={step}
        value={edit[key] ?? ''} aria-label={label} placeholder={label} disabled={busy}
        onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} />
    );
  }

  return (
    <section className="panel">
      <h2>{dayLabel}의 운동</h2>
      <form className="grid-form" onSubmit={submit} noValidate>
        <label>종류
          <select value={form.type} disabled={busy} onChange={(e) => setForm(emptyFor(e.target.value))}>
            {Object.entries(WORKOUT_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {form.type === 'cardio' ? (
          <>
            <label>운동
              <select value={form.name} disabled={busy} onChange={set('name')}>
                {Object.keys(CARDIO_MET).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>시간 (분)
              <input type="number" inputMode="numeric" value={form.durationMin} disabled={busy} onChange={set('durationMin')} />
            </label>
            <label>거리 (km, 선택)
              <input type="number" inputMode="decimal" step="0.1" value={form.distanceKm} disabled={busy} onChange={set('distanceKm')} />
            </label>
          </>
        ) : (
          <>
            <label>운동 이름
              <input value={form.name} maxLength={30} placeholder="예: 벤치프레스" disabled={busy} onChange={set('name')} />
            </label>
            <label>세트
              <input type="number" inputMode="numeric" value={form.sets} disabled={busy} onChange={set('sets')} />
            </label>
            <label>횟수
              <input type="number" inputMode="numeric" value={form.reps} disabled={busy} onChange={set('reps')} />
            </label>
            <label>무게 (kg)
              <input type="number" inputMode="decimal" step="0.5" value={form.weightKg} disabled={busy} onChange={set('weightKg')} />
            </label>
          </>
        )}
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? '저장 중…' : '기록 추가'}</button>
        </div>
      </form>
      {feedback}

      {loading ? <p className="empty" role="status">운동 기록을 불러오는 중…</p>
        : !sorted.length && <p className="empty">아직 운동 기록이 없습니다. 첫 운동을 기록해 보세요.</p>}
      <ul className="item-list">
        {sorted.map((w) => (
          <li key={w.id}>
            {editingId === w.id ? (
              <form className="add-form wide" onSubmit={(e) => saveEdit(e, w)} noValidate>
                <strong className="edit-name">{w.name}</strong>
                {w.type === 'cardio' ? (
                  <>
                    {editInput('durationMin', '시간(분)')}
                    {editInput('distanceKm', '거리(km)', '0.1')}
                  </>
                ) : (
                  <>
                    {editInput('sets', '세트')}
                    {editInput('reps', '횟수')}
                    {editInput('weightKg', '무게(kg)', '0.5')}
                  </>
                )}
                <button className="btn-primary" disabled={busy}>저장</button>
                <button type="button" className="btn-ghost" disabled={busy} onClick={() => setEditingId(null)}>취소</button>
              </form>
            ) : (
              <>
                <div>
                  <span className={`badge ${w.type}`}>{WORKOUT_TYPE_LABEL[w.type]}</span>
                  <strong>{w.name}</strong>
                  <span className="muted"> {describeWorkout(w)}</span>
                </div>
                <div className="item-actions">
                  <span className="kcal">{w.kcal}kcal</span>
                  <button className="btn-small" disabled={busy} aria-label={`${w.name} 수정`}
                    onClick={() => { setEditingId(w.id); setEdit(editFormOf(w)); }}>수정</button>
                  <button className="btn-small danger" disabled={busy} onClick={() => onDelete(w)} aria-label={`${w.name} 삭제`}>삭제</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
