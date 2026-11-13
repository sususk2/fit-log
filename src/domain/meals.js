// 식단 관련 상수와 문서 ID 규칙
export const MEAL_LABEL = Object.freeze({ breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식' });
export const MEAL_TYPES = Object.freeze(['breakfast', 'lunch', 'dinner', 'snack']);
export const SINGLE_MEAL_TYPES = Object.freeze(['breakfast', 'lunch', 'dinner']);

// 자주 먹는 음식 프리셋 (음식 검색 API 대신 사용, 값은 일반적인 1회 제공량 기준 근사치)
export const FOOD_PRESETS = Object.freeze([
  { food: '공기밥 1공기', kcal: 300, proteinG: 6 },
  { food: '닭가슴살 100g', kcal: 109, proteinG: 23 },
  { food: '삶은 달걀 1개', kcal: 77, proteinG: 6 },
  { food: '바나나 1개', kcal: 93, proteinG: 1 },
  { food: '고구마 150g', kcal: 192, proteinG: 2 },
  { food: '김밥 1줄', kcal: 485, proteinG: 13 },
  { food: '라면 1봉지', kcal: 500, proteinG: 10 },
  { food: '샐러드 1접시', kcal: 150, proteinG: 4 },
  { food: '우유 200ml', kcal: 130, proteinG: 6 },
  { food: '프로틴 쉐이크 1회', kcal: 120, proteinG: 24 },
]);

/** 아침·점심·저녁은 "날짜_끼니"로 ID를 고정해 하루 하나만 저장되게 한다. 간식은 null(자동 ID). */
export function mealDocId(date, mealType) {
  return SINGLE_MEAL_TYPES.includes(mealType) ? `${date}_${mealType}` : null;
}

export function sortMeals(meals) {
  return [...meals].sort((a, b) =>
    MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType)
    || (a.createdAtMs ?? Infinity) - (b.createdAtMs ?? Infinity));
}
