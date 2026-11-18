// [패턴] Strategy — 운동 종류마다 소모 칼로리 계산 방법을 바꿔 끼운다.
// 변경 전: HomePage.addWorkout 안의 if (type === 'cardio') … else if (type === 'strength') …
// 변경 후: 계산식마다 전략 객체 하나. 새 종류(예: 스트레칭)는 전략만 추가하면 된다.

// 운동 강도(MET) 표. 소모 칼로리 = MET × 체중(kg) × 시간(h)
export const CARDIO_MET = Object.freeze({
  걷기: 3.5, 달리기: 9.8, 자전거: 7.5, 수영: 8.0, 줄넘기: 12.3, 기타: 6.0,
});

export class CardioBurnStrategy {
  constructor(metTable = CARDIO_MET) {
    this.metTable = metTable;
  }

  calculate({ name, durationMin }, bodyWeightKg) {
    const met = this.metTable[name] ?? this.metTable['기타'];
    return Math.round(met * bodyWeightKg * (durationMin / 60));
  }
}

export class StrengthBurnStrategy {
  // 근력 운동 MET 5.0, 세트당 휴식 포함 약 2분으로 본다.
  constructor({ met = 5.0, minutesPerSet = 2 } = {}) {
    this.met = met;
    this.minutesPerSet = minutesPerSet;
  }

  calculate({ sets }, bodyWeightKg) {
    const minutes = sets * this.minutesPerSet;
    return Math.round(this.met * bodyWeightKg * (minutes / 60));
  }
}

const strategies = {
  cardio: new CardioBurnStrategy(),
  strength: new StrengthBurnStrategy(),
};

export function getBurnStrategy(type) {
  const strategy = strategies[type];
  if (!strategy) throw new Error(`알 수 없는 운동 종류입니다: ${type}`);
  return strategy;
}
