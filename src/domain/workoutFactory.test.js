import { describe, it, expect } from 'vitest';
import { createWorkout, describeWorkout } from './workoutFactory.js';

const date = '2026-11-13';

describe('Factory: 운동 기록 생성', () => {
  it('유산소 입력으로 칼로리가 계산된 기록을 만든다', () => {
    const { record, error } = createWorkout(
      { type: 'cardio', name: '걷기', durationMin: '60', distanceKm: '4.5' }, { date, bodyWeightKg: 60 });
    expect(error).toBeUndefined();
    expect(record).toEqual({ type: 'cardio', name: '걷기', durationMin: 60, distanceKm: 4.5, kcal: 210, date });
  });
  it('거리를 비우면 distanceKm 필드를 넣지 않는다', () => {
    const { record } = createWorkout({ type: 'cardio', name: '수영', durationMin: '30', distanceKm: '' }, { date, bodyWeightKg: 60 });
    expect('distanceKm' in record).toBe(false);
  });
  it('근력 입력으로 세트·횟수·무게 기록을 만든다', () => {
    const { record } = createWorkout(
      { type: 'strength', name: ' 스쿼트 ', sets: '5', reps: '10', weightKg: '60' }, { date, bodyWeightKg: 60 });
    expect(record).toEqual({ type: 'strength', name: '스쿼트', sets: 5, reps: 10, weightKg: 60, kcal: 50, date });
  });
  it('체중이 없으면 기본 70kg으로 계산한다', () => {
    const { record } = createWorkout({ type: 'strength', name: '푸시업', sets: '3', reps: '20', weightKg: '0' }, { date });
    expect(record.kcal).toBe(35);
  });
  it('잘못된 입력은 오류 문장을 돌려준다', () => {
    expect(createWorkout({ type: 'cardio', name: '걷기', durationMin: '0' }, { date }).error).toMatch('운동 시간');
    expect(createWorkout({ type: 'cardio', name: '걷기', durationMin: '10', distanceKm: '-1' }, { date }).error).toMatch('거리');
    expect(createWorkout({ type: 'strength', name: '', sets: '3' }, { date }).error).toMatch('운동 이름');
    expect(createWorkout({ type: 'strength', name: '벤치', sets: '3', reps: '1.5', weightKg: '40' }, { date }).error).toMatch('횟수');
    expect(createWorkout({ type: 'yoga', name: '요가' }, { date }).error).toMatch('종류');
  });
  it('기록 설명 문장을 만든다', () => {
    expect(describeWorkout({ type: 'cardio', durationMin: 30, distanceKm: 5 })).toBe('30분 · 5km');
    expect(describeWorkout({ type: 'strength', sets: 3, reps: 10, weightKg: 40 })).toBe('3세트 × 10회 · 40kg');
  });
});
