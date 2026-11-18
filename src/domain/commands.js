// [패턴] Command — "삭제"를 객체로 만들어 실행(execute)과 되돌리기(undo)를 함께 담는다.
// 변경 전: 삭제 버튼이 deleteDoc을 바로 호출 → 실수로 지우면 되돌릴 방법이 없었다.
// 변경 후: DeleteRecordCommand가 지우기 전 기록을 보관하고, CommandHistory가 최근 명령을 쌓아
//          "실행 취소" 버튼으로 마지막 삭제를 되돌린다. 저장소(Repository)만 알면 되므로
//          운동·식단·계획 어디에나 같은 명령을 쓴다.

export class DeleteRecordCommand {
  /**
   * @param repository remove(id) / restore(item) 를 가진 저장소
   * @param item 지울 기록 (id 포함)
   * @param label 화면 안내용 이름 (예: "점심 · 김밥 1줄")
   * @param undoable 되돌리기 허용 여부 (예: 보관한 계획은 서버 규칙상 되살릴 수 없음)
   */
  constructor(repository, item, label, { undoable = true } = {}) {
    this.repository = repository;
    this.item = { ...item };
    this.label = label;
    this.undoable = undoable;
  }

  async execute() {
    await this.repository.remove(this.item.id);
  }

  async undo() {
    if (!this.undoable) throw new Error('이 기록은 되돌릴 수 없습니다.');
    await this.repository.restore(this.item);
  }
}

export class CommandHistory {
  constructor({ limit = 10 } = {}) {
    this.limit = limit;
    this.stack = [];
  }

  async run(command) {
    await command.execute();
    if (command.undoable) {
      this.stack.push(command);
      if (this.stack.length > this.limit) this.stack.shift();
    }
    return command;
  }

  peek() {
    return this.stack[this.stack.length - 1] ?? null;
  }

  canUndo() {
    return this.stack.length > 0;
  }

  /** 마지막 명령을 되돌린다. 실패하면 다시 시도할 수 있도록 기록에 남겨 둔다. */
  async undo() {
    const command = this.stack.pop();
    if (!command) return null;
    try {
      await command.undo();
      return command;
    } catch (error) {
      this.stack.push(command);
      throw error;
    }
  }

  clear() {
    this.stack = [];
  }
}
