import { describe, it, expect } from 'vitest';
import { MealHandler, buildMealValidator, validateMeal } from './mealValidation.js';
import { mealDocId, sortMeals } from './meals.js';

const date = '2026-11-13';
const ok = { mealType: 'lunch', food: ' 김밥 1줄 ', kcal: '485', proteinG: '13' };

describe('Chain of Responsibility: 식단 입력 검사', () => {
  it('모든 처리자를 통과하면 저장할 기록을 만든다', () => {
    expect(validateMeal(ok, { date })).toEqual({
      record: { date, mealType: 'lunch', food: '김밥 1줄', kcal: 485, proteinG: 13 },
    });
  });
  it('앞 단계에서 걸리면 뒤 단계는 검사하지 않고 그 오류를 돌려준다', () => {
    // 음식 이름과 칼로리가 둘 다 틀려도 앞의 음식 이름 오류만 나온다
    expect(validateMeal({ ...ok, food: '', kcal: '-1' }, { date }).error).toBe('음식 이름을 입력해 주세요.');
  });
  it('단계별 오류', () => {
    expect(validateMeal({ ...ok, mealType: 'brunch' }, { date }).error).toMatch('끼니');
    expect(validateMeal({ ...ok, food: '가'.repeat(41) }, { date }).error).toMatch('40자');
    expect(validateMeal({ ...ok, kcal: '12.5' }, { date }).error).toMatch('칼로리');
    expect(validateMeal({ ...ok, proteinG: '301' }, { date }).error).toMatch('단백질');
  });
  it('같은 날 같은 끼니(아침·점심·저녁)는 다시 추가할 수 없다', () => {
    const existingMeals = [{ id: `${date}_lunch`, mealType: 'lunch' }];
    expect(validateMeal(ok, { date, existingMeals }).error).toMatch('하루에 하나만');
  });
  it('간식은 여러 개 추가할 수 있다', () => {
    const existingMeals = [{ id: 'auto1', mealType: 'snack' }];
    expect(validateMeal({ ...ok, mealType: 'snack' }, { date, existingMeals }).record).toBeTruthy();
  });
  it('수정할 때는 중복 처리자가 사슬에 없다', () => {
    const existingMeals = [{ id: `${date}_lunch`, mealType: 'lunch' }];
    expect(validateMeal(ok, { date, existingMeals, forCreate: false }).record).toBeTruthy();
  });
  it('처리자를 직접 이어 붙여 사슬을 바꿀 수 있다', () => {
    class NoRamenHandler extends MealHandler {
      handle(meal, ctx) { return meal.food.includes('라면') ? '라면 금지' : super.handle(meal, ctx); }
    }
    const chain = buildMealValidator({ forCreate: false });
    let tail = chain;
    while (tail.next) tail = tail.next;
    tail.setNext(new NoRamenHandler());
    expect(chain.handle({ ...ok, food: '라면 1봉지' }, { date })).toBe('라면 금지');
  });
});

describe('식단 문서 ID와 정렬', () => {
  it('아침·점심·저녁은 고정 ID, 간식은 자동 ID', () => {
    expect(mealDocId(date, 'breakfast')).toBe('2026-11-13_breakfast');
    expect(mealDocId(date, 'snack')).toBeNull();
  });
  it('끼니 순서 → 생성 시각 순으로 정렬한다', () => {
    const list = [
      { id: 's2', mealType: 'snack', createdAtMs: 2 },
      { id: 'd', mealType: 'dinner', createdAtMs: 1 },
      { id: 's1', mealType: 'snack', createdAtMs: 1 },
      { id: 'b', mealType: 'breakfast', createdAtMs: 9 },
    ];
    expect(sortMeals(list).map((m) => m.id)).toEqual(['b', 'd', 's1', 's2']);
  });
});
