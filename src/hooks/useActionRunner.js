// 저장 요청 공통 처리: 연속 클릭 방지(pending ref) · 진행 중 표시 · 오류/완료 안내
// (7주차 실습 useTodos의 run() 방식을 훅으로 분리)
import { useCallback, useRef, useState } from 'react';
import { errorMessage } from '../errors.js';

export function useActionRunner() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);

  const run = useCallback(async (action, doneText = '') => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setMessage('');
    setNotice('');
    try {
      await action();
      if (doneText) setNotice(doneText);
      return true;
    } catch (error) {
      setMessage(errorMessage(error));
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, []);

  /** 화면에서 먼저 막은 입력 오류를 보여 주고 false를 돌려준다 */
  const fail = useCallback((text) => {
    setNotice('');
    setMessage(text);
    return false;
  }, []);

  const clear = useCallback(() => {
    setMessage('');
    setNotice('');
  }, []);

  return { busy, message, notice, run, fail, clear };
}
