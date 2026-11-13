import { useState } from 'react';
import { PLAN_STATUSES, planStateOf } from '../domain/planState.js';

export default function PlanPanel({ dayLabel, items, loading, busy, onAdd, onRename, onChangeStatus, onDelete }) {
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const sorted = [...items].sort((a, b) => (a.createdAtMs ?? Infinity) - (b.createdAtMs ?? Infinity));

  async function add(e) {
    e.preventDefault();
    if (await onAdd(title)) setTitle('');
  }

  async function saveEdit(e, plan) {
    e.preventDefault();
    if (await onRename(plan, editTitle)) setEditingId(null);
  }

  return (
    <section className="panel">
      <h2>{dayLabel}의 운동 계획</h2>
      <form className="add-form" onSubmit={add} noValidate>
        <label className="sr-only" htmlFor="new-plan">새 계획</label>
        <input id="new-plan" value={title} maxLength={40} placeholder="예: 하체 운동 40분" disabled={busy}
          onChange={(e) => setTitle(e.target.value)} />
        <button className="btn-primary" disabled={busy || !title.trim()}>추가</button>
      </form>

      {loading ? <p className="empty" role="status">계획을 불러오는 중…</p>
        : !sorted.length && <p className="empty">아직 계획이 없습니다.</p>}

      {PLAN_STATUSES.map((status) => {
        const list = sorted.filter((p) => p.status === status);
        if (!list.length) return null;
        return (
          <div key={status}>
            <h3>{planStateOf(status).label} ({list.length})</h3>
            <ul className="item-list">
              {list.map((plan) => {
                // State: 버튼 표시 여부를 상태 객체에 묻는다
                const state = planStateOf(plan.status);
                return (
                  <li key={plan.id} className={state.canEdit() ? '' : 'dim'}>
                    {editingId === plan.id ? (
                      <form className="add-form wide" onSubmit={(e) => saveEdit(e, plan)} noValidate>
                        <input value={editTitle} maxLength={40} aria-label="계획 수정" disabled={busy}
                          onChange={(e) => setEditTitle(e.target.value)} />
                        <button className="btn-primary" disabled={busy}>저장</button>
                        <button type="button" className="btn-ghost" disabled={busy} onClick={() => setEditingId(null)}>취소</button>
                      </form>
                    ) : (
                      <>
                        <span className={plan.status === 'done' ? 'done-text' : ''}>{plan.title}</span>
                        <div className="item-actions">
                          {state.actions().map((action) => (
                            <button key={action.to} className="btn-small" disabled={busy}
                              onClick={() => onChangeStatus(plan, action.to)}>{action.label}</button>
                          ))}
                          {state.canEdit() && (
                            <button className="btn-small" disabled={busy}
                              onClick={() => { setEditingId(plan.id); setEditTitle(plan.title); }}>수정</button>
                          )}
                          {state.canDelete() && (
                            <button className="btn-small danger" disabled={busy} onClick={() => onDelete(plan)}>삭제</button>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="hint">완료한 계획은 수정할 수 없고 보관만 할 수 있습니다.</p>
    </section>
  );
}
