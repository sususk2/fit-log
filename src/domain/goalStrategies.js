// [패턴] Strategy — 목표(감량·유지·증량)에 따라 권장 칼로리·단백질 계산을 바꾼다.
// 변경 전: HomePage.fillRecommended 안의 if/else 세 갈래
// 변경 후: 목표마다 전략 클래스 하나. recommend(체중)으로 권장값을, isAchieved(섭취, 목표)로 달성 여부를 판단한다.

const KCAL_PER_KG = 30;     // 활동량 보통 기준 유지 칼로리 근사값
const MIN_CALORIE = 1200;   // 너무 낮은 목표는 막는다

function roundTo10(value) {
  return Math.round(value / 10) * 10;
}

class GoalStrategy {
  constructor({ type, label, calorieOffset, proteinPerKg, rule }) {
    this.type = type;
    this.label = label;
    this.calorieOffset = calorieOffset;
    this.proteinPerKg = proteinPerKg;
    this.rule = rule; // 달성 기준 설명 (화면 표시용)
  }

  /** 하루 섭취 칼로리가 목표를 달성했는지 — 목표마다 판단 방법이 다르다 */
  isAchieved() {
    throw new Error('목표별 전략에서 구현해야 합니다.');
  }

  recommend(weightKg) {
    const calorie = Math.max(MIN_CALORIE, weightKg * KCAL_PER_KG + this.calorieOffset);
    return {
      calorieGoal: roundTo10(calorie),
      proteinGoal: Math.round(weightKg * this.proteinPerKg),
    };
  }
}

// 감량: 목표 칼로리 이하(5% 여유)로 먹으면 달성
class LoseStrategy extends GoalStrategy {
  constructor() { super({ type: 'lose', label: '감량', calorieOffset: -500, proteinPerKg: 1.8, rule: '목표 칼로리 이하' }); }
  isAchieved(intake, goal) { return intake > 0 && intake <= goal * 1.05; }
}

// 유지: 목표 칼로리 ±10% 안이면 달성
class MaintainStrategy extends GoalStrategy {
  constructor() { super({ type: 'maintain', label: '유지', calorieOffset: 0, proteinPerKg: 1.4, rule: '목표 칼로리 ±10%' }); }
  isAchieved(intake, goal) { return intake >= goal * 0.9 && intake <= goal * 1.1; }
}

// 증량: 목표 칼로리 이상(5% 여유)을 먹으면 달성
class GainStrategy extends GoalStrategy {
  constructor() { super({ type: 'gain', label: '증량', calorieOffset: 300, proteinPerKg: 2.0, rule: '목표 칼로리 이상' }); }
  isAchieved(intake, goal) { return intake >= goal * 0.95; }
}

export const GOAL_STRATEGIES = Object.freeze({
  lose: new LoseStrategy(),
  maintain: new MaintainStrategy(),
  gain: new GainStrategy(),
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
