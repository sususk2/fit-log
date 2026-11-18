// [패턴] Facade — "오늘의 요약"에 필요한 여러 하위 계산을 한 창구로 묶는다.
// 변경 전: HomePage 렌더링 부분에 합계·달성률·계획 집계·연속 기록일 while 문이 그대로 들어 있었다.
// 변경 후: 화면은 summaryService.summarize({...})만 호출한다.
//          내부에서는 목표 전략(goalStrategies), 계획 상태(planState), 날짜 계산(dates)을 조합한다.
import { GOAL_STRATEGIES, goalLabel } from './goalStrategies.js';
import { planStateOf } from './planState.js';
import { shiftDay, shortDayLabel, todayKey } from '../lib/dates.js';

function sum(list, key) {
  return list.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function percent(value, goal) {
  return goal > 0 ? Math.round((value / goal) * 100) : 0;
}

export class DailySummaryService {
  constructor({ today = () => todayKey() } = {}) {
    this.today = today;
  }

  totals(meals, workouts) {
    const intake = sum(meals, 'kcal');
    const protein = sum(meals, 'proteinG');
    const burned = sum(workouts, 'kcal');
    return { intake, protein, burned, net: intake - burned };
  }

  /** 목표별 Strategy에 달성 판단을 맡긴다 */
  isGoalAchieved(intake, profile) {
    const strategy = GOAL_STRATEGIES[profile?.goalType];
    const goal = Number(profile?.calorieGoal) || 0;
    return Boolean(strategy && goal > 0 && strategy.isAchieved(intake, goal));
  }

  achievement(totals, profile) {
    const calorieGoal = Number(profile?.calorieGoal) || 0;
    const proteinGoal = Number(profile?.proteinGoal) || 0;
    return {
      goalAchieved: this.isGoalAchieved(totals.intake, profile),
      goalRule: GOAL_STRATEGIES[profile?.goalType]?.rule ?? '',
      calorieGoal,
      proteinGoal,
      caloriePct: percent(totals.intake, calorieGoal),
      proteinPct: percent(totals.protein, proteinGoal),
      overKcal: calorieGoal > 0 ? totals.intake - calorieGoal : 0,
    };
  }

  plans(plans) {
    // 보관한 계획은 달성률 계산에서 뺀다 (상태별 판단은 State 객체에 맡김)
    const active = plans.filter((p) => planStateOf(p.status).status !== 'archived');
    const done = active.filter((p) => planStateOf(p.status).status === 'done');
    return { total: active.length, done: done.length };
  }

  /** 운동 또는 식단을 기록한 날이 오늘(또는 오늘 기록 전이면 어제)부터 며칠 이어졌는지 */
  streak(recordedDates) {
    const recorded = new Set(recordedDates);
    let cursor = this.today();
    if (!recorded.has(cursor)) cursor = shiftDay(cursor, -1);
    let count = 0;
    while (recorded.has(cursor)) {
      count += 1;
      cursor = shiftDay(cursor, -1);
    }
    return count;
  }

  /**
   * 최근 N일 통계 (endDate 포함). meals·workouts는 기간 안의 기록 전체.
   * 하루마다 섭취·소모·단백질·달성 여부를 만들고, 기간 합계(달성일·운동일·평균)를 함께 돌려준다.
   */
  weekly({ profile, meals = [], workouts = [], endDate = this.today(), days = 7 }) {
    const byDate = (list) => list.reduce((map, item) => {
      (map[item.date] ??= []).push(item);
      return map;
    }, {});
    const mealsByDate = byDate(meals);
    const workoutsByDate = byDate(workouts);

    const list = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = shiftDay(endDate, -i);
      const dayMeals = mealsByDate[date] ?? [];
      const dayWorkouts = workoutsByDate[date] ?? [];
      const totals = this.totals(dayMeals, dayWorkouts);
      list.push({
        date,
        label: shortDayLabel(date),
        ...totals,
        hasMeals: dayMeals.length > 0,
        hasWorkouts: dayWorkouts.length > 0,
        achieved: dayMeals.length > 0 && this.isGoalAchieved(totals.intake, profile),
      });
    }

    const mealDays = list.filter((d) => d.hasMeals);
    const average = (items, key) => (items.length ? Math.round(sum(items, key) / items.length) : 0);
    return {
      days: list,
      calorieGoal: Number(profile?.calorieGoal) || 0,
      goalRule: GOAL_STRATEGIES[profile?.goalType]?.rule ?? '',
      achievedDays: list.filter((d) => d.achieved).length,
      workoutDays: list.filter((d) => d.hasWorkouts).length,
      mealDays: mealDays.length,
      avgIntake: average(mealDays, 'intake'),
      totalBurned: sum(list, 'burned'),
      maxKcal: Math.max(Number(profile?.calorieGoal) || 0, ...list.map((d) => d.intake), 1),
    };
  }

  summarize({ profile, meals = [], workouts = [], plans = [], recordedDates = [] }) {
    const totals = this.totals(meals, workouts);
    return {
      goalLabel: goalLabel(profile?.goalType),
      ...totals,
      ...this.achievement(totals, profile),
      workoutCount: workouts.length,
      mealCount: meals.length,
      plans: this.plans(plans),
      streak: this.streak(recordedDates),
    };
  }
}

export const summaryService = new DailySummaryService();
