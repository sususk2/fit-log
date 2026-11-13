import { describe, it, expect } from 'vitest';
import { CardioBurnStrategy, StrengthBurnStrategy, getBurnStrategy } from './burnStrategies.js';
import { getGoalStrategy, goalLabel } from './goalStrategies.js';

describe('Strategy: 소모 칼로리 계산', () => {
  it('유산소는 MET × 체중 × 시간으로 계산한다', () => {
    // 달리기 MET 9.8 × 70kg × 0.5h = 343
    expect(getBurnStrategy('cardio').calculate({ name: '달리기', durationMin: 30 }, 70)).toBe(343);
  });
  it('표에 없는 유산소 종목은 "기타" MET를 쓴다', () => {
    expect(new CardioBurnStrategy().calculate({ name: '등산', durationMin: 60 }, 60)).toBe(360);
  });
  it('근력은 세트 수로 운동 시간을 추정해 계산한다', () => {
    // 5.0 × 60kg × (5세트 × 2분 / 60) = 50
    expect(getBurnStrategy('strength').calculate({ sets: 5 }, 60)).toBe(50);
    expect(new StrengthBurnStrategy({ minutesPerSet: 3 }).calculate({ sets: 4 }, 60)).toBe(60);
  });
  it('모르는 종류는 오류를 낸다', () => {
    expect(() => getBurnStrategy('yoga')).toThrow('알 수 없는 운동 종류');
  });
});

describe('Strategy: 목표별 권장 칼로리', () => {
  it('목표에 따라 칼로리·단백질 권장값이 달라진다', () => {
    expect(getGoalStrategy('maintain').recommend(70)).toEqual({ calorieGoal: 2100, proteinGoal: 98 });
    expect(getGoalStrategy('lose').recommend(70)).toEqual({ calorieGoal: 1600, proteinGoal: 126 });
    expect(getGoalStrategy('gain').recommend(70)).toEqual({ calorieGoal: 2400, proteinGoal: 140 });
  });
  it('감량 권장 칼로리는 1200kcal 아래로 내려가지 않는다', () => {
    expect(getGoalStrategy('lose').recommend(40).calorieGoal).toBe(1200);
  });
  it('라벨을 돌려주고 모르는 목표는 막는다', () => {
    expect(goalLabel('gain')).toBe('증량');
    expect(goalLabel(undefined)).toBe('-');
    expect(() => getGoalStrategy('bulk')).toThrow();
  });
});
