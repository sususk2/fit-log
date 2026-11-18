// [패턴] State — 운동 계획의 상태(예정 → 완료 → 보관)마다 허용되는 동작을 상태 객체가 결정한다.
// 변경 전: changePlanStatus·removePlan·savePlanEdit와 JSX 버튼 조건에 if (status === …)가 흩어져 있었다.
// 변경 후: planStateOf(status).canEdit() / canDelete() / actions() / transition(next)
//          같은 규칙을 firestore.rules에서도 서버 쪽으로 한 번 더 막는다.

export class PlanStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PlanStateError';
  }
}

class PlanState {
  constructor(status, label) {
    this.status = status;
    this.label = label;
  }
  canEdit() { return false; }
  canDelete() { return false; }
  canUndoDelete() { return false; }
  /** 이 상태에서 누를 수 있는 상태 변경 버튼 목록 */
  actions() { return []; }
  /** 다음 상태 이름을 돌려주거나, 허용되지 않으면 PlanStateError */
  transition(next) {
    throw new PlanStateError(`${this.label} 상태에서는 ${next}(으)로 바꿀 수 없습니다.`);
  }
}

class PlannedState extends PlanState {
  constructor() { super('planned', '예정'); }
  canEdit() { return true; }
  canDelete() { return true; }
  canUndoDelete() { return true; }
  actions() { return [{ to: 'done', label: '완료' }]; }
  transition(next) {
    if (next === 'done') return 'done';
    throw new PlanStateError('예정된 계획은 완료로만 바꿀 수 있습니다.');
  }
}

class DoneState extends PlanState {
  constructor() { super('done', '완료'); }
  actions() { return [{ to: 'archived', label: '보관' }]; }
  transition(next) {
    if (next === 'archived') return 'archived';
    throw new PlanStateError('완료한 계획은 수정할 수 없고 보관만 할 수 있습니다.');
  }
}

class ArchivedState extends PlanState {
  constructor() { super('archived', '보관'); }
  canDelete() { return true; }
  transition() {
    throw new PlanStateError('보관한 계획은 바꿀 수 없습니다.');
  }
}

const STATES = Object.freeze({
  planned: new PlannedState(),
  done: new DoneState(),
  archived: new ArchivedState(),
});

export const PLAN_STATUSES = Object.keys(STATES);

export function planStateOf(status) {
  const state = STATES[status];
  if (!state) throw new PlanStateError(`알 수 없는 계획 상태입니다: ${status}`);
  return state;
}

export function validatePlanTitle(value) {
  const title = String(value ?? '').trim();
  if (!title || title.length > 40) return { error: '계획은 1~40자로 입력해 주세요.' };
  return { title };
}
