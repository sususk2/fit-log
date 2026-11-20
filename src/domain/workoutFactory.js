// [패턴] Factory Method — 운동 종류마다 "기록을 만드는 방법"을 제작자(Creator) 하위 클래스에 맡긴다.
// 변경 전: HomePage.addWorkout 안에서 if (type === 'cardio') … else … 로 검사·변환·칼로리 계산·객체 구성을 직접 처리
// 변경 후:
//   - Product        : Workout (CardioWorkout · StrengthWorkout) — 자기 설명(describe)과 저장 형태(toRecord)를 안다
//   - Creator        : WorkoutCreator.create() — 이름 검사 → createWorkout() 호출 → 칼로리 계산 순서를 정한다
//   - ConcreteCreator: CardioWorkoutCreator · StrengthWorkoutCreator — createWorkout()(팩토리 메서드)에서 종류별 검사와 제품 생성
//   화면은 createWorkout(input)만 호출하고, 새 종류(예: 스트레칭)는 제품·제작자 클래스만 추가하면 된다.
//   칼로리 계산은 제품이 Strategy(burnStrategies)에 맡긴다.
import { getBurnStrategy } from './burnStrategies.js';
import { cleanText, isInt, isNum } from '../lib/validators.js';

export const WORKOUT_TYPE_LABEL = Object.freeze({ cardio: '유산소', strength: '근력' });
export const DEFAULT_BODY_WEIGHT = 70;

function isBlank(value) {
  return value === '' || value === undefined || value === null;
}

// ── Product ──
export class Workout {
  constructor({ type, name, date, kcal = 0 }) {
    this.type = type;
    this.name = name;
    this.date = date;
    this.kcal = kcal;
  }

  /** 소모 칼로리 계산은 운동 종류에 맞는 Strategy에 맡긴다 */
  burnKcal(bodyWeightKg) {
    return getBurnStrategy(this.type).calculate(this, bodyWeightKg);
  }

  describe() {
    throw new Error('운동 종류별 클래스에서 구현해야 합니다.');
  }

  toRecord() {
    throw new Error('운동 종류별 클래스에서 구현해야 합니다.');
  }
}

export class CardioWorkout extends Workout {
  constructor({ name, date, kcal, durationMin, distanceKm = null }) {
    super({ type: 'cardio', name, date, kcal });
    this.durationMin = durationMin;
    this.distanceKm = distanceKm ?? null;
  }

  describe() {
    return `${this.durationMin}분${this.distanceKm !== null ? ` · ${this.distanceKm}km` : ''}`;
  }

  toRecord() {
    const record = { type: this.type, name: this.name, durationMin: this.durationMin };
    if (this.distanceKm !== null) record.distanceKm = this.distanceKm;
    return { ...record, kcal: this.kcal, date: this.date };
  }
}

export class StrengthWorkout extends Workout {
  constructor({ name, date, kcal, sets, reps, weightKg }) {
    super({ type: 'strength', name, date, kcal });
    this.sets = sets;
    this.reps = reps;
    this.weightKg = weightKg;
  }

  describe() {
    return `${this.sets}세트 × ${this.reps}회 · ${this.weightKg}kg`;
  }

  toRecord() {
    return {
      type: this.type, name: this.name,
      sets: this.sets, reps: this.reps, weightKg: this.weightKg,
      kcal: this.kcal, date: this.date,
    };
  }
}

// ── Creator ──
export class WorkoutCreator {
  /**
   * 기록 생성 순서(공통): 이름 검사 → 팩토리 메서드로 제품 생성 → 칼로리 계산
   * @returns { workout, record } 또는 { error }
   */
  create(input, { date, bodyWeightKg } = {}) {
    const name = cleanText(input.name);
    if (!name || name.length > 30) return { error: '운동 이름은 1~30자로 입력해 주세요.' };

    const result = this.createWorkout(input, { name, date });
    if (result.error) return result;

    const weight = Number(bodyWeightKg) > 0 ? Number(bodyWeightKg) : DEFAULT_BODY_WEIGHT;
    const { workout } = result;
    workout.kcal = workout.burnKcal(weight);
    return { workout, record: workout.toRecord() };
  }

  /** 팩토리 메서드: 하위 클래스가 종류별 검사와 제품 생성을 맡는다 */
  createWorkout() {
    throw new Error('운동 종류별 제작자에서 구현해야 합니다.');
  }
}

export class CardioWorkoutCreator extends WorkoutCreator {
  createWorkout(input, { name, date }) {
    if (!isInt(input.durationMin, 1, 600)) return { error: '운동 시간은 1~600분 사이 정수로 입력해 주세요.' };
    const hasDistance = !isBlank(input.distanceKm);
    if (hasDistance && !isNum(input.distanceKm, 0, 200)) return { error: '거리는 0~200km 사이로 입력해 주세요.' };
    return {
      workout: new CardioWorkout({
        name, date,
        durationMin: Number(input.durationMin),
        distanceKm: hasDistance ? Number(input.distanceKm) : null,
      }),
    };
  }
}

export class StrengthWorkoutCreator extends WorkoutCreator {
  createWorkout(input, { name, date }) {
    if (!isInt(input.sets, 1, 20)) return { error: '세트는 1~20 사이 정수로 입력해 주세요.' };
    if (!isInt(input.reps, 1, 100)) return { error: '횟수는 1~100 사이 정수로 입력해 주세요.' };
    if (!isNum(input.weightKg, 0, 500)) return { error: '무게는 0~500kg 사이로 입력해 주세요.' };
    return {
      workout: new StrengthWorkout({
        name, date,
        sets: Number(input.sets), reps: Number(input.reps), weightKg: Number(input.weightKg),
      }),
    };
  }
}

const CREATORS = Object.freeze({
  cardio: new CardioWorkoutCreator(),
  strength: new StrengthWorkoutCreator(),
});

export function creatorFor(type) {
  return CREATORS[type] ?? null;
}

/**
 * 화면에서 쓰는 진입점 (추가·수정 모두 사용)
 * @param input 화면 입력값 { type, name, durationMin, distanceKm, sets, reps, weightKg }
 * @param options { date: 'YYYY-MM-DD', bodyWeightKg: number }
 * @returns { workout, record } 또는 { error }
 */
export function createWorkout(input, options = {}) {
  const creator = creatorFor(input?.type);
  if (!creator) return { error: '운동 종류를 선택해 주세요.' };
  return creator.create(input, options);
}

/** 저장된 기록(일반 객체) → 제품 객체 (목록 표시용) */
export function workoutFromRecord(record) {
  return record.type === 'cardio' ? new CardioWorkout(record) : new StrengthWorkout(record);
}

export function describeWorkout(record) {
  return workoutFromRecord(record).describe();
}
