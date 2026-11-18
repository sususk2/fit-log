// [패턴] Factory — 화면 입력(문자열)을 받아 종류에 맞는 운동 기록 객체를 만든다.
// 변경 전: addWorkout 안에서 종류별로 검사·변환·칼로리 계산·객체 구성을 모두 직접 처리
// 변경 후: createWorkout(input, options) 하나만 호출하면 검사된 기록이 나온다.
//          종류별 생성기는 칼로리 계산을 Strategy(burnStrategies)에 맡긴다.
import { getBurnStrategy } from './burnStrategies.js';
import { cleanText, isInt, isNum } from '../lib/validators.js';

export const WORKOUT_TYPE_LABEL = Object.freeze({ cardio: '유산소', strength: '근력' });
export const DEFAULT_BODY_WEIGHT = 70;

function checkName(name) {
  if (!name || name.length > 30) return '운동 이름은 1~30자로 입력해 주세요.';
  return null;
}

const creators = {
  cardio(input, name) {
    if (!isInt(input.durationMin, 1, 600)) return { error: '운동 시간은 1~600분 사이 정수로 입력해 주세요.' };
    const hasDistance = input.distanceKm !== '' && input.distanceKm !== undefined && input.distanceKm !== null;
    if (hasDistance && !isNum(input.distanceKm, 0, 200)) return { error: '거리는 0~200km 사이로 입력해 주세요.' };
    const record = { type: 'cardio', name, durationMin: Number(input.durationMin) };
    if (hasDistance) record.distanceKm = Number(input.distanceKm);
    return { record };
  },
  strength(input, name) {
    if (!isInt(input.sets, 1, 20)) return { error: '세트는 1~20 사이 정수로 입력해 주세요.' };
    if (!isInt(input.reps, 1, 100)) return { error: '횟수는 1~100 사이 정수로 입력해 주세요.' };
    if (!isNum(input.weightKg, 0, 500)) return { error: '무게는 0~500kg 사이로 입력해 주세요.' };
    return {
      record: {
        type: 'strength', name,
        sets: Number(input.sets), reps: Number(input.reps), weightKg: Number(input.weightKg),
      },
    };
  },
};

/**
 * @param input 화면 입력값 { type, name, durationMin, distanceKm, sets, reps, weightKg }
 * @param options { date: 'YYYY-MM-DD', bodyWeightKg: number }
 * @returns { record } 또는 { error }
 */
export function createWorkout(input, { date, bodyWeightKg } = {}) {
  const create = creators[input?.type];
  if (!create) return { error: '운동 종류를 선택해 주세요.' };
  const name = cleanText(input.name);
  const nameError = checkName(name);
  if (nameError) return { error: nameError };

  const result = create(input, name);
  if (result.error) return result;

  const weight = Number(bodyWeightKg) > 0 ? Number(bodyWeightKg) : DEFAULT_BODY_WEIGHT;
  const kcal = getBurnStrategy(result.record.type).calculate(result.record, weight);
  return { record: { ...result.record, kcal, date } };
}

export function describeWorkout(w) {
  if (w.type === 'cardio') {
    return `${w.durationMin}분${w.distanceKm != null ? ` · ${w.distanceKm}km` : ''}`;
  }
  return `${w.sets}세트 × ${w.reps}회 · ${w.weightKg}kg`;
}
