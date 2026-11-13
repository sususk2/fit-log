import { useState } from 'react';
import { CARDIO_MET } from '../domain/burnStrategies.js';
import { WORKOUT_TYPE_LABEL, describeWorkout } from '../domain/workoutFactory.js';

const EMPTY = { type: 'cardio', name: '걷기', durationMin: '', distanceKm: '', sets: '', reps: '', weightKg: '' };

function emptyFor(type) {
  return { ...EMPTY, type, name: type === 'cardio' ? '걷기' : '' };
}

export default function WorkoutPanel({ dayLabel, items, loading, busy, onAdd, onDelete }) {
  const [form, setForm] = useState(EMPTY);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const sorted = [...items].sort((a, b) => (a.createdAtMs ?? Infinity) - (b.createdAtMs ?? Infinity));

  async function submit(e) {
    e.preventDefault();
    if (await onAdd(form)) setForm(emptyFor(form.type)); // 저장 실패 시 입력 유지
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

      {loading ? <p className="empty" role="status">운동 기록을 불러오는 중…</p>
        : !sorted.length && <p className="empty">아직 운동 기록이 없습니다. 첫 운동을 기록해 보세요.</p>}
      <ul className="item-list">
        {sorted.map((w) => (
          <li key={w.id}>
            <div>
              <span className={`badge ${w.type}`}>{WORKOUT_TYPE_LABEL[w.type]}</span>
              <strong>{w.name}</strong>
              <span className="muted"> {describeWorkout(w)}</span>
            </div>
            <div className="item-actions">
              <span className="kcal">{w.kcal}kcal</span>
              <button className="btn-small danger" disabled={busy} onClick={() => onDelete(w)} aria-label={`${w.name} 삭제`}>삭제</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
