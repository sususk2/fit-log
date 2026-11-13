import { describe, it, expect } from 'vitest';
import { MemoryProfileRepository, MemoryRecordRepository } from './memoryRepository.js';
import { CommandHistory, DeleteRecordCommand } from '../domain/commands.js';

describe('Repository + Observer: 메모리 저장소', () => {
  it('날짜별 구독자에게 변경을 알린다', async () => {
    const repo = new MemoryRecordRepository();
    const seen = [];
    const stop = repo.watchByDate('2026-11-13', (items) => seen.push(items.length));
    await repo.add({ date: '2026-11-13', title: 'A' });
    await repo.add({ date: '2026-11-12', title: '다른 날' });
    stop();
    await repo.add({ date: '2026-11-13', title: '해제 후' });
    expect(seen).toEqual([0, 1, 1]); // 처음 0개 → 추가 1개 → 다른 날 추가(그대로 1개), 해제 후에는 알림 없음
  });
  it('고정 ID 문서는 두 번 만들 수 없다 (Rules와 같은 동작)', async () => {
    const repo = new MemoryRecordRepository();
    await repo.put('2026-11-13_lunch', { date: '2026-11-13', mealType: 'lunch' });
    await expect(repo.put('2026-11-13_lunch', { date: '2026-11-13' })).rejects.toThrow('permission-denied');
  });
  it('저장 실패를 흉내 낼 수 있다', async () => {
    const repo = new MemoryRecordRepository();
    repo.failNext('unavailable');
    await expect(repo.add({ date: 'x' })).rejects.toThrow('unavailable');
    await expect(repo.add({ date: 'x' })).resolves.toBe('mem-1');
  });
  it('최근 날짜 목록을 알린다', async () => {
    const repo = new MemoryRecordRepository();
    let dates = [];
    repo.watchRecentDates((d) => { dates = d; });
    await repo.add({ date: '2026-11-11' });
    await repo.add({ date: '2026-11-13' });
    expect(dates).toEqual(['2026-11-13', '2026-11-11']);
  });
  it('프로필 저장소는 저장한 필드를 합쳐 알린다', async () => {
    const repo = new MemoryProfileRepository({ nickname: '민준' });
    let profile = null;
    repo.watch((p) => { profile = p; });
    await repo.save({ weightKg: 70 });
    expect(profile).toEqual({ nickname: '민준', weightKg: 70 });
  });
});

describe('Command: 삭제와 실행 취소', () => {
  it('삭제한 기록을 같은 ID로 되살린다', async () => {
    const repo = new MemoryRecordRepository();
    const id = await repo.put('2026-11-13_dinner', { date: '2026-11-13', mealType: 'dinner', food: '샐러드' });
    const history = new CommandHistory();
    const item = repo.list()[0];

    await history.run(new DeleteRecordCommand(repo, item, '저녁'));
    expect(repo.list()).toHaveLength(0);
    expect(history.canUndo()).toBe(true);

    const undone = await history.undo();
    expect(undone.label).toBe('저녁');
    expect(repo.list().map((m) => [m.id, m.food])).toEqual([[id, '샐러드']]);
    expect(history.canUndo()).toBe(false);
  });
  it('되돌릴 수 없는 명령은 기록에 쌓지 않는다', async () => {
    const repo = new MemoryRecordRepository();
    await repo.add({ date: 'x', status: 'archived' });
    const history = new CommandHistory();
    await history.run(new DeleteRecordCommand(repo, repo.list()[0], '보관 계획', { undoable: false }));
    expect(history.canUndo()).toBe(false);
    expect(await history.undo()).toBeNull();
  });
  it('되돌리기에 실패하면 명령을 다시 남겨 재시도할 수 있다', async () => {
    const repo = new MemoryRecordRepository();
    await repo.add({ date: 'x' });
    const history = new CommandHistory();
    await history.run(new DeleteRecordCommand(repo, repo.list()[0], 'A'));
    repo.failNext('unavailable');
    await expect(history.undo()).rejects.toThrow('unavailable');
    expect(history.canUndo()).toBe(true);
    await history.undo();
    expect(repo.list()).toHaveLength(1);
  });
  it('최근 명령 개수를 제한한다', async () => {
    const repo = new MemoryRecordRepository();
    const history = new CommandHistory({ limit: 2 });
    for (const title of ['A', 'B', 'C']) {
      await repo.add({ date: 'x', title });
      const item = repo.list().find((i) => i.title === title);
      await history.run(new DeleteRecordCommand(repo, item, title));
    }
    expect(history.stack.map((c) => c.label)).toEqual(['B', 'C']);
  });
});
