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

describe('Facade: 최근 7일 통계', () => {
  const meals = [
    { date: '2026-11-13', kcal: 1900, proteinG: 90 },
    { date: '2026-11-12', kcal: 1000, proteinG: 40 },
    { date: '2026-11-12', kcal: 1300, proteinG: 50 },  // 하루 2300 → 감량 미달성
    { date: '2026-11-10', kcal: 1500, proteinG: 60 },
    { date: '2026-11-01', kcal: 999, proteinG: 1 },    // 기간 밖
  ];
  const workouts = [{ date: '2026-11-13', kcal: 200 }, { date: '2026-11-09', kcal: 300 }];
  const w = service.weekly({ profile, meals, workouts, endDate: '2026-11-13' });

  it('끝 날짜를 포함해 7일을 오래된 순으로 만든다', () => {
    expect(w.days.map((d) => d.date)).toEqual([
      '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13',
    ]);
    expect(w.days[6].label).toBe('11/13 (금)');
  });
  it('날짜별 합계와 목표 달성 여부(감량 전략)를 계산한다', () => {
    const d12 = w.days.find((d) => d.date === '2026-11-12');
    expect(d12).toMatchObject({ intake: 2300, protein: 90, achieved: false });
    expect(w.days.find((d) => d.date === '2026-11-13')).toMatchObject({ intake: 1900, burned: 200, achieved: true });
    expect(w.days.find((d) => d.date === '2026-11-09')).toMatchObject({ intake: 0, burned: 300, achieved: false });
  });
  it('기간 합계: 달성일·운동일·평균 섭취(식단 기록한 날 기준)·총 소모', () => {
    expect(w).toMatchObject({ achievedDays: 2, workoutDays: 2, mealDays: 3, avgIntake: 1900, totalBurned: 500, calorieGoal: 2000 });
    expect(w.maxKcal).toBe(2300);
  });
  it('오늘 요약에도 달성 여부를 넣는다', () => {
    expect(service.summarize({ profile, meals: [{ kcal: 1500 }] }).goalAchieved).toBe(true);
    expect(service.summarize({ profile: { ...profile, goalType: 'gain' }, meals: [{ kcal: 1500 }] }).goalAchieved).toBe(false);
  });
});
