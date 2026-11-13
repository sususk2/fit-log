// [패턴] Chain of Responsibility — 식단 입력을 검사 단계(처리자)들이 차례로 넘겨 가며 확인한다.
// 변경 전: checkMeal() 하나에 if 문 4개 + addMeal 안에 중복 끼니 검사가 따로 섞여 있었다.
// 변경 후: 처리자마다 한 가지 규칙만 맡고, 문제가 있으면 그 자리에서 오류를 돌려주며 멈춘다.
//          새로 추가(create)할 때만 "끼니 중복" 처리자를 사슬 끝에 붙인다.
import { MEAL_LABEL, MEAL_TYPES, mealDocId } from './meals.js';
import { cleanText, isInt, isNum } from '../lib/validators.js';

export class MealHandler {
  setNext(handler) {
    this.next = handler;
    return handler; // a.setNext(b).setNext(c) 형태로 잇기 위해 다음 처리자를 돌려준다
  }

  /** @returns 오류 문장 또는 null(통과) */
  handle(meal, context) {
    return this.next ? this.next.handle(meal, context) : null;
  }
}

export class MealTypeHandler extends MealHandler {
  handle(meal, context) {
    if (!MEAL_TYPES.includes(meal.mealType)) return '끼니를 선택해 주세요.';
    return super.handle(meal, context);
  }
}

export class FoodNameHandler extends MealHandler {
  handle(meal, context) {
    const food = cleanText(meal.food);
    if (!food) return '음식 이름을 입력해 주세요.';
    if (food.length > 40) return '음식 이름은 40자 이하로 입력해 주세요.';
    return super.handle(meal, context);
  }
}

export class KcalRangeHandler extends MealHandler {
  handle(meal, context) {
    if (!isInt(meal.kcal, 0, 5000)) return '칼로리는 0~5000 사이 정수로 입력해 주세요.';
    return super.handle(meal, context);
  }
}

export class ProteinRangeHandler extends MealHandler {
  handle(meal, context) {
    if (!isNum(meal.proteinG, 0, 300)) return '단백질은 0~300g 사이로 입력해 주세요.';
    return super.handle(meal, context);
  }
}

// 서비스 규칙: 아침·점심·저녁은 하루에 하나. (서버에서는 고정 문서 ID + Rules로 한 번 더 막는다)
export class DuplicateMealHandler extends MealHandler {
  handle(meal, context) {
    const id = mealDocId(context.date, meal.mealType);
    if (id && (context.existingMeals ?? []).some((m) => m.id === id)) {
      return `${MEAL_LABEL[meal.mealType]}은(는) 하루에 하나만 기록할 수 있습니다. 기존 기록을 수정해 주세요.`;
    }
    return super.handle(meal, context);
  }
}

export function buildMealValidator({ forCreate = true } = {}) {
  const head = new MealTypeHandler();
  const tail = head.setNext(new FoodNameHandler())
    .setNext(new KcalRangeHandler())
    .setNext(new ProteinRangeHandler());
  if (forCreate) tail.setNext(new DuplicateMealHandler());
  return head;
}

const createValidator = buildMealValidator({ forCreate: true });
const editValidator = buildMealValidator({ forCreate: false });

/**
 * @param meal { mealType, food, kcal, proteinG } (화면 입력 문자열 가능)
 * @param context { date, existingMeals, forCreate }
 * @returns { error } 또는 { record }
 */
export function validateMeal(meal, { date, existingMeals = [], forCreate = true } = {}) {
  const validator = forCreate ? createValidator : editValidator;
  const error = validator.handle(meal, { date, existingMeals });
  if (error) return { error };
  return {
    record: {
      date,
      mealType: meal.mealType,
      food: cleanText(meal.food),
      kcal: Number(meal.kcal),
      proteinG: Number(meal.proteinG),
    },
  };
}
