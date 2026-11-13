import { describe, it, expect } from 'vitest';
import { PlanStateError, planStateOf, validatePlanTitle } from './planState.js';

describe('State: 운동 계획 상태', () => {
  it('예정 → 완료 → 보관 순서로만 바뀐다', () => {
    expect(planStateOf('planned').transition('done')).toBe('done');
    expect(planStateOf('done').transition('archived')).toBe('archived');
  });
  it('순서를 건너뛰거나 되돌리면 PlanStateError', () => {
    expect(() => planStateOf('planned').transition('archived')).toThrow(PlanStateError);
    expect(() => planStateOf('done').transition('planned')).toThrow('보관만');
    expect(() => planStateOf('archived').transition('planned')).toThrow('바꿀 수 없습니다');
  });
  it('완료 후에는 수정할 수 없다', () => {
    expect(planStateOf('planned').canEdit()).toBe(true);
    expect(planStateOf('done').canEdit()).toBe(false);
    expect(planStateOf('archived').canEdit()).toBe(false);
  });
  it('완료 상태는 삭제할 수 없고, 보관 상태 삭제는 되돌릴 수 없다', () => {
    expect(planStateOf('planned').canDelete()).toBe(true);
    expect(planStateOf('done').canDelete()).toBe(false);
    expect(planStateOf('archived').canDelete()).toBe(true);
    expect(planStateOf('archived').canUndoDelete()).toBe(false);
  });
  it('상태마다 보여 줄 버튼이 다르다', () => {
    expect(planStateOf('planned').actions()).toEqual([{ to: 'done', label: '완료' }]);
    expect(planStateOf('done').actions()).toEqual([{ to: 'archived', label: '보관' }]);
    expect(planStateOf('archived').actions()).toEqual([]);
  });
  it('모르는 상태는 막는다', () => {
    expect(() => planStateOf('deleted')).toThrow(PlanStateError);
  });
  it('계획 제목은 공백 제외 1~40자', () => {
    expect(validatePlanTitle('  하체 운동 ')).toEqual({ title: '하체 운동' });
    expect(validatePlanTitle('   ').error).toBeTruthy();
    expect(validatePlanTitle('가'.repeat(41)).error).toBeTruthy();
  });
});
