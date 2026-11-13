import { describe, it, expect } from 'vitest';
import { DailySummaryService } from './DailySummaryService.js';

const service = new DailySummaryService({ today: () => '2026-11-13' });
const profile = { goalType: 'lose', calorieGoal: 2000, proteinGoal: 100 };

describe('Facade: 오늘의 요약', () => {
  it('섭취·소모·순섭취와 달성률을 한 번에 계산한다', () => {
    const s = service.summarize({
      profile,
      meals: [{ kcal: 500, proteinG: 30 }, { kcal: 700, proteinG: 25 }],
      workouts: [{ kcal: 200 }, { kcal: 150 }],
      plans: [{ status: 'planned' }, { status: 'done' }, { status: 'archived' }],
      recordedDates: ['2026-11-13'],
    });
    expect(s).toMatchObject({
      goalLabel: '감량', intake: 1200, protein: 55, burned: 350, net: 850,
      calorieGoal: 2000, caloriePct: 60, proteinPct: 55, overKcal: -800,
      workoutCount: 2, mealCount: 2, streak: 1,
    });
    expect(s.plans).toEqual({ total: 2, done: 1 }); // 보관한 계획은 빠진다
  });
  it('목표가 없으면 달성률은 0%', () => {
    const s = service.summarize({ profile: null, meals: [{ kcal: 300, proteinG: 10 }] });
    expect(s.caloriePct).toBe(0);
    expect(s.goalLabel).toBe('-');
  });
});

describe('연속 기록일', () => {
  it('오늘부터 거꾸로 이어진 날을 센다', () => {
    expect(service.streak(['2026-11-13', '2026-11-12', '2026-11-11', '2026-11-09'])).toBe(3);
  });
  it('오늘 기록이 아직 없으면 어제까지 이어진 날을 센다', () => {
    expect(service.streak(['2026-11-12', '2026-11-11'])).toBe(2);
  });
  it('어제도 없으면 0일', () => {
    expect(service.streak(['2026-11-10'])).toBe(0);
  });
  it('월이 바뀌어도 이어서 센다', () => {
    const s = new DailySummaryService({ today: () => '2026-12-01' });
    expect(s.streak(['2026-12-01', '2026-11-30', '2026-11-29'])).toBe(3);
  });
});
