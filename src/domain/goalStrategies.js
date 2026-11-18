// [패턴] Strategy — 목표(감량·유지·증량)에 따라 권장 칼로리·단백질 계산을 바꾼다.
// 변경 전: HomePage.fillRecommended 안의 if/else 세 갈래
// 변경 후: 목표마다 전략 객체 하나, 화면은 getGoalStrategy(goalType).recommend(체중)만 호출

const KCAL_PER_KG = 30;     // 활동량 보통 기준 유지 칼로리 근사값
const MIN_CALORIE = 1200;   // 너무 낮은 목표는 막는다

function roundTo10(value) {
  return Math.round(value / 10) * 10;
}

class GoalStrategy {
  constructor({ type, label, calorieOffset, proteinPerKg }) {
    this.type = type;
    this.label = label;
    this.calorieOffset = calorieOffset;
    this.proteinPerKg = proteinPerKg;
  }

  recommend(weightKg) {
    const calorie = Math.max(MIN_CALORIE, weightKg * KCAL_PER_KG + this.calorieOffset);
    return {
      calorieGoal: roundTo10(calorie),
      proteinGoal: Math.round(weightKg * this.proteinPerKg),
    };
  }
}

export const GOAL_STRATEGIES = Object.freeze({
  lose: new GoalStrategy({ type: 'lose', label: '감량', calorieOffset: -500, proteinPerKg: 1.8 }),
  maintain: new GoalStrategy({ type: 'maintain', label: '유지', calorieOffset: 0, proteinPerKg: 1.4 }),
  gain: new GoalStrategy({ type: 'gain', label: '증량', calorieOffset: 300, proteinPerKg: 2.0 }),
});

export const GOAL_TYPES = Object.keys(GOAL_STRATEGIES);

export function getGoalStrategy(goalType) {
  const strategy = GOAL_STRATEGIES[goalType];
  if (!strategy) throw new Error(`알 수 없는 목표입니다: ${goalType}`);
  return strategy;
}

export function goalLabel(goalType) {
  return GOAL_STRATEGIES[goalType]?.label ?? '-';
}
