// 프로필·목표 입력 검사
import { GOAL_TYPES } from './goalStrategies.js';
import { cleanText, isInt, isNum } from '../lib/validators.js';

export const EMPTY_PROFILE_FORM = Object.freeze({
  nickname: '', weightKg: '', goalType: 'maintain', calorieGoal: '', proteinGoal: '',
});

export function profileToForm(profile) {
  return {
    nickname: profile?.nickname ?? '',
    weightKg: profile?.weightKg ?? '',
    goalType: profile?.goalType ?? 'maintain',
    calorieGoal: profile?.calorieGoal ?? '',
    proteinGoal: profile?.proteinGoal ?? '',
  };
}

export function isProfileComplete(profile) {
  return Boolean(profile && profile.weightKg && profile.goalType && profile.calorieGoal);
}

/** @returns { error } 또는 { data } */
export function validateProfile(form) {
  const nickname = cleanText(form.nickname);
  if (!nickname || nickname.length > 20) return { error: '닉네임은 1~20자로 입력해 주세요.' };
  if (!isNum(form.weightKg, 30, 250)) return { error: '체중은 30~250kg 사이로 입력해 주세요.' };
  if (!GOAL_TYPES.includes(form.goalType)) return { error: '목표를 선택해 주세요.' };
  if (!isInt(form.calorieGoal, 1000, 5000)) return { error: '목표 칼로리는 1000~5000 사이 정수로 입력해 주세요.' };
  if (!isInt(form.proteinGoal, 10, 400)) return { error: '목표 단백질은 10~400g 사이 정수로 입력해 주세요.' };
  return {
    data: {
      nickname,
      weightKg: Number(form.weightKg),
      goalType: form.goalType,
      calorieGoal: Number(form.calorieGoal),
      proteinGoal: Number(form.proteinGoal),
    },
  };
}
